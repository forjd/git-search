import {
  BoxRenderable,
  TextRenderable,
  ScrollBoxRenderable,
  t,
  bold,
  dim,
  fg,
  type RenderContext,
} from "@opentui/core";
import type { Database } from "bun:sqlite";
import { getCommitFiles, type SearchResult } from "../db/queries.ts";

export class CommitDetail {
  readonly container: BoxRenderable;
  private scrollBox: ScrollBoxRenderable;
  private contentBox: BoxRenderable;
  private ctx: RenderContext;

  constructor(ctx: RenderContext) {
    this.ctx = ctx;

    this.container = new BoxRenderable(ctx, {
      id: "commit-detail",
      flexGrow: 1,
      flexDirection: "column",
      border: true,
      borderStyle: "rounded",
      borderColor: "#414868",
      marginTop: 1,
      marginLeft: 1,
      visible: false,
    });

    this.scrollBox = new ScrollBoxRenderable(ctx, {
      id: "detail-scroll",
      flexGrow: 1,
    });

    this.contentBox = new BoxRenderable(ctx, {
      id: "detail-content",
      flexDirection: "column",
      padding: 1,
    });

    this.scrollBox.add(this.contentBox);
    this.container.add(this.scrollBox);
  }

  show(result: SearchResult, db: Database): void {
    // Clear existing content
    const children = this.contentBox.getChildren();
    for (const child of children) {
      child.destroy();
    }

    const date = new Date(result.date * 1000);
    const dateStr = date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Header
    this.contentBox.add(
      new TextRenderable(this.ctx, {
        content: t`${bold(fg("#bb9af7")(`commit ${result.hash}`))}`,
      }),
    );
    this.contentBox.add(
      new TextRenderable(this.ctx, {
        content: t`${dim("Author:")} ${result.author_name} <${result.author_email}>`,
      }),
    );
    this.contentBox.add(
      new TextRenderable(this.ctx, {
        content: t`${dim("Date:")}   ${dateStr}`,
      }),
    );

    if (result.parents) {
      const parentHashes = result.parents
        .split(" ")
        .map((h) => h.slice(0, 7))
        .join(", ");
      this.contentBox.add(
        new TextRenderable(this.ctx, {
          content: t`${dim("Parents:")} ${parentHashes}`,
        }),
      );
    }

    // Message
    this.contentBox.add(
      new TextRenderable(this.ctx, {
        content: "",
        height: 1,
      }),
    );
    this.contentBox.add(
      new TextRenderable(this.ctx, {
        content: `    ${result.message}`,
      }),
    );

    // Files
    const files = getCommitFiles(db, result.hash);
    if (files.length > 0) {
      this.contentBox.add(
        new TextRenderable(this.ctx, {
          content: "",
          height: 1,
        }),
      );
      this.contentBox.add(
        new TextRenderable(this.ctx, {
          content: t`${dim(`${files.length} file${files.length === 1 ? "" : "s"} changed:`)}`,
        }),
      );

      for (const file of files) {
        const statusColour =
          file.status === "A"
            ? "#9ece6a"
            : file.status === "D"
              ? "#f7768e"
              : file.status === "R"
                ? "#e0af68"
                : "#7aa2f7";
        this.contentBox.add(
          new TextRenderable(this.ctx, {
            content: t`  ${fg(statusColour)(file.status)}  ${file.file_path}`,
          }),
        );
      }
    }

    this.container.visible = true;
    this.scrollBox.scrollTo(0);
  }

  hide(): void {
    this.container.visible = false;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }
}
