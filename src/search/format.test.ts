import { describe, expect, test } from "bun:test";
import type { SearchResult } from "../db/queries.ts";
import { formatSearchResults } from "./format.ts";

const result1: SearchResult = {
  hash: "abc1234567890abcdef1234567890abcdef123456",
  message: "feat: add authentication flow",
  author_name: "Alice",
  author_email: "alice@example.com",
  date: 1700000000,
  parents: "",
  distance: 0.25,
};

const result2: SearchResult = {
  hash: "def9876543210fedcba9876543210fedcba987654",
  message: "fix: resolve login bug\n\nThis fixes the issue where users\ncould not log in with SSO.",
  author_name: "Bob",
  author_email: "bob@example.com",
  date: 1700100000,
  parents: "abc1234567890abcdef1234567890abcdef123456",
  distance: 0.42,
};

describe("formatSearchResults", () => {
  test("formats empty results", () => {
    const output = formatSearchResults([]);
    expect(output).toBe("No results found.");
  });

  test("formats a single result with short hash and first line of message", () => {
    const output = formatSearchResults([result1]);
    expect(output).toContain("abc1234");
    expect(output).toContain("feat: add authentication flow");
    expect(output).toContain("Alice");
  });

  test("uses only first line of multi-line commit messages", () => {
    const output = formatSearchResults([result2]);
    expect(output).toContain("fix: resolve login bug");
    expect(output).not.toContain("This fixes the issue");
  });

  test("formats multiple results", () => {
    const output = formatSearchResults([result1, result2]);
    const lines = output.split("\n").filter((l) => l.trim());
    // Should have at least 2 result lines
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  test("includes date", () => {
    const output = formatSearchResults([result1]);
    // 1700000000 = 2023-11-14
    expect(output).toContain("2023");
  });
});
