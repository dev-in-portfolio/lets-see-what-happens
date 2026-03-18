#!/usr/bin/env python3

import json
import re
import shutil
from collections import Counter
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AZ_ROOT = ROOT / "ingredients" / "a-z"
HIERARCHY_PATH = ROOT / "hierarchy.json"
SCHEMA_URL = "https://example.com/schemas/ingredient-codex-flavor-bible.schema.json"
TODAY = date.today().isoformat()

ID_RE = re.compile(r"^\d+\.\d+\.\d+\.\d+\.\d+\.\d+$")
HEADING_PREFIX_RE = re.compile(r"^\d+(?:\.\d+)+\s+")

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
}

CATEGORY_PROFILE = {
    "breads_and_baked_goods": {
        "flavor_profile": "Starchy base with grain-forward and toastable notes.",
        "primary_tastes": ["starchy", "savory"],
        "best_preparations": ["raw", "toasted", "fried", "stewed"],
        "functions": ["base", "texture_contrast"],
        "pairings": ["butter", "olive oil", "garlic", "herbs", "cheese"],
    },
    "vegetables": {
        "flavor_profile": "Fresh vegetal notes varying from sweet to bitter depending on type.",
        "primary_tastes": ["savory", "bitter", "sweet"],
        "best_preparations": ["raw", "sauteed", "roasted", "steamed", "pickled"],
        "functions": ["base", "garnish", "aromatic"],
        "pairings": ["olive oil", "garlic", "onion", "vinegar", "herbs"],
    },
    "fruits": {
        "flavor_profile": "Natural sweetness with balancing acid and aromatic complexity.",
        "primary_tastes": ["sweet", "acidic"],
        "best_preparations": ["raw", "juiced", "candied", "preserved"],
        "functions": ["sweetness", "acid_source", "finishing_note"],
        "pairings": ["citrus", "honey", "cream", "nuts", "spices"],
    },
    "legumes_and_pulses": {
        "flavor_profile": "Earthy, nutty, and savory with strong body-building character.",
        "primary_tastes": ["savory", "earthy"],
        "best_preparations": ["stewed", "braised", "pureed"],
        "functions": ["base", "binder", "umami_support"],
        "pairings": ["garlic", "onion", "cumin", "tomato", "acid"],
    },
    "nuts_and_seeds": {
        "flavor_profile": "Nutty and rich with variable bitterness and aromatic oils.",
        "primary_tastes": ["nutty", "savory"],
        "best_preparations": ["raw", "roasted", "powdered", "infused"],
        "functions": ["fat_source", "texture_contrast", "finishing_note"],
        "pairings": ["honey", "salt", "spices", "fruit", "chocolate"],
    },
    "proteins": {
        "flavor_profile": "Savory backbone ingredient with high pairing flexibility.",
        "primary_tastes": ["savory", "umami"],
        "best_preparations": ["grilled", "roasted", "braised", "stewed", "fried"],
        "functions": ["base", "umami_support", "structural"],
        "pairings": ["salt", "pepper", "garlic", "acid", "fats", "herbs"],
    },
    "herbs_and_leafy_aromatics": {
        "flavor_profile": "Aromatic, green, and bright with volatile top notes.",
        "primary_tastes": ["herbal", "bright"],
        "best_preparations": ["raw", "infused", "blended", "finishing"],
        "functions": ["aromatic", "garnish", "finishing_note"],
        "pairings": ["citrus", "garlic", "olive oil", "vinegar", "dairy"],
    },
    "spices_and_dried_aromatics": {
        "flavor_profile": "Concentrated aromatic compounds with heat, warmth, or bitterness.",
        "primary_tastes": ["spicy", "warm", "bitter"],
        "best_preparations": ["toasted", "powdered", "infused", "stewed"],
        "functions": ["aromatic", "heat", "finishing_note"],
        "pairings": ["fats", "acid", "sweetness", "aromatics", "proteins"],
    },
    "aromatics": {
        "flavor_profile": "Foundational flavor builders used to create depth and structure.",
        "primary_tastes": ["savory", "aromatic"],
        "best_preparations": ["sauteed", "stewed", "braised", "infused"],
        "functions": ["base", "aromatic"],
        "pairings": ["fats", "salt", "acid", "herbs", "spices"],
    },
    "fats_and_cooking_mediums": {
        "flavor_profile": "Carries aroma and rounds harsh notes while adding richness.",
        "primary_tastes": ["rich", "creamy"],
        "best_preparations": ["raw", "infused", "sauteed", "fried"],
        "functions": ["fat_source", "emulsifier", "round_out"],
        "pairings": ["aromatics", "acids", "spices", "proteins", "vegetables"],
    },
    "dairy_and_dairy_like": {
        "flavor_profile": "Creamy and lactic with balancing sweetness, richness, or funk.",
        "primary_tastes": ["creamy", "savory", "sweet"],
        "best_preparations": ["raw", "infused", "blended", "finishing"],
        "functions": ["fat_source", "binder", "round_out"],
        "pairings": ["fruit", "herbs", "spices", "breads", "acids"],
    },
    "acids_and_souring_agents": {
        "flavor_profile": "Brightening and balancing sour elements that sharpen dishes.",
        "primary_tastes": ["acidic", "bright"],
        "best_preparations": ["raw", "infused", "finishing", "pickled"],
        "functions": ["acid_source", "brightens", "cuts_through"],
        "pairings": ["fats", "sweetness", "proteins", "herbs", "vegetables"],
    },
    "condiments_and_sauces": {
        "flavor_profile": "Concentrated seasoning systems that combine multiple flavor directions.",
        "primary_tastes": ["savory", "acidic", "sweet", "spicy"],
        "best_preparations": ["raw", "blended", "infused", "finishing"],
        "functions": ["finishing_note", "bridge", "umami_support"],
        "pairings": ["proteins", "vegetables", "starches", "fats", "acids"],
    },
    "ferments_and_pickles": {
        "flavor_profile": "Complex sour-salty-funky notes with high aromatic impact.",
        "primary_tastes": ["fermented", "acidic", "savory"],
        "best_preparations": ["raw", "finishing", "stewed"],
        "functions": ["acid_source", "umami_support", "finishing_note"],
        "pairings": ["fats", "proteins", "starches", "vegetables", "broths"],
    },
    "sweeteners": {
        "flavor_profile": "Sweetening agents that also add caramel, floral, or molasses depth.",
        "primary_tastes": ["sweet"],
        "best_preparations": ["raw", "candied", "preserved", "blended"],
        "functions": ["sweetness", "binder", "balance"],
        "pairings": ["acids", "spices", "nuts", "dairy", "fruit"],
    },
}


