# git-search

[![CI](https://github.com/forjd/git-search/actions/workflows/ci.yml/badge.svg)](https://github.com/forjd/git-search/actions/workflows/ci.yml)
[![Release](https://github.com/forjd/git-search/actions/workflows/release.yml/badge.svg)](https://github.com/forjd/git-search/actions/workflows/release.yml)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun&logoColor=000)](https://bun.sh)
[![SQLite](https://img.shields.io/badge/storage-SQLite-003B57?logo=sqlite&logoColor=fff)](https://www.sqlite.org)
[![Transformers.js](https://img.shields.io/badge/embeddings-Transformers.js-FFD21E?logo=huggingface&logoColor=000)](https://huggingface.co/docs/transformers.js)
[![Biome](https://img.shields.io/badge/linter-Biome-60a5fa?logo=biome&logoColor=fff)](https://biomejs.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/licence-MIT-green.svg)](LICENSE)

Semantic search over your git commit history, right in the terminal.

Type a natural language query and instantly find relevant commits — no need to remember exact messages, file names, or dates. Powered by local embeddings, everything stays on your machine.

## How it works

1. **Indexes** your commit history (messages + changed file paths)
2. **Embeds** each commit locally using [all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) via Transformers.js
3. **Stores** vectors in SQLite with [sqlite-vec](https://github.com/asg017/sqlite-vec)
4. **Searches** using vector similarity — no keywords needed

The index lives in `.git-search/` inside your repo and updates incrementally on each launch.

## Install

```bash
bun install -g @forjd/git-search
```

Or run directly:

```bash
bunx @forjd/git-search
```

## Usage

Run inside any git repository:

```bash
# Launch the search TUI (indexes on first run)
git-search

# Search from the command line (no TUI)
git-search search "auth login flow"

# Limit results and get JSON output
git-search search "database migration" --limit 5 --json

# Force a full re-index
git-search reindex

# Show index statistics
git-search status
```

### Keyboard shortcuts

| Key | Action |
|---|---|
| Type | Search commits |
| `Tab` / `Shift+Tab` | Switch between search and results |
| `↑` / `↓` | Navigate results |
| `Enter` | View commit details |
| `Escape` | Close detail / return to search |
| `q` | Quit |

## Requirements

- [Bun](https://bun.sh) runtime
- **macOS**: Homebrew SQLite (`brew install sqlite`) — Apple's bundled SQLite disables the extension loading that sqlite-vec needs
- **Linux**: Should work out of the box

## Development

```bash
bun install
bun run dev      # Run the TUI
bun test         # Run tests
```

## Architecture

```
src/
  index.ts           CLI entry point
  app.ts             TUI app composition & state

  db/
    database.ts      SQLite + sqlite-vec setup
    queries.ts       Insert/search helpers

  indexer/
    git.ts           Git log parsing
    embedder.ts      Transformers.js pipeline
    indexer.ts        Orchestration & progress

  search/
    search.ts        Query embedding + KNN search
    format.ts        CLI output formatting (text + JSON)

  views/
    indexing-screen  Progress bar during indexing
    search-input     Search bar
    results-list     Scrollable commit results
    commit-detail    Expanded commit view
    status-bar       Repo info & key hints
```

## Licence

[MIT](LICENSE) — Copyright (c) 2025 Forjd
