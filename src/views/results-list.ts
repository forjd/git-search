import {
  BoxRenderable,
  TextRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  t,
  bold,
  dim,
  fg,
  type RenderContext,
  type SelectOption,
} from "@opentui/core";
import type { SearchResult } from "../db/queries.ts";

export class ResultsList {
  readonly container: BoxRenderable;
  private select: SelectRenderable;
  private emptyText: TextRenderable;
  private results: SearchResult[] = [];

  constructor(ctx: RenderContext) {
    this.container = new BoxRenderable(ctx, {
      id: "results-list",
      flexGrow: 1,
      flexDirection: "column",
      marginTop: 1,
    });

    this.emptyText = new TextRenderable(ctx, {
      content: t`${dim("Type to search commits…")}`,
      marginLeft: 2,
    });

    this.select = new SelectRenderable(ctx, {
      id: "results-select",
      flexGrow: 1,
      backgroundColor: "#1a1b26",
      textColor: "#a9b1d6",
      selectedBackgroundColor: "#283457",
      selectedTextColor: "#c0caf5",
      descriptionColor: "#565f89",
      selectedDescriptionColor: "#7aa2f7",
      showDescription: true,
      showScrollIndicator: true,
      wrapSelection: false,
      visible: false,
    });

    this.container.add(this.emptyText);
    this.container.add(this.select);
  }

  setResults(results: SearchResult[]): void {
    this.results = results;

    if (results.length === 0) {
      this.select.visible = false;
      this.emptyText.visible = true;
      this.emptyText.content = t`${dim("No results found.")}`;
      return;
    }

    this.emptyText.visible = false;
    this.select.visible = true;

    const options: SelectOption[] = results.map((r) => {
      const date = new Date(r.date * 1000);
      const dateStr = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const shortHash = r.hash.slice(0, 7);
      const score = ((1 - r.distance) * 100).toFixed(0);
      const messageLine =
        r.message.length > 72 ? r.message.slice(0, 72) + "…" : r.message;

      return {
        name: `${shortHash}  ${messageLine}`,
        description: `${r.author_name}  ${dateStr}  ${score}% match`,
        value: r.hash,
      };
    });

    this.select.options = options;
    this.select.setSelectedIndex(0);
  }

  showEmpty(): void {
    this.results = [];
    this.select.visible = false;
    this.emptyText.visible = true;
    this.emptyText.content = t`${dim("Type to search commits…")}`;
  }

  onSelect(handler: (hash: string) => void): void {
    this.select.on(
      SelectRenderableEvents.ITEM_SELECTED,
      (_index: number, option: SelectOption) => {
        handler(option.value);
      },
    );
  }

  onSelectionChanged(handler: (hash: string) => void): void {
    this.select.on(
      SelectRenderableEvents.SELECTION_CHANGED,
      (_index: number, option: SelectOption) => {
        handler(option.value);
      },
    );
  }

  getSelectedHash(): string | null {
    const option = this.select.getSelectedOption();
    return option?.value ?? null;
  }

  focus(): void {
    this.select.focus();
  }

  get selectRenderable(): SelectRenderable {
    return this.select;
  }
}
