# World Ingredient Codex

Phase 2 now wires real hierarchy data into the existing Phase 1 foundation. The current asset is a raw hierarchy tree file, and E1-E24 categories are generated automatically only under D-level build units.

## Package naming proposal

Use `io.worldingredient.codex` as the long-term base package.

- `io.worldingredient.codex.app`
- `io.worldingredient.codex.core.model`
- `io.worldingredient.codex.core.database`
- `io.worldingredient.codex.core.navigation`
- `io.worldingredient.codex.core.ui`
- `io.worldingredient.codex.core.common`
- `io.worldingredient.codex.feature.browse`
- `io.worldingredient.codex.feature.search`
- `io.worldingredient.codex.feature.detail`
- `io.worldingredient.codex.feature.bookmarks`
- `io.worldingredient.codex.feature.import`

The existing source currently remains under `com.example.codex` to keep Phase 1 patch-first and avoid a broad rename before the real data pass.

## Module responsibilities

- `:app`: Android entrypoint, app shell, top-level navigation, dependency container.
- `:core:model`: Codex hierarchy models, import schema, E1-E24 category catalog, codex id helpers.
- `:core:database`: Room database, entities, DAOs, offline-first repository foundation.
- `:core:navigation`: Shared route definitions for the app shell and future deep links.
- `:core:ui`: Shared theme and lightweight placeholder/scaffold components.
- `:core:common`: Common coroutine and ViewModel helpers.
- `:feature:browse`: Real hierarchy browse flow for A/B/C/D and generated E categories.
- `:feature:search`: Minimal search UI over imported hierarchy/category records.
- `:feature:detail`: Detail placeholder and future ingredient/category detail host.
- `:feature:bookmarks`: Bookmark placeholder and local bookmark entrypoint.
- `:feature:import`: JSON contract loader and future import workflow host.

## Data foundation

- A-level through D-level hierarchy nodes are stored in `hierarchy_nodes`.
- E-level master categories are generated from the reusable E1-E24 catalog for every D-level build unit.
- F-level ingredients are stored in `ingredient_entries`.
- Local bookmarks are stored in `bookmarks`.
- Future-ready metadata tables exist for aliases, tags, citations, and cross-links.

## Import contract

The current import assets live at:

- `app/src/main/assets/codex_tree.txt` for the raw hierarchy tree
- `app/src/main/assets/codex_seed.json` as the schema-compatible JSON fallback

- `nodes` is for A-D hierarchy records.
- `categories` is optional override data for generated E1-E24 categories.
- `ingredients` is for F-level ingredient entries.
- `aliases`, `tags`, `citations`, and `crossLinks` are additive metadata feeds.

## Current imported tree

The asset now contains the full user-provided world hierarchy across macro areas `1` through `9`, with explicit A, B, C, and D records preserved exactly as lines in `codex_tree.txt`.

## Next data layer

When the next data layer arrives:

1. Append real F-level ingredient entries under existing E-category codex ids.
2. Add aliases, tags, citations, and cross-links through the existing import schema.
3. Replace the detail placeholder with real ingredient/category detail rendering.
