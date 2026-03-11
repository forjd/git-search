# AGENTS.md

Instructions for AI coding agents working with this codebase.

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->

## Development

- Runtime: **Bun** (not Node). Use `bun:sqlite`, `bun:test`, `Bun.spawn()` etc.
- Tests: `bun test` — test root is `./src` (set in `bunfig.toml` to exclude `opensrc/` tests)
- TUI framework: OpenTUI (`@opentui/core`) — component source is in `opensrc/` if you need to understand internals

## Key Gotchas

### sqlite-vec

- **macOS**: Apple's bundled SQLite disables extension loading. We use Homebrew's SQLite via `Database.setCustomSQLite()`. The path is hardcoded to `/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib`.
- `setCustomSQLite()` can only be called **once** and **before** any Database is opened. The guard in `database.ts` handles this.
- KNN queries require `e.k = ?` in the WHERE clause — a bare `LIMIT ?` is not sufficient for vec0 virtual tables.

### Transformers.js

- Model: `Xenova/all-MiniLM-L6-v2` (384-dim embeddings). Downloaded and cached automatically on first run.
- Batch size of 32 for embedding generation.

### TypeScript

- `bunx tsc --noEmit` will stack-overflow on OpenTUI's deeply-nested types. This is a known upstream issue — don't chase it. Bun's own type checking works fine at runtime.

## Architecture Notes

- Index stored in `.git-search/index.db` inside the repo (gitignored)
- Incremental indexing: tracks `last_indexed_hash` in the `meta` table, only processes new commits on subsequent runs
- Each commit is embedded as `{message}\n\nFiles: {file1}, {file2}, ...` — search matches on both message content and file paths
- TUI uses direct `Renderable` instantiation (not the JSX-like construct helpers) for state management
