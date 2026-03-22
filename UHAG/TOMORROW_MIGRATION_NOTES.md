# Tomorrow Migration Notes (B2 -> UHAG Storage)

## Current status
- Migration script is ready and resume-safe:
  - `scripts/migrate_b2_to_storage.mjs`
- Current migration progress from `data/images.json`:
  - total: `214`
  - migrated: `45`
  - remaining: `169`
- Backblaze cap starts failing after partial batches with:
  - `403 download_cap_exceeded`
- Watermark pipeline bug is fixed (rotate/thumbnail composite sizing) in:
  - `scripts/migrate_b2_to_storage.mjs`
  - `server.mjs`
- Memory lineup work completed for labels `1-45` with user-driven collection naming.

## What is already safe
- Script skips images already migrated (`originalKey`, `watermarkedKey`, `thumbKey` present).
- Script checkpoints `data/images.json` after each successful image.
- Script continues on per-image errors instead of stopping the whole run.
- Script writes failures to:
  - `data/migration-failures.json`

## Tomorrow steps
1. Ensure Backblaze download cap is reset/increased.
2. Run:
   - `cd /root/lets-see-what-happens/UHAG`
   - `node scripts/migrate_b2_to_storage.mjs`
3. Watch summary output (`migrated/skipped/failed`).
4. Inspect failures:
   - `cat data/migration-failures.json`
5. Rebuild stack labels after new migrations if needed:
   - `node scripts/build_memory_stack.mjs`
6. Reapply user memory notes if stack ordering changes:
   - `node scripts/apply_memory_notes.mjs`

## Local storage layout after migration
- Private originals: `storage/private/originals/`
- Public watermarked: `storage/public/watermarked/`
- Public thumbs: `storage/public/thumbs/`

## Quick local checks
- API health: `http://localhost:8787/api/health`
- Admin upload UI: `http://localhost:8787/admin/upload`
- Example public asset path: `http://localhost:8787/media/watermarked/<image-id>.jpg`
