#!/usr/bin/env python3

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INGREDIENTS_DIR = ROOT / "ingredients"
HISTORY_PATH = Path("/root/.codex/history.jsonl")

TARGET_CATEGORY_IDS = {
    *(f"1.1.13.5.{index}" for index in range(10, 25)),
    *(f"1.1.14.1.{index}" for index in range(1, 25)),
    *(f"1.1.14.2.{index}" for index in range(1, 25)),
    *(f"1.1.14.3.{index}" for index in range(1, 25)),
    *(f"1.1.14.4.{index}" for index in range(1, 25)),
}

HEADING_RE = re.compile(r"(\d+\.\d+\.\d+\.\d+\.\d+)\s+([^\n]+)")
EMBEDDED_NEXT_HEADING_RE = re.compile(r"\d+\.\d+\.\d+\.\d+(?:\.\d+)?\s")


def load_source_text() -> str:
    for line in HISTORY_PATH.read_text(encoding="utf-8").splitlines():
        payload = json.loads(line)
        text = payload.get("text", "")
        if "1.1.13.5.10 Fats and Cooking Mediums" in text and "1.1.14.4.24" in text:
            return text
    raise SystemExit("Could not find recovered history block")


def parse_category_blocks(text: str) -> dict[str, list[str]]:
    matches = list(HEADING_RE.finditer(text))
    blocks: dict[str, list[str]] = {}

    for index, match in enumerate(matches):
        category_id = match.group(1)
        if category_id not in TARGET_CATEGORY_IDS:
            continue

        block_start = match.end()
        block_end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        block_text = text[block_start:block_end]
        embedded_heading = EMBEDDED_NEXT_HEADING_RE.search(block_text)
        if embedded_heading:
            block_text = block_text[:embedded_heading.start()]
        raw_lines = block_text.splitlines()
        lines = [line.strip() for line in raw_lines if line.strip()]
        blocks[category_id] = lines

    missing = sorted(TARGET_CATEGORY_IDS - blocks.keys())
    if missing:
        raise SystemExit(f"Missing category blocks: {missing}")

    return blocks


def load_region_file(build_unit_id: str) -> dict:
    path = INGREDIENTS_DIR / f"{build_unit_id}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def write_region_file(build_unit_id: str, payload: dict) -> None:
    path = INGREDIENTS_DIR / f"{build_unit_id}.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def build_entries(category_blocks: dict[str, list[str]], build_unit_id: str, keep_existing: list[dict]) -> list[dict]:
    preserved = [entry for entry in keep_existing if not entry["parentCategoryId"].startswith(f"{build_unit_id}.")]
    preserved.extend(
        entry for entry in keep_existing
        if entry["parentCategoryId"].startswith(f"{build_unit_id}.")
        and entry["parentCategoryId"] not in category_blocks
    )

    new_entries: list[dict] = []
    for category_id in sorted(category_blocks.keys(), key=lambda value: int(value.split(".")[-1])):
        for sort_order, name in enumerate(category_blocks[category_id], start=1):
            new_entries.append(
                {
                    "id": f"{category_id}.{sort_order}",
                    "parentCategoryId": category_id,
                    "name": name,
                    "sortOrder": sort_order,
                    "aliases": [],
                    "tags": [],
                    "importanceTags": [],
                    "notes": None,
                }
            )

    return preserved + new_entries


def main() -> None:
    text = load_source_text()
    category_blocks = parse_category_blocks(text)

    touched: list[tuple[str, int]] = []

    for build_unit_id in ["1.1.13.5", "1.1.14.1", "1.1.14.2", "1.1.14.3", "1.1.14.4"]:
        payload = load_region_file(build_unit_id)
        relevant_blocks = {
            category_id: lines
            for category_id, lines in category_blocks.items()
            if category_id.startswith(f"{build_unit_id}.")
        }
        payload["entries"] = build_entries(relevant_blocks, build_unit_id, payload.get("entries", []))
        write_region_file(build_unit_id, payload)
        touched.append((build_unit_id, len(payload["entries"])))

    for build_unit_id, count in touched:
        print(f"{build_unit_id} entries={count}")


if __name__ == "__main__":
    main()
