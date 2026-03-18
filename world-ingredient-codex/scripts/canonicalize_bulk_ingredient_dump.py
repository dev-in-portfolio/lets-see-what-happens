#!/usr/bin/env python3

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HIERARCHY_PATH = ROOT / "hierarchy.json"

BUILD_UNIT_HEADER_RE = re.compile(r"^(?P<id>\d+\.\d+\.\d+\.\d+)(?:\s+(?P<name>.+))?$")
CATEGORY_HEADER_RE = re.compile(r"^(?P<id>\d+\.\d+\.\d+\.\d+\.\d+)(?:\s+(?P<name>.+))?$")
INLINE_BUILD_UNIT_FRAGMENT_RE = re.compile(
    r"\d+\.\d+\.\d+\.\d+\s+.+?(?=(?:\d+\.\d+\.\d+\.\d+\s)|$)"
)
EMBEDDED_HEADING_RE = re.compile(r"\d+\.\d+\.\d+\.\d+(?:\.\d+)?\s")
ATTACHED_BUILD_UNIT_RE = re.compile(r"(?<=[A-Za-zʻʼ’'\)])(?=\d+\.\d+\.\d+\.\d+\s)")

# Older dump batches use narrower or differently ordered D-level regions than the
# current hierarchy. Remap them into the current canonical slots without changing
# the hierarchy ids consumed by the app and existing tooling.
LEGACY_BUILD_UNIT_REMAP = {
    "1.1.13.1": "1.1.13.4",
    "1.1.13.2": "1.1.13.4",
    "1.1.13.3": "1.1.13.3",
    "1.1.13.4": "1.1.13.2",
    "1.1.13.5": "1.1.13.1",
    "1.1.13.6": "1.1.13.5",
    "1.1.14.1": "1.1.14.1",
    "1.1.14.2": "1.1.14.2",
    "1.1.14.3": "1.1.14.2",
    "1.1.14.4": "1.1.14.1",
    "1.1.14.5": "1.1.14.5",
    "1.1.14.6": "1.1.14.4",
    "1.2.1.1": "1.2.1.1",
    "1.2.1.2": "1.2.1.2",
    "1.2.1.3": "1.2.1.3",
    "1.2.1.4": "1.2.1.4",
    "1.2.1.5": "1.2.1.5",
    "1.2.1.6": "1.2.1.4",
    "1.2.2.1": "1.2.2.1",
}

NOISY_LINE_PREFIXES = (
    "Built around ",
    "I’m using this as ",
    "It had the full 24-category skeleton",
    "Here is the corrected, fuller version.",
    "Using ",
)


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
    stripped = line.strip()
    for prefix in ("- ", "* ", "• "):
        if stripped.startswith(prefix):
            return stripped[len(prefix):].strip()
    return stripped


def preprocess_text(text: str) -> list[str]:
    text = re.sub(r"^11\.1\.11\.1\b", "1.1.11.1", text, count=1, flags=re.MULTILINE)
    text = ATTACHED_BUILD_UNIT_RE.sub("\n", text)

    cleaned_lines: list[str] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        inline_build_match = re.search(r"\s(?P<fragment>\d+\.\d+\.\d+\.\d+\s.+)$", line)
        if inline_build_match and not BUILD_UNIT_HEADER_RE.match(line):
            line = inline_build_match.group("fragment").strip()

        for noisy_suffix in ("Grill smokeBecause", "Wood smokeBecause", "Ti leaf smokeBecause"):
            if line.startswith(noisy_suffix):
                line = line.split("Because", 1)[0].strip()
                break
        if not line:
            continue

        if line.startswith("Continue and "):
            fragments = INLINE_BUILD_UNIT_FRAGMENT_RE.findall(line)
            if fragments:
                line = fragments[-1].strip()
            else:
                continue

        if line.startswith(NOISY_LINE_PREFIXES):
            continue

        cleaned_lines.append(line)

    return cleaned_lines


