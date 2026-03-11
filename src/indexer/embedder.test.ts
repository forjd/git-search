import { describe, expect, test } from "bun:test";
import { composeEmbeddingText } from "./embedder.ts";

describe("composeEmbeddingText", () => {
  test("combines message and file paths", () => {
    const result = composeEmbeddingText("feat: add auth", [
      "src/auth.ts",
      "src/middleware.ts",
    ]);
    expect(result).toBe("feat: add auth\n\nFiles: src/auth.ts, src/middleware.ts");
  });

  test("returns just message when no files", () => {
    const result = composeEmbeddingText("initial commit", []);
    expect(result).toBe("initial commit");
  });

  test("handles single file", () => {
    const result = composeEmbeddingText("fix bug", ["index.ts"]);
    expect(result).toBe("fix bug\n\nFiles: index.ts");
  });
});
