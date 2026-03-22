# UHAG

UHAG is an archive-first gallery app for images that survived in partial, degraded, or uncertain form. It keeps metadata in local JSON, supports admin uploads with private originals + public watermarked derivatives, and can still read legacy originals from Backblaze B2.

## Scripts

- `npm run dev` starts the Vite frontend on port `4173`
- `npm run api` starts the API server on port `8787`
- `npm run import:b2` refreshes archive metadata from the configured Backblaze bucket
- `npm run build` builds the frontend
- `npm run serve` serves the production build and API from one process
- `npm run cap:sync` syncs the built web app into Capacitor
- `npm run android:add` creates the Android project
- `npm run android:open` opens the Android project

## Environment

Copy `.env.example` to `.env` and supply the Backblaze credentials for a private B2 bucket. The frontend never sees those secrets. It only asks the API for a short-lived asset URL.

For admin uploads, set `ADMIN_TOKEN`. Admin routes require `Authorization: Bearer <ADMIN_TOKEN>` (or `x-admin-token`). Uploaded files are processed into:

- `storage/private/originals` (never public)
- `storage/public/watermarked` (public gallery asset)
- `storage/public/thumbs` (public preview)

`WATERMARK_TEXT` controls the text stamped onto public derivatives.

Set `VITE_API_BASE` when the frontend is not sharing origin with the API. For local web development, `http://localhost:8787` is enough. For Android emulators, use the emulator-visible host for the machine running the API.

## Data

- `data/images.json` stores image records and preferred rotation
- `data/collections.json` stores incomplete collections and ordering

The seed data is intentionally fragmentary. It models missing dates, provenance, and partial recovery instead of pretending the archive is complete.

When new images land in the configured bucket, run `npm run import:b2` to regenerate the local archive metadata from Backblaze.

## New Endpoints

- `POST /api/admin/images/upload` multipart upload (`image`, optional `title`, `notes`, `collectionIds`)
- `PATCH /api/admin/images/:id` admin metadata update
- `DELETE /api/admin/images/:id` admin delete (metadata + local derivatives/original)
- `GET /api/admin/images/:id/original-url` admin-only original access info
- `GET /api/gallery/images` public gallery list
- `GET /api/gallery/images/:id` public single image record
- `GET /admin/upload` basic web upload form
