import { Database } from "bun:sqlite";
import * as sqliteVec from "sqlite-vec";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const HOMEBREW_SQLITE_PATH = "/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib";

const SCHEMA_VERSION = 1;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS commits (
  hash TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  date INTEGER NOT NULL,
  parents TEXT
);

CREATE TABLE IF NOT EXISTS commit_files (
  commit_hash TEXT NOT NULL REFERENCES commits(hash),
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (commit_hash, file_path)
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

const VEC_TABLE_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS commit_embeddings USING vec0(
  commit_hash TEXT PRIMARY KEY,
  embedding float[384]
);
`;

let sqliteLoaded = false;

function ensureCustomSQLite(): void {
  if (sqliteLoaded) return;
  sqliteLoaded = true;

  if (existsSync(HOMEBREW_SQLITE_PATH)) {
    try {
      Database.setCustomSQLite(HOMEBREW_SQLITE_PATH);
    } catch {
      // Already loaded — fine
    }
  }
}

export function openDatabase(repoRoot: string): Database {
  ensureCustomSQLite();

  const dbDir = join(repoRoot, ".git-search");
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = join(dbDir, "index.db");
  const db = new Database(dbPath);

  sqliteVec.load(db);

  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");

  applyMigrations(db);

  return db;
}

function applyMigrations(db: Database): void {
  // Check if meta table exists
  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='meta'",
    )
    .get();

  if (!tableExists) {
    db.run(SCHEMA_SQL);
    db.run(VEC_TABLE_SQL);
    db.run("INSERT INTO meta (key, value) VALUES ('schema_version', ?)", [
      String(SCHEMA_VERSION),
    ]);
    return;
  }

  const row = db
    .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
    .get() as { value: string } | undefined;
  const currentVersion = row ? parseInt(row.value, 10) : 0;

  if (currentVersion < SCHEMA_VERSION) {
    // Future migrations go here
    db.run("UPDATE meta SET value = ? WHERE key = 'schema_version'", [
      String(SCHEMA_VERSION),
    ]);
  }
}

export function getMeta(db: Database, key: string): string | undefined {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setMeta(db: Database, key: string, value: string): void {
  db.run(
    "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
    [key, value],
  );
}
