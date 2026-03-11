import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import * as sqliteVec from "sqlite-vec";
import {
  insertCommits,
  insertCommitFiles,
  insertEmbeddings,
  searchEmbeddings,
  getCommitFiles,
  getCommitCount,
  getEmbeddingCount,
  type Commit,
  type CommitFile,
} from "./queries.ts";

// Must set custom SQLite before creating any Database instances
Database.setCustomSQLite("/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib");

function createTestDb(): Database {
  const db = new Database(":memory:");
  sqliteVec.load(db);

  db.run(`
    CREATE TABLE commits (
      hash TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      author_name TEXT,
      author_email TEXT,
      date INTEGER NOT NULL,
      parents TEXT
    )
  `);
  db.run(`
    CREATE TABLE commit_files (
      commit_hash TEXT NOT NULL REFERENCES commits(hash),
      file_path TEXT NOT NULL,
      status TEXT NOT NULL,
      PRIMARY KEY (commit_hash, file_path)
    )
  `);
  db.run(`
    CREATE VIRTUAL TABLE commit_embeddings USING vec0(
      commit_hash TEXT PRIMARY KEY,
      embedding float[384]
    )
  `);
  db.run(`
    CREATE TABLE meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  return db;
}

const testCommit: Commit = {
  hash: "abc1234567890",
  message: "feat: add authentication",
  author_name: "Alice",
  author_email: "alice@example.com",
  date: 1700000000,
  parents: "",
};

const testFiles: CommitFile[] = [
  { commit_hash: "abc1234567890", file_path: "src/auth.ts", status: "A" },
  { commit_hash: "abc1234567890", file_path: "src/app.ts", status: "M" },
];

describe("database queries", () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  test("insertCommits and getCommitCount", () => {
    expect(getCommitCount(db)).toBe(0);
    insertCommits(db, [testCommit]);
    expect(getCommitCount(db)).toBe(1);
  });

  test("insertCommits ignores duplicates", () => {
    insertCommits(db, [testCommit]);
    insertCommits(db, [testCommit]);
    expect(getCommitCount(db)).toBe(1);
  });

  test("insertCommitFiles and getCommitFiles", () => {
    insertCommits(db, [testCommit]);
    insertCommitFiles(db, testFiles);

    const files = getCommitFiles(db, "abc1234567890");
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.file_path).sort()).toEqual([
      "src/app.ts",
      "src/auth.ts",
    ]);
  });

  test("insertEmbeddings and searchEmbeddings", () => {
    insertCommits(db, [testCommit]);

    const embedding = new Float32Array(384).fill(0.1);
    insertEmbeddings(db, [
      { commit_hash: "abc1234567890", embedding },
    ]);
    expect(getEmbeddingCount(db)).toBe(1);

    const results = searchEmbeddings(db, embedding, 5);
    expect(results).toHaveLength(1);
    expect(results[0]!.hash).toBe("abc1234567890");
    expect(results[0]!.distance).toBe(0);
  });

  test("searchEmbeddings returns results ordered by distance", () => {
    const commit2: Commit = {
      ...testCommit,
      hash: "def9876543210",
      message: "fix: resolve login bug",
    };
    insertCommits(db, [testCommit, commit2]);

    const emb1 = new Float32Array(384).fill(0.1);
    const emb2 = new Float32Array(384).fill(0.5);
    insertEmbeddings(db, [
      { commit_hash: "abc1234567890", embedding: emb1 },
      { commit_hash: "def9876543210", embedding: emb2 },
    ]);

    // Query closer to emb1
    const query = new Float32Array(384).fill(0.12);
    const results = searchEmbeddings(db, query, 5);
    expect(results).toHaveLength(2);
    expect(results[0]!.hash).toBe("abc1234567890");
  });

  test("searchEmbeddings respects limit", () => {
    insertCommits(db, [testCommit]);
    const embedding = new Float32Array(384).fill(0.1);
    insertEmbeddings(db, [
      { commit_hash: "abc1234567890", embedding },
    ]);

    const results = searchEmbeddings(db, embedding, 0);
    expect(results).toHaveLength(0);
  });
});
