#!/usr/bin/env python3

import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INGREDIENTS_DIR = ROOT / "ingredients"
HIERARCHY_PATH = ROOT / "hierarchy.json"
OUT_ROOT = ROOT / "flavor_bible_entries" / "a-z"
SCHEMA_URL = "https://example.com/schemas/ingredient-codex-flavor-bible.schema.json"
TODAY = date.today().isoformat()

ENTRY_ID_RE = re.compile(r"^\d+\.\d+\.\d+\.\d+\.\d+\.\d+$")
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

CATEGORY_PROFILE = {
    "breads_and_baked_goods": ("starchy, grain-forward, and toastable", ["starchy", "savory"]),
    "vegetables": ("fresh vegetal spectrum from sweet to bitter", ["savory", "bitter", "sweet"]),
    "fruits": ("naturally sweet-acidic with aromatic top notes", ["sweet", "acidic"]),
    "legumes_and_pulses": ("earthy and body-building", ["savory", "earthy"]),
    "nuts_and_seeds": ("nutty and rich with oils", ["nutty", "savory"]),
    "proteins": ("savory structural backbone", ["savory", "umami"]),
    "herbs_and_leafy_aromatics": ("green, aromatic, volatile", ["herbal", "bright"]),
    "spices_and_dried_aromatics": ("concentrated aromatic warmth/heat", ["spicy", "warm"]),
    "aromatics": ("foundational flavor-builders", ["savory", "aromatic"]),
    "fats_and_cooking_mediums": ("richness and aroma carrier", ["rich", "creamy"]),
    "dairy_and_dairy_like": ("lactic, creamy, and balancing", ["creamy", "savory"]),
    "acids_and_souring_agents": ("brightening sour balance", ["acidic", "bright"]),
    "condiments_and_sauces": ("concentrated seasoning systems", ["savory", "acidic", "sweet", "spicy"]),
    "ferments_and_pickles": ("funky-sour depth", ["fermented", "acidic", "savory"]),
    "sweeteners": ("sweetness and roundness", ["sweet"]),
}


def ascii_fold(value: str) -> str:
    return unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")


def sort_key(value: str) -> str:
    return re.sub(r"\s+", " ", ascii_fold(value).strip().lower())


def normalize_display_name(value: str) -> str:
    return HEADING_PREFIX_RE.sub("", value).strip()


def parse_original(display_name: str) -> str:
    parts = [p.strip() for p in display_name.split(",")]
    if len(parts) >= 3:
        return normalize_display_name(", ".join(parts[2:]).strip())
    return normalize_display_name(display_name.strip())


def bucket_letter(name: str) -> str:
    for ch in sort_key(name):
        if "a" <= ch <= "z":
            return ch
    return "z"


def slugify(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "_", sort_key(name)).strip("_")
    if not base:
        base = "item"
    digest = hashlib.sha1(name.encode("utf-8")).hexdigest()[:8]
    return f"{base[:72]}__{digest}"


def pairing_ref(name: str, confidence: str = "good") -> dict:
    return {"name": name, "confidence": confidence, "notes": ""}


def infer_category(idx_counter: Counter[int]) -> str:
    if not idx_counter:
        return "unknown"
    return CATEGORY_BY_INDEX.get(idx_counter.most_common(1)[0][0], "unknown")


def top_pairings_for_index(
    idx: int,
    current: str,
    freq_by_idx: dict[int, Counter[str]],
    limit: int = 8,
) -> list[str]:
    out: list[str] = []
    for name, _ in freq_by_idx.get(idx, Counter()).most_common(limit * 5):
        if name == current:
            continue
        out.append(name)
        if len(out) >= limit:
            break
    return out


