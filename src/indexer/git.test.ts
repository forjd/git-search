import { describe, expect, test } from "bun:test";
import { parseGitLog } from "./git.ts";

const FIELD_SEP = "\x1f";
const RECORD_SEP = "\x1e";

describe("parseGitLog", () => {
  test("parses a single commit with files", () => {
    const output = [
      `${RECORD_SEP}abc1234${FIELD_SEP}feat: add login${FIELD_SEP}Alice${FIELD_SEP}alice@example.com${FIELD_SEP}1700000000${FIELD_SEP}def5678`,
      "A\tsrc/login.ts",
      "M\tsrc/app.ts",
    ].join("\n");

    const results = parseGitLog(output);

    expect(results).toHaveLength(1);
    expect(results[0]!.commit).toEqual({
      hash: "abc1234",
      message: "feat: add login",
      author_name: "Alice",
      author_email: "alice@example.com",
      date: 1700000000,
      parents: "def5678",
    });
    expect(results[0]!.files).toEqual([
      { commit_hash: "abc1234", file_path: "src/login.ts", status: "A" },
      { commit_hash: "abc1234", file_path: "src/app.ts", status: "M" },
    ]);
  });

  test("parses multiple commits", () => {
    const output = [
      `${RECORD_SEP}aaa${FIELD_SEP}first${FIELD_SEP}Bob${FIELD_SEP}bob@x.com${FIELD_SEP}1700000000${FIELD_SEP}`,
      "A\tREADME.md",
      "",
      `${RECORD_SEP}bbb${FIELD_SEP}second${FIELD_SEP}Bob${FIELD_SEP}bob@x.com${FIELD_SEP}1700000100${FIELD_SEP}aaa`,
      "M\tREADME.md",
    ].join("\n");

    const results = parseGitLog(output);

    expect(results).toHaveLength(2);
    expect(results[0]!.commit.hash).toBe("aaa");
    expect(results[1]!.commit.hash).toBe("bbb");
  });

  test("handles renames (R status with two paths)", () => {
    const output = [
      `${RECORD_SEP}ccc${FIELD_SEP}rename file${FIELD_SEP}Eve${FIELD_SEP}eve@x.com${FIELD_SEP}1700000200${FIELD_SEP}bbb`,
      "R100\told/path.ts\tnew/path.ts",
    ].join("\n");

    const results = parseGitLog(output);

    expect(results[0]!.files).toEqual([
      { commit_hash: "ccc", file_path: "new/path.ts", status: "R" },
    ]);
  });

  test("handles empty output", () => {
    expect(parseGitLog("")).toEqual([]);
    expect(parseGitLog("   \n  ")).toEqual([]);
  });

  test("handles commit with no files", () => {
    const output = `${RECORD_SEP}ddd${FIELD_SEP}empty commit${FIELD_SEP}Dan${FIELD_SEP}dan@x.com${FIELD_SEP}1700000300${FIELD_SEP}ccc`;

    const results = parseGitLog(output);

    expect(results).toHaveLength(1);
    expect(results[0]!.files).toEqual([]);
  });
});
