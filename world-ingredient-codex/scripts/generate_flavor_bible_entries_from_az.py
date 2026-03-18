#!/usr/bin/env python3

import json
import re
from collections import Counter
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AZ_ROOT = ROOT / "ingredients" / "a-z"
SCHEMA_REL = "https://example.com/schemas/ingredient-codex-flavor-bible.schema.json"
TODAY = date.today().isoformat()

CATEGORY_BY_INDEX = {
    1: "breads_and_baked_goods",
    2: "vegetables",
    3: "fruits",
    4: "legumes_and_pulses",
    5: "nuts_and_seeds",
    6: "proteins",
    7: "herbs_and_leafy_aromatics",
    8: "spices_and_dried_aromatics",
    9: "aromatics",
    10: "fats_and_cooking_mediums",
    11: "dairy_and_dairy_like",
    12: "acids_and_souring_agents",
    13: "condiments_and_sauces",
    14: "ferments_and_pickles",
    15: "sweeteners",
    16: "beverages_and_infusions",
    17: "savory_supports",
    18: "garnishes_and_finishes",
    19: "flavoring_agents",
    20: "processed_forms",
    21: "regional_specialties",
    22: "signature_items",
    23: "dish_variants",
    24: "fuel_and_cooking_media",
}

PAIRING_TREE_KEYS = [
    "herbs",
    "spices",
    "aromatics",
    "vegetables",
    "fruits",
    "proteins",
    "seafood",
    "dairy",
    "fats",
    "acids_sour_elements",
    "sweet_elements",
    "starches_grains_bread",
    "legumes_beans_pulses",
    "nuts_seeds",
    "fungi",
    "fermented_aged_funky_elements",
    "liquids_stocks_sauces",
    "alcoholic_pairings",
]

REL_KEYS = [
    "enhances",
    "balances",
    "contrasts",
    "bridges",
    "rounds_out",
    "cuts_through",
    "deepens",
    "brightens",
]

TECHNIQUE_NOTE_KEYS = [
    "improves_when",
    "weakens_when",
    "becomes_sweeter_when",
    "becomes_more_bitter_when",
    "loses_aroma_when",
    "best_finishing_method",
    "best_long_cook_use",
    "best_quick_cook_use",
]

ROLE_KEYS = [
    "as_main_note",
    "as_secondary_note",
    "as_finishing_element",
    "as_balancing_ingredient",
]


ID_RE = re.compile(r"^\d+\.\d+\.\d+\.\d+\.\d+\.\d+$")


def read_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def infer_category(ids: list[str]) -> str:
    idxs = []
    for value in ids:
        if ID_RE.match(value):
            idxs.append(int(value.split(".")[-2]))
    if not idxs:
        return "unknown"
    top = Counter(idxs).most_common(1)[0][0]
    return CATEGORY_BY_INDEX.get(top, f"category_{top}")


