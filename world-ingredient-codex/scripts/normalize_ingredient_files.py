#!/usr/bin/env python3

import json
import re
from pathlib import Path


ROOT = Path("/root/world-ingredient-codex")
INGREDIENTS_DIR = ROOT / "ingredients"
HIERARCHY_PATH = ROOT / "hierarchy.json"
HEADING_LIKE_ENTRY_NAME = re.compile(r"^\d+(?:\.\d+)+\s")


def load_hierarchy():
    data = json.loads(HIERARCHY_PATH.read_text(encoding="utf-8"))
    return {node["id"]: node["name"] for node in data["nodes"] if node["level"] == "D"}


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize_entries(entries: list[dict]) -> list[dict]:
    cleaned = [entry for entry in entries if not HEADING_LIKE_ENTRY_NAME.match(str(entry.get("name", "")))]
    counters: dict[str, int] = {}

    for entry in cleaned:
        parent_category_id = str(entry.get("parentCategoryId", ""))
        counters[parent_category_id] = counters.get(parent_category_id, 0) + 1
        entry["sortOrder"] = counters[parent_category_id]

    return cleaned


def main() -> None:
    expected = load_hierarchy()
    created = 0
    renamed = 0
    deleted = 0
    cleaned_entries = 0

    for path in sorted(INGREDIENTS_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        stem = path.stem
        expected_name = expected.get(stem)

        if expected_name is None:
            if payload.get("entries"):
                raise SystemExit(f"Refusing to delete non-empty unexpected file: {path.name}")
            path.unlink()
            deleted += 1
            continue

        original_entries = payload.get("entries", [])
        normalized_entries = normalize_entries(original_entries)
        entry_cleanup_changed = len(normalized_entries) != len(original_entries)
        if entry_cleanup_changed:
            payload["entries"] = normalized_entries
            cleaned_entries += len(original_entries) - len(normalized_entries)

        if (
            payload.get("buildUnitId") != stem
            or payload.get("buildUnitName") != expected_name
            or entry_cleanup_changed
        ):
            payload["buildUnitId"] = stem
            payload["buildUnitName"] = expected_name
            payload.setdefault("entries", [])
            write_json(path, payload)
            renamed += 1

    for build_unit_id, build_unit_name in sorted(expected.items()):
        path = INGREDIENTS_DIR / f"{build_unit_id}.json"
        if path.exists():
            continue
        write_json(
            path,
            {
                "buildUnitId": build_unit_id,
                "buildUnitName": build_unit_name,
                "entries": [],
            },
        )
        created += 1

    print(f"created={created}")
    print(f"renamed={renamed}")
    print(f"deleted={deleted}")
    print(f"cleaned_entries={cleaned_entries}")


if __name__ == "__main__":
    main()
