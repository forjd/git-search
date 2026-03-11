# git-search

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
bun install -g git-search
```

Or run directly:

```bash
bunx git-search
```

## Usage

Run inside any git repository:

```bash
# Launch the search TUI (indexes on first run)
git-search

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

  views/
    indexing-screen  Progress bar during indexing
    search-input     Search bar
    results-list     Scrollable commit results
    commit-detail    Expanded commit view
    status-bar       Repo info & key hints
```

## Licence

Private — internal use only.
