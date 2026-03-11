import type { SearchResult } from "../db/queries.ts";

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return "No results found.";
  }

  return results
    .map((r) => {
      const shortHash = r.hash.slice(0, 7);
      const firstLine = r.message.split("\n")[0];
      const date = new Date(r.date * 1000).toISOString().slice(0, 10);
      return `${shortHash} ${date} ${r.author_name} — ${firstLine}`;
    })
    .join("\n");
}
