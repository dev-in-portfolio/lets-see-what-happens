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
