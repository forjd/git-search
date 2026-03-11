import type { Database } from "bun:sqlite";
import { getMeta, setMeta } from "../db/database.ts";
import {
  insertCommits,
  insertCommitFiles,
  insertEmbeddings,
} from "../db/queries.ts";
import {
  readCommits,
  getLatestCommitHash,
  type GitCommitWithFiles,
} from "./git.ts";
import { loadModel, embedTexts, composeEmbeddingText } from "./embedder.ts";

export type IndexPhase =
  | "loading_model"
  | "reading_git"
  | "embedding"
  | "storing"
  | "complete";

export interface IndexProgress {
  phase: IndexPhase;
  current: number;
  total: number;
}

export type ProgressCallback = (progress: IndexProgress) => void;

const EMBED_BATCH_SIZE = 32;

export async function runIndex(
  db: Database,
  onProgress?: ProgressCallback,
): Promise<{ indexed: number; total: number }> {
  const lastIndexedHash = getMeta(db, "last_indexed_hash");
  const latestHash = await getLatestCommitHash();

  if (!latestHash) {
    return { indexed: 0, total: 0 };
  }

  // Already up to date
  if (lastIndexedHash === latestHash) {
    return { indexed: 0, total: 0 };
  }

  // Phase 1: Load model
  onProgress?.({ phase: "loading_model", current: 0, total: 0 });
  await loadModel();

  // Phase 2: Read git log
  onProgress?.({ phase: "reading_git", current: 0, total: 0 });
  const commitData = await readCommits(lastIndexedHash || undefined);

  if (commitData.length === 0) {
    setMeta(db, "last_indexed_hash", latestHash);
    return { indexed: 0, total: 0 };
  }

  const total = commitData.length;

  // Phase 3: Store commit data
  onProgress?.({ phase: "storing", current: 0, total });
  const allCommits = commitData.map((c) => c.commit);
  const allFiles = commitData.flatMap((c) => c.files);
  insertCommits(db, allCommits);
  insertCommitFiles(db, allFiles);

  // Phase 4: Embed and store
  let embedded = 0;
  for (let i = 0; i < commitData.length; i += EMBED_BATCH_SIZE) {
    const batch = commitData.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((c) =>
      composeEmbeddingText(
        c.commit.message,
        c.files.map((f) => f.file_path),
      ),
    );

    onProgress?.({ phase: "embedding", current: embedded, total });
    const embeddings = await embedTexts(texts);

    const embeddingRows = batch.map((c, j) => ({
      commit_hash: c.commit.hash,
      embedding: embeddings[j]!,
    }));
    insertEmbeddings(db, embeddingRows);

    embedded += batch.length;
  }

  onProgress?.({ phase: "complete", current: total, total });
  setMeta(db, "last_indexed_hash", latestHash);

  return { indexed: total, total };
}

export async function reindex(
  db: Database,
  onProgress?: ProgressCallback,
): Promise<{ indexed: number; total: number }> {
  // Clear existing data
  db.run("DELETE FROM commit_embeddings");
  db.run("DELETE FROM commit_files");
  db.run("DELETE FROM commits");
  db.run("DELETE FROM meta WHERE key = 'last_indexed_hash'");

  return runIndex(db, onProgress);
}
