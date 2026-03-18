#!/usr/bin/env python3

import argparse
import json
import re
from collections import OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INGREDIENTS_DIR = ROOT / "ingredients"
BUILD_UNIT_HEADER_RE = re.compile(r"^(?P<id>\d+\.\d+\.\d+\.\d+)(?:\s+(?P<name>.+))?$")
CATEGORY_HEADER_RE = re.compile(r"^(?P<id>\d+\.\d+\.\d+\.\d+\.\d+)(?:\s+(?P<name>.+))?$")
ATTACHED_BUILD_UNIT_RE = re.compile(r"(?<=[A-Za-zʻʼ’'\)])(?=\d+\.\d+\.\d+\.\d+\s)")


def strip_bullet_prefix(line: str) -> str:
    stripped = line.strip()
    for prefix in ("- ", "* ", "• "):
        if stripped.startswith(prefix):
            return stripped[len(prefix):].strip()
    return stripped


def preprocess_text(text: str) -> list[str]:
    text = ATTACHED_BUILD_UNIT_RE.sub("\n", text)
    text = re.sub(r"\s{2,}(?=\d+\.\d+\.\d+\.\d+(?:\.\d+)?\s)", "\n", text)
    lines: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if "  Using " in line:
            line = line.split("  Using ", 1)[0].strip()
        if not line or line.startswith("#") or line.startswith("Using "):
            continue
        lines.append(line)
    return lines


def parse_input(text: str) -> dict[str, dict]:
    parsed: dict[str, dict] = OrderedDict()
    current_build_unit_id: str | None = None
    current_category_id: str | None = None
    seen_per_category: dict[tuple[str, str], set[str]] = {}

    for line in preprocess_text(text):
        category_match = CATEGORY_HEADER_RE.match(line)
        if category_match:
            category_id = category_match.group("id")
            if current_build_unit_id is None:
                continue
            if not category_id.startswith(f"{current_build_unit_id}."):
                continue
            parsed[current_build_unit_id]["categories"].setdefault(category_id, [])
            current_category_id = category_id
            continue

        build_unit_match = BUILD_UNIT_HEADER_RE.match(line)
        if build_unit_match:
            build_unit_id = build_unit_match.group("id")
            build_unit_name = (build_unit_match.group("name") or build_unit_id).strip()
            if build_unit_id not in parsed:
                parsed[build_unit_id] = {
                    "name": build_unit_name,
                    "categories": OrderedDict(),
                }
            else:
                parsed[build_unit_id]["name"] = build_unit_name
            current_build_unit_id = build_unit_id
            current_category_id = None
            continue

        if current_build_unit_id is None or current_category_id is None:
            continue

        ingredient_name = strip_bullet_prefix(line)
        if not ingredient_name:
            continue

        key = (current_build_unit_id, current_category_id)
        seen_per_category.setdefault(key, set())
        if ingredient_name in seen_per_category[key]:
            continue
        seen_per_category[key].add(ingredient_name)
        parsed[current_build_unit_id]["categories"][current_category_id].append(ingredient_name)

    return parsed


def load_existing_build_unit_name(build_unit_id: str) -> str | None:
    path = INGREDIENTS_DIR / f"{build_unit_id}.json"
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    value = payload.get("buildUnitName")
    return value if isinstance(value, str) and value.strip() else None


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
        description="Import bulk ingredient text while ignoring hierarchy constraints."
    )
    parser.add_argument("input_path", type=Path)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    parsed = parse_input(args.input_path.read_text(encoding="utf-8"))
    if not parsed:
        raise SystemExit("No build units found in input")

    print(f"touched_build_units={len(parsed)}")
    for build_unit_id, payload in parsed.items():
        categories = payload["categories"]
        existing_name = load_existing_build_unit_name(build_unit_id)
        build_unit_name = existing_name or payload["name"]
        out_payload = build_payload(build_unit_id, build_unit_name, categories)
        action = "wrote" if args.write else "would_write"
        if args.write:
            write_json(INGREDIENTS_DIR / f"{build_unit_id}.json", out_payload)
        print(
            f"{action} {build_unit_id}.json categories={len(categories)} entries={len(out_payload['entries'])}"
        )


if __name__ == "__main__":
    main()