def read_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def normalize_name(raw: str) -> str:
    return HEADING_PREFIX_RE.sub("", raw).strip()


def pairing_refs(names: list[str]) -> list[dict]:
    return [{"name": name, "confidence": "good", "notes": ""} for name in names]


def infer_category(ids: list[str]) -> str:
    idx_counter: Counter[int] = Counter()
    for value in ids:
        if ID_RE.match(value):
            idx_counter[int(value.split(".")[-2])] += 1
    if not idx_counter:
        return "unknown"
    top_idx = idx_counter.most_common(1)[0][0]
    return CATEGORY_BY_INDEX.get(top_idx, f"category_{top_idx}")


def empty_rel() -> dict:
    return {
        "enhances": [],
        "balances": [],
        "contrasts": [],
        "bridges": [],
        "rounds_out": [],
        "cuts_through": [],
        "deepens": [],
        "brightens": [],
    }


def build_payload(primary_name: str, variations: list[str], expansions: list[str], ids: list[str], category: str) -> dict:
    profile = CATEGORY_PROFILE.get(category, {
        "flavor_profile": "General ingredient profile; requires curation.",
        "primary_tastes": [],
        "best_preparations": [],
        "functions": [],
        "pairings": [],
    })
    alt_names = sorted(set(v for v in variations if normalize_name(v) != primary_name))
    pair_refs = pairing_refs(profile["pairings"])

    comp_tree = {
        "herbs": [],
        "spices": [],
        "aromatics": [],
        "vegetables": [],
        "fruits": [],
        "proteins": [],
        "seafood": [],
        "dairy": [],
        "fats": [],
        "acids_sour_elements": [],
        "sweet_elements": [],
        "starches_grains_bread": [],
        "legumes_beans_pulses": [],
        "nuts_seeds": [],
        "fungi": [],
        "fermented_aged_funky_elements": [],
        "liquids_stocks_sauces": [],
        "alcoholic_pairings": [],
    }
    if category == "proteins":
        comp_tree["herbs"] = pairing_refs(["parsley", "cilantro", "thyme", "oregano"])
        comp_tree["spices"] = pairing_refs(["black pepper", "cumin", "paprika"])
        comp_tree["acids_sour_elements"] = pairing_refs(["lemon juice", "vinegar"])
        comp_tree["fats"] = pairing_refs(["olive oil", "butter"])
    elif category == "vegetables":
        comp_tree["aromatics"] = pairing_refs(["garlic", "onion"])
        comp_tree["fats"] = pairing_refs(["olive oil", "butter"])
        comp_tree["acids_sour_elements"] = pairing_refs(["vinegar", "lemon juice"])
    elif category == "fruits":
        comp_tree["sweet_elements"] = pairing_refs(["honey", "sugar"])
        comp_tree["dairy"] = pairing_refs(["yogurt", "cream"])
        comp_tree["nuts_seeds"] = pairing_refs(["almond", "walnut"])
    else:
        comp_tree["aromatics"] = pairing_refs(["garlic", "onion"])
        comp_tree["fats"] = pairing_refs(["olive oil"])
        comp_tree["acids_sour_elements"] = pairing_refs(["lemon juice"])

    return {
        "$schema": SCHEMA_URL,
        "schema_version": "1.0.0",
        "entry_id": ids[0] if ids else primary_name,
        "ingredient_name": {
            "primary_name": primary_name,
            "alternate_names": alt_names,
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
            "flavor_profile": profile["flavor_profile"],
            "aroma": "",
            "texture": "",
            "intensity": "medium",
            "character_words": profile["primary_tastes"][:4],
        },
        "star_pairings": {
            "best_pairings": pair_refs[:5],
            "signature_combinations": pair_refs[:3],
            "surprise_pairings": [],
        },
        "complementary_ingredient_tree": comp_tree,
        "complementary_flavor_tree": {
            "paired_flavor_directions": [],
            "best_flavor_relationships": empty_rel(),
        },
        "culinary_function": {
            "primary_functions": profile["functions"][:3],
            "role_in_dish": "supporting",
            "best_uses_by_role": {
                "as_main_note": [],
                "as_secondary_note": [],
                "as_finishing_element": [],
                "as_balancing_ingredient": [],
            },
        },
        "technique_compatibility": {
            "best_preparations": profile["best_preparations"],
            "technique_notes": {
                "improves_when": [],
                "weakens_when": [],
                "becomes_sweeter_when": [],
                "becomes_more_bitter_when": [],
                "loses_aroma_when": [],
                "best_finishing_method": [],
                "best_long_cook_use": [],
                "best_quick_cook_use": [],
            },
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
            "available_year_round": True,
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
            "general_description": f"{primary_name} in category {category}.",
        },
        "flavor_profile": {
            "primary_tastes": profile["primary_tastes"],
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
            "in_one_line": f"{primary_name}: {profile['flavor_profile']}",
            "best_with": profile["pairings"][:5],
            "best_techniques": profile["best_preparations"][:5],
            "best_season": [],
            "avoid_pairing_with_excess": [],
            "top_cuisines": [],
        },
        "standardized_add_on_fields": {
            "protein_pairings": comp_tree["proteins"],
            "herb_pairings": comp_tree["herbs"],
            "spice_pairings": comp_tree["spices"],
            "fat_pairings": comp_tree["fats"],
            "acid_pairings": comp_tree["acids_sour_elements"],
            "texture_pairings": [],
            "cuisine_tags": [],
            "technique_tags": [],
            "bridge_ingredients": pair_refs[:3],
            "pairing_confidence_scale_used": ["classic", "strong", "good", "experimental"],
            "avoid_conflict_pairings": [],
        },
        "metadata": {
            "source_notes": [
                {
                    "title": "World Ingredient Codex",
                    "citation": "Auto-populated from ingredients/a-z folder data (name, ids, variations, expansions).",
                    "accessed_date": TODAY,
                }
            ],
            "confidence_level": "medium",
            "last_updated": TODAY,
            "editor_notes": ["Auto-populated scaffold with category-driven defaults; manual culinary review required."],
            "version": "1.0.0",
            "disputed_or_regional_variation_notes": [],
        },
    }


