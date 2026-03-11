#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { App } from "./app.ts";
import { openDatabase } from "./db/database.ts";
import { getCommitCount, getEmbeddingCount } from "./db/queries.ts";
import { getGitRoot, getTotalCommitCount } from "./indexer/git.ts";
import { reindex, runIndex } from "./indexer/indexer.ts";
import {
  formatSearchResults,
  formatSearchResultsJson,
} from "./search/format.ts";
import { search } from "./search/search.ts";

const command = process.argv[2];

async function main(): Promise<void> {
  const repoRoot = await getGitRoot();
  if (!repoRoot) {
    console.error("Error: not a git repository (or any parent up to /)");
    process.exit(1);
  }

  const totalCommits = await getTotalCommitCount();
  if (totalCommits === 0) {
    console.error("Error: repository has no commits");
    process.exit(1);
  }

  if (command === "status") {
    const db = openDatabase(repoRoot);
    const indexed = getCommitCount(db);
    const embedded = getEmbeddingCount(db);
    console.log(`Repository: ${repoRoot}`);
    console.log(`Total commits: ${totalCommits}`);
    console.log(`Indexed commits: ${indexed}`);
    console.log(`Embedded commits: ${embedded}`);
    db.close();
    return;
  }

  if (command === "reindex") {
    const db = openDatabase(repoRoot);
    console.log("Re-indexing all commits…");
    const result = await reindex(db, (progress) => {
      if (progress.total > 0) {
        const pct = Math.round((progress.current / progress.total) * 100);
        process.stdout.write(
          `\r${progress.phase}: ${progress.current}/${progress.total} (${pct}%)`,
        );
      } else {
        process.stdout.write(`\r${progress.phase}…`);
      }
    });
    console.log(`\nDone. Indexed ${result.indexed} commits.`);
    db.close();
    return;
  }

  if (command === "search") {
    const args = process.argv.slice(3);
    const jsonFlag = args.includes("--json");
    let limit = 20;
    const limitIdx = args.indexOf("--limit");
    if (limitIdx !== -1) {
      const val = Number(args[limitIdx + 1]);
      if (!Number.isFinite(val) || val < 1) {
        console.error("Error: --limit requires a positive number");
        process.exit(1);
      }
      limit = val;
    }

    const query = args
      .filter((a, i) => a !== "--json" && a !== "--limit" && i !== limitIdx + 1)
      .join(" ");

    if (!query) {
      console.error("Usage: git-search search <query> [--limit N] [--json]");
      process.exit(1);
    }

    const db = openDatabase(repoRoot);
    const embedded = getEmbeddingCount(db);
    if (embedded === 0) {
      console.error("Index is empty. Run `git-search reindex` first.");
      db.close();
      process.exit(1);
    }

    await runIndex(db, (progress) => {
      if (progress.total > 0) {
        const pct = Math.round((progress.current / progress.total) * 100);
        process.stderr.write(
          `\r${progress.phase}: ${progress.current}/${progress.total} (${pct}%)`,
        );
      }
    });

    const results = await search(db, query, limit);
    console.log(
      jsonFlag
        ? formatSearchResultsJson(results)
        : formatSearchResults(results),
    );
    db.close();
    return;
  }

  if (command && command !== "--help") {
    console.error(`Unknown command: ${command}`);
    console.error("Usage: git-search [search|reindex|status]");
    process.exit(1);
  }

  if (command === "--help") {
    console.log("Usage: git-search [command]");
    console.log("");
    console.log("Commands:");
    console.log("  (none)     Launch search TUI (indexes if needed)");
    console.log(
      "  search     Search commits (e.g. git-search search auth flow --limit 10 --json)",
    );
    console.log("  reindex    Force full re-index");
    console.log("  status     Show index statistics");
    console.log("  --help     Show this help");
    return;
  }

  // Default: launch TUI
  const db = openDatabase(repoRoot);
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    useAlternateScreen: true,
  });

  const app = new App(renderer, db, repoRoot);
  await app.start();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
