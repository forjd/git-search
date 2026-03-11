import {
  BoxRenderable,
  TextRenderable,
  t,
  bold,
  dim,
  fg,
  type RenderContext,
} from "@opentui/core";
import type { IndexProgress } from "../indexer/indexer.ts";

const PHASE_LABELS: Record<string, string> = {
  loading_model: "Loading embedding model…",
  reading_git: "Reading git history…",
  embedding: "Generating embeddings…",
  storing: "Storing commit data…",
  complete: "Indexing complete!",
};

export class IndexingScreen {
  readonly container: BoxRenderable;
  private titleText: TextRenderable;
  private phaseText: TextRenderable;
  private progressText: TextRenderable;
  private barText: TextRenderable;

  constructor(ctx: RenderContext) {
    this.container = new BoxRenderable(ctx, {
      id: "indexing-screen",
      flexGrow: 1,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    });

    this.titleText = new TextRenderable(ctx, {
      content: t`${bold("forjd-git-search")}`,
    });

    this.phaseText = new TextRenderable(ctx, {
      content: t`${dim("Preparing…")}`,
      marginTop: 1,
    });

    this.barText = new TextRenderable(ctx, {
      content: "",
      marginTop: 1,
    });

    this.progressText = new TextRenderable(ctx, {
      content: "",
    });

    this.container.add(this.titleText);
    this.container.add(this.phaseText);
    this.container.add(this.barText);
    this.container.add(this.progressText);
  }

  update(progress: IndexProgress): void {
    const label = PHASE_LABELS[progress.phase] ?? progress.phase;
    this.phaseText.content = t`${fg("#7aa2f7")(label)}`;

    if (progress.total > 0) {
      const pct = Math.round((progress.current / progress.total) * 100);
      const barWidth = 40;
      const filled = Math.round((progress.current / progress.total) * barWidth);
      const empty = barWidth - filled;
      const bar = "█".repeat(filled) + "░".repeat(empty);

      this.barText.content = t`${fg("#7aa2f7")(bar)}`;
      this.progressText.content = t`${dim(`${progress.current}/${progress.total} commits (${pct}%)`)}`;
    }
  }
}
