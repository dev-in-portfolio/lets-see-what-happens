#!/usr/bin/env python3

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from ingredient_file_paths import find_ingredient_json_files


ROOT = Path(__file__).resolve().parents[1]
INGREDIENTS_DIR = ROOT / "ingredients"
HIERARCHY_PATH = ROOT / "hierarchy.json"
EMBEDDED_HEADING_RE = re.compile(r"\d+\.\d+\.\d+\.\d+(?:\.\d+)?\s")
BUILD_UNIT_ID_RE = re.compile(r"^\d+\.\d+\.\d+\.\d+$")
CATEGORY_ID_RE = re.compile(r"^\d+\.\d+\.\d+\.\d+\.\d+$")
FIRST_PLACEHOLDER_BUILD_UNIT = "1.2.7.1"
REQUIRED_ENTRY_KEYS = {
    "id",
    "parentCategoryId",
    "name",
    "sortOrder",
    "aliases",
    "tags",
    "importanceTags",
    "notes",
}


def parse_codex_id(value: str) -> tuple[int, ...]:
    return tuple(int(part) for part in value.split("."))


def load_hierarchy() -> tuple[dict[str, str], dict[str, tuple[str, str]]]:
    data = json.loads(HIERARCHY_PATH.read_text(encoding="utf-8"))
    build_units = {
        node["id"]: node["name"]
        for node in data["nodes"]
        if node["level"] == "D"
    }
    categories = {
        node["id"]: (node["parentId"], node["name"])
        for node in data["nodes"]
        if node["level"] == "E"
    }
    return build_units, categories


def infer_build_unit_id(category_id: str) -> str | None:
    if not isinstance(category_id, str) or not CATEGORY_ID_RE.match(category_id):
        return None
    return ".".join(category_id.split(".")[:-1])


def validate_file(
    path: Path,
    expected_build_units: dict[str, str],
    expected_categories: dict[str, tuple[str, str]],
    loose: bool,
) -> list[str]:
    issues: list[str] = []

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"{path.name}: invalid JSON ({exc})"]

    build_unit_id = path.stem
    expected_name = expected_build_units.get(build_unit_id)
    if expected_name is None and not loose:
        issues.append(f"{path.name}: unexpected build unit file")
        return issues

    if payload.get("buildUnitId") != build_unit_id:
        issues.append(f"{path.name}: buildUnitId mismatch ({payload.get('buildUnitId')!r})")

    if expected_name is not None and payload.get("buildUnitName") != expected_name:
        issues.append(f"{path.name}: buildUnitName mismatch ({payload.get('buildUnitName')!r})")
    elif loose and (not isinstance(payload.get("buildUnitName"), str) or not payload.get("buildUnitName").strip()):
        issues.append(f"{path.name}: buildUnitName must be a non-empty string")

    entries = payload.get("entries")
    if not isinstance(entries, list):
        issues.append(f"{path.name}: entries must be a list")
        return issues

    if (
        not loose
        and parse_codex_id(build_unit_id) < parse_codex_id(FIRST_PLACEHOLDER_BUILD_UNIT)
        and not entries
    ):
        issues.append(
            f"{path.name}: empty entries are not allowed before {FIRST_PLACEHOLDER_BUILD_UNIT}"
        )

    seen_ids: set[str] = set()
    category_sort_orders: dict[str, list[int]] = defaultdict(list)

    for index, entry in enumerate(entries, start=1):
        label = f"{path.name} entry #{index}"

        if not isinstance(entry, dict):
            issues.append(f"{label}: entry is not an object")
            continue

        missing_keys = sorted(REQUIRED_ENTRY_KEYS - entry.keys())
        if missing_keys:
            issues.append(f"{label}: missing keys {missing_keys}")
            continue

        entry_id = entry["id"]
        parent_category_id = entry["parentCategoryId"]
        name = entry["name"]
        sort_order = entry["sortOrder"]

        if not isinstance(entry_id, str) or not entry_id:
            issues.append(f"{label}: id must be a non-empty string")
            continue

        if entry_id in seen_ids:
            issues.append(f"{label}: duplicate id {entry_id}")
        seen_ids.add(entry_id)

        if not isinstance(parent_category_id, str):
            issues.append(f"{label}: parentCategoryId must be a string")
            continue

        if loose:
            if not CATEGORY_ID_RE.match(parent_category_id):
                issues.append(f"{label}: invalid parentCategoryId format {parent_category_id!r}")
                continue
            category_build_unit_id = infer_build_unit_id(parent_category_id)
            if category_build_unit_id != build_unit_id:
                issues.append(f"{label}: category {parent_category_id} belongs to {category_build_unit_id}")
        else:
            if parent_category_id not in expected_categories:
                issues.append(f"{label}: unknown parentCategoryId {parent_category_id!r}")
                continue
            category_build_unit_id, _ = expected_categories[parent_category_id]
            if category_build_unit_id != build_unit_id:
                issues.append(f"{label}: category {parent_category_id} belongs to {category_build_unit_id}")

        if not isinstance(name, str) or not name.strip():
            issues.append(f"{label}: name must be a non-empty string")
        elif EMBEDDED_HEADING_RE.search(name):
            issues.append(f"{label}: suspicious embedded codex heading in name {name!r}")

        if not isinstance(sort_order, int) or sort_order < 1:
            issues.append(f"{label}: sortOrder must be a positive integer")
            continue

        expected_id = f"{parent_category_id}.{sort_order}"
        if entry_id != expected_id:
            issues.append(f"{label}: id should be {expected_id!r}, found {entry_id!r}")

        if not isinstance(entry["aliases"], list):
            issues.append(f"{label}: aliases must be a list")
        if not isinstance(entry["tags"], list):
            issues.append(f"{label}: tags must be a list")
        if not isinstance(entry["importanceTags"], list):
            issues.append(f"{label}: importanceTags must be a list")

        category_sort_orders[parent_category_id].append(sort_order)

    for parent_category_id, sort_orders in sorted(category_sort_orders.items()):
        expected_orders = list(range(1, len(sort_orders) + 1))
        if sort_orders != expected_orders:
            issues.append(
                f"{path.name}: sortOrder sequence for {parent_category_id} is {sort_orders}, expected {expected_orders}"
            )

    return issues


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate ingredients JSON files.")
    parser.add_argument(
        "--loose",
        action="store_true",
        help="Ignore hierarchy coverage checks and allow out-of-hierarchy build units/categories.",
    )
    args = parser.parse_args()

    expected_build_units, expected_categories = load_hierarchy()
    file_paths = find_ingredient_json_files(INGREDIENTS_DIR)
    issues: list[str] = []

    if not args.loose:
        actual_build_units = {path.stem for path in file_paths}
        missing_files = sorted(set(expected_build_units) - actual_build_units)
        extra_files = sorted(actual_build_units - set(expected_build_units))

        for build_unit_id in missing_files:
            issues.append(f"missing file: {build_unit_id}.json")
        for build_unit_id in extra_files:
            issues.append(f"unexpected file: {build_unit_id}.json")

    for path in file_paths:
        issues.extend(validate_file(path, expected_build_units, expected_categories, args.loose))

    if issues:
        print(f"validation_failed={len(issues)}")
        for issue in issues:
            print(issue)
        raise SystemExit(1)

    print(f"validated_files={len(file_paths)}")
    print("validation_failed=0")


if __name__ == "__main__":
    main()
