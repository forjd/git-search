import {
  BoxRenderable,
  InputRenderable,
  InputRenderableEvents,
  TextRenderable,
  t,
  fg,
  dim,
  type RenderContext,
} from "@opentui/core";

export class SearchInput {
  readonly container: BoxRenderable;
  readonly input: InputRenderable;

  constructor(ctx: RenderContext) {
    this.container = new BoxRenderable(ctx, {
      id: "search-bar",
      flexDirection: "row",
      height: 1,
      width: "100%",
    });

    const label = new TextRenderable(ctx, {
      content: t`${fg("#7aa2f7")("❯")} `,
      width: 2,
    });

    this.input = new InputRenderable(ctx, {
      id: "search-input",
      placeholder: "Search commits…",
      placeholderColor: "#565f89",
      flexGrow: 1,
      textColor: "#c0caf5",
      backgroundColor: "#1a1b26",
      focusedBackgroundColor: "#1a1b26",
      focusedTextColor: "#c0caf5",
    });

    this.container.add(label);
    this.container.add(this.input);
  }

  onInput(handler: (value: string) => void): void {
    this.input.on(InputRenderableEvents.INPUT, handler);
  }

  focus(): void {
    this.input.focus();
  }
}
