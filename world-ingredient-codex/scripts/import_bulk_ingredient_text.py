#!/usr/bin/env python3

import argparse
import json
import re
from pathlib import Path


ROOT = Path("/root/world-ingredient-codex")
INGREDIENTS_DIR = ROOT / "ingredients"
HIERARCHY_PATH = ROOT / "hierarchy.json"
BUILD_UNIT_HEADER_RE = re.compile(r"^(?P<id>\d+\.\d+\.\d+\.\d+)(?:\s+(?P<name>.+))?$")
CATEGORY_HEADER_RE = re.compile(r"^(?P<id>\d+\.\d+\.\d+\.\d+\.\d+)(?:\s+(?P<name>.+))?$")
EMBEDDED_HEADING_RE = re.compile(r"\d+\.\d+\.\d+\.\d+(?:\.\d+)?\s")


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


def strip_bullet_prefix(line: str) -> str:
    line = line.strip()
    for prefix in ("- ", "* ", "• "):
        if line.startswith(prefix):
            return line[len(prefix):].strip()
    return line


def parse_input(
    text: str,
    build_units: dict[str, str],
    categories: dict[str, tuple[str, str]],
) -> dict[str, dict[str, list[str]]]:
    parsed: dict[str, dict[str, list[str]]] = {}
    current_build_unit_id: str | None = None
    current_category_id: str | None = None

    for line_number, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        category_match = CATEGORY_HEADER_RE.match(line)
        if category_match:
            category_id = category_match.group("id")
            supplied_name = category_match.group("name")
            if category_id not in categories:
                raise SystemExit(f"Line {line_number}: unknown category {category_id}")
            expected_build_unit_id, expected_name = categories[category_id]
            if current_build_unit_id is None:
                raise SystemExit(f"Line {line_number}: category {category_id} appears before a build unit header")
            if expected_build_unit_id != current_build_unit_id:
                raise SystemExit(
                    f"Line {line_number}: category {category_id} belongs to {expected_build_unit_id}, "
                    f"not {current_build_unit_id}"
                )
            if supplied_name and supplied_name != expected_name:
                raise SystemExit(
                    f"Line {line_number}: category {category_id} name mismatch "
                    f"({supplied_name!r} != {expected_name!r})"
                )
            parsed.setdefault(current_build_unit_id, {}).setdefault(category_id, [])
            current_category_id = category_id
            continue

        build_unit_match = BUILD_UNIT_HEADER_RE.match(line)
        if build_unit_match:
            build_unit_id = build_unit_match.group("id")
            supplied_name = build_unit_match.group("name")
            if build_unit_id not in build_units:
                raise SystemExit(f"Line {line_number}: unknown build unit {build_unit_id}")
            expected_name = build_units[build_unit_id]
            if supplied_name and supplied_name != expected_name:
                raise SystemExit(
                    f"Line {line_number}: build unit {build_unit_id} name mismatch "
                    f"({supplied_name!r} != {expected_name!r})"
                )
            parsed.setdefault(build_unit_id, {})
            current_build_unit_id = build_unit_id
            current_category_id = None
            continue

        if current_category_id is None:
            raise SystemExit(f"Line {line_number}: ingredient entry appears before a category header")

        ingredient_name = strip_bullet_prefix(line)
        if not ingredient_name:
            continue
        if EMBEDDED_HEADING_RE.search(ingredient_name):
            raise SystemExit(
                f"Line {line_number}: ingredient name contains embedded codex heading text: {ingredient_name!r}"
            )

        parsed[current_build_unit_id][current_category_id].append(ingredient_name)

    return parsed


def build_payload(build_unit_id: str, build_unit_name: str, category_entries: dict[str, list[str]]) -> dict:
    entries: list[dict] = []

    for category_id in sorted(category_entries.keys(), key=lambda value: int(value.split(".")[-1])):
        for sort_order, ingredient_name in enumerate(category_entries[category_id], start=1):
            entries.append(
                {
                    "id": f"{category_id}.{sort_order}",
                    "parentCategoryId": category_id,
                    "name": ingredient_name,
                    "sortOrder": sort_order,
                    "aliases": [],
                    "tags": [],
                    "importanceTags": [],
                    "notes": None,
                }
            )

    return {
        "buildUnitId": build_unit_id,
        "buildUnitName": build_unit_name,
        "entries": entries,
    }


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert bulk ingredient text blocks into canonical Ingredients Codex JSON files."
    )
    parser.add_argument("input_path", type=Path, help="Path to the text file containing build unit/category blocks")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write the touched build unit JSON files. Without this flag, the script performs a dry run.",
    )
    args = parser.parse_args()

    build_units, categories = load_hierarchy()
    parsed = parse_input(args.input_path.read_text(encoding="utf-8"), build_units, categories)

    if not parsed:
        raise SystemExit("No build units found in input")

    summaries: list[tuple[str, int, int]] = []
    for build_unit_id in sorted(parsed):
        payload = build_payload(build_unit_id, build_units[build_unit_id], parsed[build_unit_id])
        category_count = len(parsed[build_unit_id])
        entry_count = len(payload["entries"])
        summaries.append((build_unit_id, category_count, entry_count))
        if args.write:
            write_json(INGREDIENTS_DIR / f"{build_unit_id}.json", payload)

    print(f"touched_build_units={len(summaries)}")
    for build_unit_id, category_count, entry_count in summaries:
        action = "wrote" if args.write else "would_write"
        print(
            f"{action} {build_unit_id}.json "
            f"categories={category_count} entries={entry_count}"
        )


if __name__ == "__main__":
    main()
