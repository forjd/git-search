#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { getGitRoot, getTotalCommitCount } from "./indexer/git.ts";
import { openDatabase } from "./db/database.ts";
import { getCommitCount, getEmbeddingCount } from "./db/queries.ts";
import { reindex, runIndex } from "./indexer/indexer.ts";
import { App } from "./app.ts";

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
        const pct = Math.round(
          (progress.current / progress.total) * 100,
        );
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

  if (command && command !== "--help") {
    console.error(`Unknown command: ${command}`);
    console.error("Usage: forjd-git-search [reindex|status]");
    process.exit(1);
  }

  if (command === "--help") {
    console.log("Usage: forjd-git-search [command]");
    console.log("");
    console.log("Commands:");
    console.log("  (none)     Launch search TUI (indexes if needed)");
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
