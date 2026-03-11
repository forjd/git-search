import type { Database } from "bun:sqlite";

export interface Commit {
  hash: string;
  message: string;
  author_name: string;
  author_email: string;
  date: number;
  parents: string;
}

export interface CommitFile {
  commit_hash: string;
  file_path: string;
  status: string;
}

export interface SearchResult {
  hash: string;
  message: string;
  author_name: string;
  author_email: string;
  date: number;
  parents: string;
  distance: number;
}

export function insertCommits(db: Database, commits: Commit[]): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO commits (hash, message, author_name, author_email, date, parents)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const c of commits) {
      stmt.run(
        c.hash,
        c.message,
        c.author_name,
        c.author_email,
        c.date,
        c.parents,
      );
    }
  });
  tx();
}

export function insertCommitFiles(db: Database, files: CommitFile[]): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO commit_files (commit_hash, file_path, status)
    VALUES (?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const f of files) {
      stmt.run(f.commit_hash, f.file_path, f.status);
    }
  });
  tx();
}

export function insertEmbeddings(
  db: Database,
  embeddings: { commit_hash: string; embedding: Float32Array }[],
): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO commit_embeddings (commit_hash, embedding)
    VALUES (?, ?)
  `);

  const tx = db.transaction(() => {
    for (const e of embeddings) {
      stmt.run(e.commit_hash, e.embedding);
    }
  });
  tx();
}

export function searchEmbeddings(
  db: Database,
  queryEmbedding: Float32Array,
  limit: number = 20,
): SearchResult[] {
  return db
    .prepare(
      `
    SELECT
      c.hash, c.message, c.author_name, c.author_email, c.date, c.parents,
      e.distance
    FROM commit_embeddings e
    JOIN commits c ON c.hash = e.commit_hash
    WHERE e.embedding MATCH ? AND e.k = ?
    ORDER BY e.distance
  `,
    )
    .all(queryEmbedding, limit) as SearchResult[];
}

export function getCommitFiles(
  db: Database,
  commitHash: string,
): CommitFile[] {
  return db
    .prepare("SELECT * FROM commit_files WHERE commit_hash = ?")
    .all(commitHash) as CommitFile[];
}

export function getCommitCount(db: Database): number {
  const row = db.prepare("SELECT COUNT(*) as count FROM commits").get() as {
    count: number;
  };
  return row.count;
}

export function getEmbeddingCount(db: Database): number {
  const row = db
    .prepare("SELECT COUNT(*) as count FROM commit_embeddings")
    .get() as { count: number };
  return row.count;
}

export function getUntrackedCommitHashes(db: Database): Set<string> {
  const rows = db
    .prepare(
      `SELECT c.hash FROM commits c
       LEFT JOIN commit_embeddings e ON e.commit_hash = c.hash
       WHERE e.commit_hash IS NULL`,
    )
    .all() as { hash: string }[];
  return new Set(rows.map((r) => r.hash));
}
