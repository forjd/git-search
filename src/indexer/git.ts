import type { Commit, CommitFile } from "../db/queries.ts";

const FIELD_SEP = "\x1f"; // ASCII unit separator
const RECORD_SEP = "\x1e"; // ASCII record separator

const LOG_FORMAT = [
  "%H", // hash
  "%s", // subject (first line of message)
  "%an", // author name
  "%ae", // author email
  "%at", // author date (unix timestamp)
  "%P", // parent hashes (space-separated)
].join(FIELD_SEP);

export interface GitCommitWithFiles {
  commit: Commit;
  files: CommitFile[];
}

export async function getGitRoot(): Promise<string | null> {
  const proc = Bun.spawn(["git", "rev-parse", "--show-toplevel"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) return null;
  return (await new Response(proc.stdout).text()).trim();
}

export async function getTotalCommitCount(): Promise<number> {
  const proc = Bun.spawn(["git", "rev-list", "--count", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  const output = (await new Response(proc.stdout).text()).trim();
  return parseInt(output, 10) || 0;
}

export async function getLatestCommitHash(): Promise<string | null> {
  const proc = Bun.spawn(["git", "rev-parse", "HEAD"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) return null;
  return (await new Response(proc.stdout).text()).trim();
}

export async function readCommits(
  sinceHash?: string,
): Promise<GitCommitWithFiles[]> {
  const args = [
    "git",
    "log",
    `--format=${RECORD_SEP}${LOG_FORMAT}`,
    "--name-status",
  ];
  if (sinceHash) {
    args.push(`${sinceHash}..HEAD`);
  }

  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.exited;
  const output = await new Response(proc.stdout).text();

  return parseGitLog(output);
}

export function parseGitLog(output: string): GitCommitWithFiles[] {
  const results: GitCommitWithFiles[] = [];

  // Split on record separator, filter empty
  const records = output.split(RECORD_SEP).filter((r) => r.trim());

  for (const record of records) {
    const lines = record.trim().split("\n");
    if (lines.length === 0) continue;

    // First line contains the formatted commit fields
    const fields = lines[0]!.split(FIELD_SEP);
    if (fields.length < 5) continue;

    const [hash, message, authorName, authorEmail, dateStr, parentsStr] =
      fields;

    const commit: Commit = {
      hash: hash!,
      message: message!,
      author_name: authorName!,
      author_email: authorEmail!,
      date: parseInt(dateStr!, 10),
      parents: parentsStr ?? "",
    };

    // Remaining lines are file status entries (tab-separated: status\tpath)
    const files: CommitFile[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;

      const parts = line.split("\t");
      if (parts.length < 2) continue;

      const status = parts[0]!.charAt(0); // Just first char (R100 → R)
      const filePath = parts.length === 3 ? parts[2]! : parts[1]!; // For renames, use new path

      files.push({
        commit_hash: hash!,
        file_path: filePath,
        status,
      });
    }

    results.push({ commit, files });
  }

  return results;
}
