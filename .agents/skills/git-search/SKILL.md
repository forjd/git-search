---
name: git-search
description: Use when needing to find relevant git commits by meaning — investigating what changed, finding related work, understanding history, or locating commits about a feature/bug/refactor. Requires @forjd/git-search to be installed.
---

# Git Search — Semantic Commit Search

## Overview

`git-search` finds commits by **meaning**, not keywords. "auth login" matches commits about "JWT authentication" and "session management". Uses local embeddings (no network calls).

## When to Use

- Finding commits related to a feature, bug, or area of code
- Investigating what changed and when (e.g., "when did we add rate limiting?")
- Understanding history before making changes to an area
- Locating prior art or similar changes for reference

**Don't use for:**
- Finding a specific commit by hash (use `git show`)
- Viewing recent commits (use `git log`)
- Blame/annotation (use `git blame`)

## Quick Reference

```bash
# Search with JSON output (best for agents)
git-search search "database migration" --json --limit 10

# Text output (human-readable)
git-search search "authentication changes" --limit 5

# Check index status
git-search status

# Force full reindex (if index seems stale/corrupted)
git-search reindex
```

## CLI Interface

### `git-search search <query> [--limit N] [--json]`

| Flag | Default | Description |
|------|---------|-------------|
| `--limit N` | 20 | Maximum results |
| `--json` | false | Structured JSON output |

**Always use `--json` when processing results programmatically.**

### JSON Output Shape

```json
[
  {
    "hash": "7a3f4c86d2f...",
    "message": "Add JWT authentication",
    "author_name": "Alice Smith",
    "author_email": "alice@example.com",
    "date": 1710115200,
    "distance": 0.15
  }
]
```

- `distance`: Vector distance (lower = more relevant, 0 = exact match)
- `date`: Unix timestamp
- `hash`: Full commit hash — use with `git show <hash>` for details

### First Run

The first search auto-indexes all commits (may take a moment). Subsequent runs are incremental — only new commits are indexed.

## Usage Patterns

### Investigate an area before changing it

```bash
git-search search "error handling in payment processing" --json --limit 5
```
Then `git show <hash>` on the most relevant results to understand prior decisions.

### Find related work across the repo

```bash
git-search search "rate limiting" --json --limit 10
```
Review results to see all areas where rate limiting was touched.

### Understand how something evolved

```bash
git-search search "user authentication flow" --json --limit 15
```
Sort by date to see the evolution of a feature.

## How Search Works

Each commit is embedded as `{message}\n\nFiles: {file1}, {file2}, ...` — search matches on both **message content** and **file paths**. Queries describing files or functionality both work.

## Prerequisites

- **Runtime**: [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`)
- **macOS**: Homebrew SQLite (`brew install sqlite`) — Apple's bundled SQLite disables extension loading required by sqlite-vec
- **Install**: `bun install -g @forjd/git-search`
- **Must be run inside a git repository**
- First run downloads ~300MB embedding model (cached automatically)