def build_entry(primary_name: str, variations: list[str], expansions: list[str], ids: list[str]) -> dict:
    category = infer_category(ids)
    alternate = sorted(set(v for v in variations if v != primary_name))

    pairing_tree = {key: [] for key in PAIRING_TREE_KEYS}
    rel_tree = {key: [] for key in REL_KEYS}
    technique_notes = {key: [] for key in TECHNIQUE_NOTE_KEYS}
    role_uses = {key: [] for key in ROLE_KEYS}

    return {
        "$schema": SCHEMA_REL,
        "schema_version": "1.0.0",
        "entry_id": ids[0] if ids else primary_name,
        "ingredient_name": {
            "primary_name": primary_name,
            "alternate_names": alternate,
            "regional_names": [],
            "original_native_names": [],
            "scientific_name": "",
            "family": "",
            "genus": "",
            "species": "",
            "category": category,
            "subcategory": "",
        },
        "quick_flavor_snapshot": {
            "flavor_profile": "To be curated.",
            "aroma": "",
            "texture": "",
            "intensity": "medium",
            "character_words": [],
        },
        "star_pairings": {
            "best_pairings": [],
            "signature_combinations": [],
            "surprise_pairings": [],
        },
        "complementary_ingredient_tree": pairing_tree,
        "complementary_flavor_tree": {
            "paired_flavor_directions": [],
            "best_flavor_relationships": rel_tree,
        },
        "culinary_function": {
            "primary_functions": [],
            "role_in_dish": "supporting",
            "best_uses_by_role": role_uses,
        },
        "technique_compatibility": {
            "best_preparations": [],
            "technique_notes": technique_notes,
        },
        "traditional_uses": {
            "classic_uses": [],
            "traditional_dish_examples": [],
            "traditional_cuisine_associations": [],
        },
        "modern_uses": {
            "contemporary_uses": [],
            "modern_application_ideas": [],
            "chef_driven_fusion_directions": [],
        },
        "seasonality": {
            "peak_seasons": [],
            "secondary_seasons": [],
            "available_year_round": False,
            "best_form_by_season": [],
            "seasonal_notes": [],
        },
        "identification_notes": {
            "appearance": "",
            "colors": [],
            "shape": "",
            "size_range": "",
            "surface_texture": "",
            "interior_characteristics": "",
            "ripe_vs_unripe_notes": "",
            "common_look_alikes": [],
            "how_to_identify_a_good_specimen": [],
            "signs_of_age_damage_or_poor_quality": [],
        },
        "description": {
            "general_description": "",
        },
        "flavor_profile": {
            "primary_tastes": [],
            "secondary_tastes": [],
            "aromatic_qualities": [],
            "texture_impressions": [],
            "raw_flavor": "",
            "cooked_flavor": "",
            "aftertaste_finish": "",
            "volatility": "medium",
            "persistence": "medium",
        },
        "tasting_notes": {
            "nose": "",
            "first_taste": "",
            "mid_palate": "",
            "finish": "",
            "mouthfeel": "",
            "evolving_notes_with_cooking": "",
            "pairing_impression": "",
        },
        "preparation_notes": {
            "how_to_prep": "",
            "trim_peel_seed_wash_notes": [],
            "part_used": [],
            "part_discarded": [],
            "common_cuts_forms": expansions,
            "special_handling_notes": [],
            "pre_treatment_if_needed": [],
            "storage_before_prep": "",
            "best_prep_for_strongest_flavor": "",
            "best_prep_for_mildest_flavor": "",
        },
        "history": {
            "origin": "",
            "historical_background": "",
            "trade_or_migration_notes": [],
            "important_cultural_spread": [],
            "historical_culinary_role": "",
        },
        "cultural_regional_notes": {
            "important_regional_identities": [],
            "ceremonial_or_symbolic_uses": [],
            "social_associations": [],
            "notable_regional_differences": [],
        },
        "substitutions_and_analogs": {
            "best_direct_substitutes": [],
            "partial_substitutes": [],
            "emergency_substitutes": [],
            "what_changes_if_substituted": [],
            "not_recommended_substitutes": [],
        },
        "cautions_limits": {
            "can_overpower": [],
            "can_disappear_next_to": [],
            "can_clash_with": [],
            "overuse_risks": [],
            "handling_cautions": [],
            "allergen_or_toxicity_concerns": [],
        },
        "best_dish_contexts": {
            "best_in": [],
            "works_better_as": [],
        },
        "pairing_logic_notes": {
            "why_it_pairs_well": "",
            "what_it_brings_to_a_pairing": [],
            "what_it_needs_from_a_partner": [],
            "best_bridge_ingredients": [],
            "best_contrast_ingredients": [],
            "best_supporting_ingredients": [],
        },
        "short_reference_summary": {
            "in_one_line": "",
            "best_with": [],
            "best_techniques": [],
            "best_season": [],
            "avoid_pairing_with_excess": [],
            "top_cuisines": [],
        },
        "standardized_add_on_fields": {
            "protein_pairings": [],
            "herb_pairings": [],
            "spice_pairings": [],
            "fat_pairings": [],
            "acid_pairings": [],
            "texture_pairings": [],
            "cuisine_tags": [],
            "technique_tags": [],
            "bridge_ingredients": [],
            "pairing_confidence_scale_used": ["classic", "strong", "good", "experimental"],
            "avoid_conflict_pairings": [],
        },
        "metadata": {
            "source_notes": [
                {
                    "title": "World Ingredient Codex",
                    "citation": "Auto-generated from codex ingredient entry folders.",
                    "accessed_date": TODAY,
                }
            ],
            "confidence_level": "medium",
            "last_updated": TODAY,
            "editor_notes": ["Auto-populated scaffold; requires culinary curation."],
            "version": "1.0.0",
            "disputed_or_regional_variation_notes": [],
        },
    }


def main() -> None:
    ingredient_dirs = []
    for letter_dir in sorted([p for p in AZ_ROOT.iterdir() if p.is_dir()]):
        ingredient_dirs.extend(sorted([p for p in letter_dir.iterdir() if p.is_dir()]))

    written = 0
    for folder in ingredient_dirs:
        name_lines = read_lines(folder / "name.txt")
        if not name_lines:
            continue
        primary_name = name_lines[0]
        variations = read_lines(folder / "variations.txt")
        expansions = read_lines(folder / "expansions.txt")
        ids = read_lines(folder / "ids.txt")

        payload = build_entry(primary_name, variations, expansions, ids)
        out_path = folder / "flavor_bible_entry.json"
        out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written += 1

    summary = {
        "ingredient_folders": len(ingredient_dirs),
        "entries_written": written,
        "schema": str(ROOT / "schemas" / "ingredient-codex-flavor-bible.schema.json"),
    }
    (AZ_ROOT / "FLAVOR_BIBLE_GENERATION_SUMMARY.json").write_text(
        json.dumps(summary, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