def main() -> None:
    hierarchy = json.loads(HIERARCHY_PATH.read_text(encoding="utf-8"))
    location_names = {
        str(node.get("name", "")).strip().casefold()
        for node in hierarchy.get("nodes", [])
        if str(node.get("name", "")).strip()
    }

    folders = []
    for letter_dir in sorted([p for p in AZ_ROOT.iterdir() if p.is_dir() and len(p.name) == 1]):
        folders.extend(sorted([p for p in letter_dir.iterdir() if p.is_dir()]))

    removed = 0
    written = 0
    for folder in folders:
        name_lines = read_lines(folder / "name.txt")
        if not name_lines:
            shutil.rmtree(folder, ignore_errors=True)
            removed += 1
            continue

        primary_name = normalize_name(name_lines[0])
        if not primary_name or primary_name.casefold() in location_names:
            shutil.rmtree(folder, ignore_errors=True)
            removed += 1
            continue

        variations = [v for v in read_lines(folder / "variations.txt")]
        expansions = [normalize_name(v) for v in read_lines(folder / "expansions.txt")]
        expansions = sorted(set(x for x in expansions if x and x != primary_name))
        ids = [x for x in read_lines(folder / "ids.txt") if ID_RE.match(x)]
        category = infer_category(ids)

        payload = build_payload(primary_name, variations, expansions, ids, category)
        (folder / "name.txt").write_text(primary_name + "\n", encoding="utf-8")
        (folder / "flavor_bible_entry.json").write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        written += 1

    summary = {
        "ingredient_folders_written": written,
        "folders_removed_as_non_ingredients": removed,
        "schema_file": str(ROOT / "schemas" / "ingredient-codex-flavor-bible.schema.json"),
        "last_updated": TODAY,
    }
    (AZ_ROOT / "FLAVOR_BIBLE_GENERATION_SUMMARY.json").write_text(
        json.dumps(summary, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
