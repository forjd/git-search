import {
  BoxRenderable,
  TextRenderable,
  t,
  dim,
  fg,
  bg,
  type RenderContext,
} from "@opentui/core";

export class StatusBar {
  readonly container: BoxRenderable;
  private leftText: TextRenderable;
  private rightText: TextRenderable;

  constructor(ctx: RenderContext) {
    this.container = new BoxRenderable(ctx, {
      id: "status-bar",
      flexDirection: "row",
      justifyContent: "space-between",
      height: 1,
      width: "100%",
      backgroundColor: "#1f2335",
    });

    this.leftText = new TextRenderable(ctx, {
      content: "",
      flexGrow: 1,
    });

    this.rightText = new TextRenderable(ctx, {
      content: t`${dim("↑↓ navigate  enter select  esc back  q quit")}`,
    });

    this.container.add(this.leftText);
    this.container.add(this.rightText);
  }

  setRepoInfo(repoName: string, commitCount: number): void {
    this.leftText.content = t`${fg("#7aa2f7")(repoName)} ${dim(`${commitCount} commits indexed`)}`;
  }
}