def make_payload(
    name: str,
    variations: list[str],
    ids: list[str],
    idx_counter: Counter[int],
    freq_by_idx: dict[int, Counter[str]],
    expansions: list[str],
) -> dict:
    primary_idx = idx_counter.most_common(1)[0][0] if idx_counter else 0
    category = infer_category(idx_counter)
    flavor_text, tastes = CATEGORY_PROFILE.get(category, ("requires curation", []))
    pairings = top_pairings_for_index(primary_idx, name, freq_by_idx, limit=8)
    pair_refs = [pairing_ref(x, "good") for x in pairings]

    def picks(start: int, size: int) -> list[dict]:
        return pair_refs[start : start + size]

    comp_tree = {
        "herbs": picks(0, 3),
        "spices": picks(3, 3),
        "aromatics": picks(1, 3),
        "vegetables": picks(0, 3),
        "fruits": picks(0, 3),
        "proteins": picks(0, 3),
        "seafood": [],
        "dairy": picks(0, 2),
        "fats": picks(0, 2),
        "acids_sour_elements": picks(0, 2),
        "sweet_elements": picks(0, 2),
        "starches_grains_bread": picks(0, 2),
        "legumes_beans_pulses": picks(0, 2),
        "nuts_seeds": picks(0, 2),
        "fungi": picks(0, 2),
        "fermented_aged_funky_elements": picks(0, 2),
        "liquids_stocks_sauces": picks(0, 2),
        "alcoholic_pairings": [],
    }

    return {
        "$schema": SCHEMA_URL,
        "schema_version": "1.0.0",
        "entry_id": ids[0] if ids else name,
        "ingredient_name": {
            "primary_name": name,
            "alternate_names": sorted(set(x for x in variations if parse_original(x) != name)),
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
            "flavor_profile": flavor_text,
            "aroma": "",
            "texture": "",
            "intensity": "medium",
            "character_words": tastes,
        },
        "star_pairings": {
            "best_pairings": picks(0, 5),
            "signature_combinations": picks(0, 3),
            "surprise_pairings": picks(5, 2),
        },
        "complementary_ingredient_tree": comp_tree,
        "complementary_flavor_tree": {
            "paired_flavor_directions": [],
            "best_flavor_relationships": {
                "enhances": [],
                "balances": [],
                "contrasts": [],
                "bridges": [],
                "rounds_out": [],
                "cuts_through": [],
                "deepens": [],
                "brightens": [],
            },
        },
        "culinary_function": {
            "primary_functions": [],
            "role_in_dish": "supporting",
            "best_uses_by_role": {
                "as_main_note": [],
                "as_secondary_note": [],
                "as_finishing_element": [],
                "as_balancing_ingredient": [],
            },
        },
        "technique_compatibility": {
            "best_preparations": [],
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
            "general_description": f"{name} ({category}).",
        },
        "flavor_profile": {
            "primary_tastes": tastes,
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
            "best_bridge_ingredients": picks(0, 3),
            "best_contrast_ingredients": picks(3, 3),
            "best_supporting_ingredients": picks(0, 3),
        },
        "short_reference_summary": {
            "in_one_line": f"{name}: {flavor_text}",
            "best_with": pairings[:5],
            "best_techniques": [],
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
            "bridge_ingredients": picks(0, 3),
            "pairing_confidence_scale_used": ["classic", "strong", "good", "experimental"],
            "avoid_conflict_pairings": [],
        },
        "metadata": {
            "source_notes": [
                {
                    "title": "World Ingredient Codex",
                    "citation": "Auto-generated from ingredient entries.",
                    "accessed_date": TODAY,
                }
            ],
            "confidence_level": "medium",
            "last_updated": TODAY,
            "editor_notes": [f"source_ids: {', '.join(ids[:20])}"],
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

    # Build ingredient corpus directly from core files.
    records_by_name: dict[str, dict] = {}
    freq_by_idx: dict[int, Counter[str]] = defaultdict(Counter)

    for path in sorted(INGREDIENTS_DIR.rglob("*.json")):
        if "/a-z/" in str(path):
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for entry in payload.get("entries", []):
            entry_id = str(entry.get("id", "")).strip()
            parent = str(entry.get("parentCategoryId", "")).strip()
            display = str(entry.get("name", "")).strip()
            if not ENTRY_ID_RE.match(entry_id) or not parent or not display:
                continue

            original = parse_original(display)
            if not original:
                continue
            if original.casefold() in location_names:
                continue

            try:
                idx = int(parent.split(".")[-1])
            except Exception:
                continue

            rec = records_by_name.setdefault(
                original,
                {
                    "name": original,
                    "variations": set(),
                    "ids": set(),
                    "idx_counter": Counter(),
                },
            )
            rec["variations"].add(display)
            rec["ids"].add(entry_id)
            rec["idx_counter"][idx] += 1
            freq_by_idx[idx][original] += 1

    # Build fast expansion lookup by prefix.
    all_names = sorted(records_by_name.keys(), key=lambda x: (sort_key(x), x))
    all_names_folded = [sort_key(x) for x in all_names]

    def expansions_for(name: str) -> list[str]:
        key = sort_key(name)
        prefixes = [key + " ", key + "-", key + ",", key + " (", key + "/"]
        found = set()
        for pref in prefixes:
            lo = 0
            hi = len(all_names_folded)
            while lo < hi:
                mid = (lo + hi) // 2
                if all_names_folded[mid] < pref:
                    lo = mid + 1
                else:
                    hi = mid
            i = lo
            while i < len(all_names) and all_names_folded[i].startswith(pref):
                cand = all_names[i]
                if cand != name:
                    found.add(cand)
                i += 1
        return sorted(found, key=lambda x: (sort_key(x), x))

    if OUT_ROOT.exists():
        shutil.rmtree(OUT_ROOT)
    for ch in "abcdefghijklmnopqrstuvwxyz":
        (OUT_ROOT / ch).mkdir(parents=True, exist_ok=True)

    index_lines: list[str] = []
    written = 0
    for i, name in enumerate(all_names, start=1):
        rec = records_by_name[name]
        ids = sorted(rec["ids"], key=lambda x: tuple(int(p) for p in x.split(".")))
        variations = sorted(rec["variations"], key=lambda x: (sort_key(x), x))
        expansions = expansions_for(name)
        payload = make_payload(name, variations, ids, rec["idx_counter"], freq_by_idx, expansions)

        letter = bucket_letter(name)
        slug = slugify(name)
        out_path = OUT_ROOT / letter / f"{slug}.json"
        out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written += 1

        index_lines.append(
            f"{letter}/{slug}.json\t{name}\tids={len(ids)}\tvariations={len(variations)}\texpansions={len(expansions)}"
        )
        if i % 5000 == 0:
            print(f"written={i}")

    (OUT_ROOT / "INDEX_ALL.txt").write_text("\n".join(index_lines) + "\n", encoding="utf-8")
    summary = {
        "entries_written": written,
        "schema": str(ROOT / "schemas" / "ingredient-codex-flavor-bible.schema.json"),
        "output_root": str(OUT_ROOT),
        "last_updated": TODAY,
    }
    (OUT_ROOT / "SUMMARY.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

