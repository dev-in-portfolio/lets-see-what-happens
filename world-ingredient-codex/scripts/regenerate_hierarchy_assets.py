#!/usr/bin/env python3

import json
from pathlib import Path

ROOT = Path('/root/world-ingredient-codex')
TREE_PATH = ROOT / 'app/src/main/assets/codex_tree.txt'
TREE_WITH_E_PATH = ROOT / 'codex_tree_with_e.txt'
HIERARCHY_PATH = ROOT / 'hierarchy.json'
SEED_PATH = ROOT / 'app/src/main/assets/codex_seed.json'

CATEGORIES = [
    'Staples and Starches',
    'Vegetables',
    'Fruits',
    'Legumes and Pulses',
    'Nuts and Seeds',
    'Proteins',
    'Herbs and Leafy Aromatics',
    'Spices and Dried Aromatics',
    'Base Aromatics',
    'Fats and Cooking Mediums',
    'Dairy and Dairy-Like Ingredients',
    'Acids and Souring Agents',
    'Condiments, Sauces, and Pastes',
    'Fermented, Pickled, Cured, and Preserved Ingredients',
    'Sweeteners',
    'Liquids and Cooking Liquids',
    'Garnishes and Finishing Elements',
    'Specialty / Wildcard Ingredients',
    'Traditional Remedies and Holistic Medicinal Ingredients',
    'Beverages, Spirits, and Fermentation Bases',
    'Salts, Mineral Seasonings, and Alkaline Agents',
    'Leaveners, Cultures, Coagulants, Thickeners, Gelling Agents, and Functional Agents',
    'Wrappers, Casings, and Food-Contact Preparation Media',
    'Smoke, Woods, Ashes, and Infusion / Exposure Media',
]
LEVEL_NAMES = {1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E'}


def parse_tree_lines() -> list[tuple[str, str]]:
    lines = []
    for raw in TREE_PATH.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line:
            continue
        codex_id, display_name = line.split(' ', 1)
        lines.append((codex_id, display_name.strip()))
    return lines


def build_nodes(tree_lines: list[tuple[str, str]]) -> list[dict]:
    sibling_counts: dict[str | None, int] = {}
    nodes: list[dict] = []
    d_nodes: list[str] = []

    for codex_id, display_name in tree_lines:
        parent_id = codex_id.rsplit('.', 1)[0] if '.' in codex_id else None
        sort_order = sibling_counts.get(parent_id, 0) + 1
        sibling_counts[parent_id] = sort_order
        level = LEVEL_NAMES[codex_id.count('.') + 1]
        node = {
            'id': codex_id,
            'name': display_name,
            'level': level,
            'parentId': parent_id,
            'sortOrder': sort_order,
        }
        nodes.append(node)
        if level == 'D':
            d_nodes.append(codex_id)

    for d_id in d_nodes:
        for index, category_name in enumerate(CATEGORIES, start=1):
            nodes.append(
                {
                    'id': f'{d_id}.{index}',
                    'name': category_name,
                    'level': 'E',
                    'parentId': d_id,
                    'sortOrder': index,
                    'categoryIndex': index,
                }
            )

    return nodes


def write_tree_with_e(tree_lines: list[tuple[str, str]]) -> None:
    out_lines: list[str] = []
    for codex_id, display_name in tree_lines:
        out_lines.append(f'{codex_id} {display_name}')
        if codex_id.count('.') == 3:
            for index, category_name in enumerate(CATEGORIES, start=1):
                out_lines.append(f'{codex_id}.{index} {category_name}')
    TREE_WITH_E_PATH.write_text('\n'.join(out_lines) + '\n', encoding='utf-8')


def write_hierarchy(nodes: list[dict]) -> None:
    payload = {
        'version': 1,
        'categories': [{'index': index, 'name': name} for index, name in enumerate(CATEGORIES, start=1)],
        'nodes': nodes,
    }
    HIERARCHY_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def write_seed(tree_lines: list[tuple[str, str]]) -> None:
    sibling_counts: dict[str | None, int] = {}
    seed_nodes: list[dict] = []
    for codex_id, display_name in tree_lines:
        parent_id = codex_id.rsplit('.', 1)[0] if '.' in codex_id else None
        sort_order = sibling_counts.get(parent_id, 0) + 1
        sibling_counts[parent_id] = sort_order
        node = {
            'codexId': codex_id,
            'level': LEVEL_NAMES[codex_id.count('.') + 1],
            'displayName': display_name,
            'sortOrder': sort_order,
        }
        if parent_id is not None:
            node['parentCodexId'] = parent_id
        seed_nodes.append(node)

    payload = {
        'metadata': {
            'schemaVersion': 1,
            'source': 'codex_tree.txt',
            'exportedAt': '2026-03-13',
            'notes': 'Generated from codex_tree.txt. E1-E24 categories are generated automatically only under D-level nodes.',
        },
        'nodes': seed_nodes,
        'categories': [],
        'ingredients': [],
        'aliases': [],
        'tags': [],
        'citations': [],
        'crossLinks': [],
    }
    SEED_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main() -> None:
    tree_lines = parse_tree_lines()
    nodes = build_nodes(tree_lines)
    write_tree_with_e(tree_lines)
    write_hierarchy(nodes)
    write_seed(tree_lines)
    print(f'tree_lines={len(tree_lines)}')
    print(f'hierarchy_nodes={len(nodes)}')


if __name__ == '__main__':
    main()
