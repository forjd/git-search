import type { Database } from "bun:sqlite";
import { embedText } from "../indexer/embedder.ts";
import { searchEmbeddings, type SearchResult } from "../db/queries.ts";

export type { SearchResult } from "../db/queries.ts";

export async function search(
  db: Database,
  query: string,
  limit: number = 20,
): Promise<SearchResult[]> {
  const queryEmbedding = await embedText(query);
  return searchEmbeddings(db, queryEmbedding, limit);
}