def canonicalize_lines(
    lines: list[str],
    build_units: dict[str, str],
    categories: dict[str, tuple[str, str]],
) -> tuple[list[str], dict[str, list[str]]]:
    source_to_targets: dict[str, list[str]] = defaultdict(list)
    target_build_order: list[str] = []
    target_build_seen: set[str] = set()
    target_category_ingredients: dict[str, dict[str, list[str]]] = defaultdict(dict)
    target_category_seen: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    current_target_build_unit_id: str | None = None
    current_target_category_id: str | None = None
    skipping_unknown_build_unit = False

    for line_number, line in enumerate(lines, start=1):
        category_match = CATEGORY_HEADER_RE.match(line)
        if category_match:
            if current_target_build_unit_id is None:
                if skipping_unknown_build_unit:
                    continue
                raise SystemExit(f"Line {line_number}: category appears before a build unit header")

            category_index = int(category_match.group("id").split(".")[-1])
            target_category_id = f"{current_target_build_unit_id}.{category_index}"
            if target_category_id not in categories:
                raise SystemExit(
                    f"Line {line_number}: target category {target_category_id} is not defined in hierarchy.json"
                )

            target_category_ingredients[current_target_build_unit_id].setdefault(target_category_id, [])
            current_target_category_id = target_category_id
            continue

        build_unit_match = BUILD_UNIT_HEADER_RE.match(line)
        if build_unit_match:
            source_build_unit_id = build_unit_match.group("id")
            target_build_unit_id = LEGACY_BUILD_UNIT_REMAP.get(source_build_unit_id, source_build_unit_id)
            if target_build_unit_id not in build_units:
                skipping_unknown_build_unit = True
                current_target_build_unit_id = None
                current_target_category_id = None
                continue

            source_to_targets[source_build_unit_id].append(target_build_unit_id)
            skipping_unknown_build_unit = False
            current_target_build_unit_id = target_build_unit_id
            current_target_category_id = None
            if target_build_unit_id not in target_build_seen:
                target_build_seen.add(target_build_unit_id)
                target_build_order.append(target_build_unit_id)
            continue

        if current_target_build_unit_id is None or current_target_category_id is None:
            if skipping_unknown_build_unit:
                continue
            raise SystemExit(f"Line {line_number}: ingredient entry appears before a category header")

        ingredient_name = strip_bullet_prefix(line)
        if not ingredient_name:
            continue
        if EMBEDDED_HEADING_RE.search(ingredient_name):
            raise SystemExit(
                f"Line {line_number}: ingredient name contains embedded codex heading text: {ingredient_name!r}"
            )

        seen_names = target_category_seen[current_target_build_unit_id][current_target_category_id]
        if ingredient_name in seen_names:
            continue

        seen_names.add(ingredient_name)
        target_category_ingredients[current_target_build_unit_id][current_target_category_id].append(ingredient_name)

    output_lines: list[str] = []
    for target_build_unit_id in target_build_order:
        output_lines.append(f"{target_build_unit_id} {build_units[target_build_unit_id]}")
        for category_index in range(1, 25):
            target_category_id = f"{target_build_unit_id}.{category_index}"
            ingredient_names = target_category_ingredients[target_build_unit_id].get(target_category_id, [])
            if not ingredient_names:
                continue
            output_lines.append(f"{target_category_id} {categories[target_category_id][1]}")
            output_lines.extend(ingredient_names)

    return output_lines, source_to_targets


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize a noisy bulk ingredient dump into canonical import_bulk_ingredient_text.py input."
    )
    parser.add_argument("input_path", type=Path, help="Path to the raw dump text file")
    parser.add_argument("output_path", type=Path, help="Path to write the canonicalized text file")
    args = parser.parse_args()

    build_units, categories = load_hierarchy()
    cleaned_lines = preprocess_text(args.input_path.read_text(encoding="utf-8"))
    canonical_lines, source_to_targets = canonicalize_lines(cleaned_lines, build_units, categories)

    args.output_path.write_text("\n".join(canonical_lines) + "\n", encoding="utf-8")

    touched_targets = sorted({target for targets in source_to_targets.values() for target in targets})
    print(f"canonicalized_source_build_units={len(source_to_targets)}")
    print(f"touched_target_build_units={len(touched_targets)}")
    for source_build_unit_id in sorted(source_to_targets):
        targets = ", ".join(source_to_targets[source_build_unit_id])
        print(f"{source_build_unit_id} -> {targets}")


if __name__ == "__main__":
    main()
