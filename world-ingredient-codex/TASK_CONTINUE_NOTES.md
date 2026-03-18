# Ingredients Codex Continue Notes

## Current state

- Fresh bulk-ingest tooling is in place.
- Existing `ingredients/*.json` files were not rewritten in this prep pass.
- The current dataset still contains known corruption from the older ingest path.
- User preference: for all future data additions, ignore hierarchy constraints and import provided build-unit data as-is (including IDs not present in `hierarchy.json`).

## Key scripts

- `python3 scripts/import_bulk_ingredient_text.py INPUT.txt`
  - Dry-run parser for fresh uploads.
- `python3 scripts/import_bulk_ingredient_text.py INPUT.txt --write`
  - Rewrites only touched build-unit JSON files with canonical IDs and sort order.
- `python3 scripts/validate_ingredient_files.py`
  - Full-dataset validator against `hierarchy.json`.
- `python3 scripts/validate_ingredient_files.py --loose`
  - Validator for the current ingest policy that allows out-of-hierarchy build units/categories while still enforcing schema, id, and sort-order integrity.
- `python3 scripts/normalize_ingredient_files.py`
  - Backfills missing files and re-canonicalizes IDs and sort order.

## Input contract

- D-level header format: `buildUnitId` plus the exact D-level build unit name.
- E-level header format: `parentCategoryId` plus the exact E-level category name.
- Ingredient lines may be plain text or bullets beginning with `-`, `*`, or `•`.
- Do not include embedded codex headings inside ingredient lines.

## Known old-data issues

- `ingredients/1.1.6.2.json`
  - Contains a narrative junk entry with embedded heading text.
- `ingredients/1.1.8.1.json`
  - Contains one contaminated entry name and a long canonical-ID drift cascade after it.

## Recommended next step

1. Save each new upload batch as a plain text file using the documented format.
2. Run the importer in dry-run mode and review the touched file summary.
3. Re-run with `--write` once the summary looks correct.
4. Run the validator immediately after each write batch.

## Latest progress

- `TMP_BATCH_08_RAW.txt` has been imported with:
  - `python3 scripts/import_bulk_ingredient_text_loose.py TMP_BATCH_08_RAW.txt --write`
- Touched build units:
  - `1.2.6.1` through `1.2.6.6`
  - `1.2.7.1` through `1.2.7.6`
- Post-import validation passed with:
  - `python3 scripts/validate_ingredient_files.py --loose`

## Flavor-Bible WIP (Continuation)

- JSON schema added at:
  - `schemas/ingredient-codex-flavor-bible.schema.json`
- New generation scripts added:
  - `scripts/generate_flavor_bible_entries_from_az.py`
  - `scripts/clean_and_generate_flavor_bible_entries.py`
  - `scripts/build_flavor_bible_entries.py`
- Current output directories:
  - `ingredients/a-z/` (per-ingredient folders with `name.txt`, `variations.txt`, `expansions.txt`, `ids.txt`)
  - `flavor_bible_entries/a-z/` (schema-style JSON entries generated from core data)

### Current quality status

- Flavor-Bible entries are populated with real structural data:
  - primary names, IDs, variations, expansions, inferred category, and frequency-derived pairing candidates.
- Deep narrative/culinary fields are still scaffold-level and need curation.
- Some contamination cleanup remains needed for heading-like pseudo-ingredients in legacy source data.

### Resume commands

1. Rebuild/refresh flavor entries:
   - `python3 scripts/build_flavor_bible_entries.py`
2. Spot-check generated output:
   - `find flavor_bible_entries/a-z -type f -name '*.json' | head -n 5`
3. Check summary:
   - `cat flavor_bible_entries/a-z/SUMMARY.json`

## Seamless handoff checklist

1. Confirm branch and cleanliness:
   - `git branch --show-current`
   - `git status --short`
2. Verify generated entry count:
   - `wc -l flavor_bible_entries/a-z/INDEX_ALL.txt`
3. Search for heading/location contamination to clean next:
   - `rg -n "\"primary_name\": \"[0-9]+\\." flavor_bible_entries/a-z | head`
4. After cleanup pass, rebuild summary/index if needed and commit:
   - `python3 scripts/build_flavor_bible_entries.py`
