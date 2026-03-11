import type { CliRenderer } from "@opentui/core";
import type { Database } from "bun:sqlite";
import { basename } from "node:path";
import { IndexingScreen } from "./views/indexing-screen.ts";
import { SearchInput } from "./views/search-input.ts";
import { ResultsList } from "./views/results-list.ts";
import { CommitDetail } from "./views/commit-detail.ts";
import { StatusBar } from "./views/status-bar.ts";
import { runIndex, type IndexProgress } from "./indexer/indexer.ts";
import { search, type SearchResult } from "./search/search.ts";
import { getCommitCount } from "./db/queries.ts";
import { loadModel } from "./indexer/embedder.ts";

export class App {
  private renderer: CliRenderer;
  private db: Database;
  private repoRoot: string;

  private indexingScreen: IndexingScreen;
  private searchInput: SearchInput;
  private resultsList: ResultsList;
  private commitDetail: CommitDetail;
  private statusBar: StatusBar;

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentResults: SearchResult[] = [];

  constructor(renderer: CliRenderer, db: Database, repoRoot: string) {
    this.renderer = renderer;
    this.db = db;
    this.repoRoot = repoRoot;

    this.indexingScreen = new IndexingScreen(renderer);
    this.searchInput = new SearchInput(renderer);
    this.resultsList = new ResultsList(renderer);
    this.commitDetail = new CommitDetail(renderer);
    this.statusBar = new StatusBar(renderer);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Debounced search on input
    this.searchInput.onInput((value) => {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      if (!value.trim()) {
        this.resultsList.showEmpty();
        this.commitDetail.hide();
        return;
      }

      this.searchDebounceTimer = setTimeout(() => {
        this.performSearch(value);
      }, 200);
    });

    // Show detail on selection
    this.resultsList.onSelect((hash) => {
      const result = this.currentResults.find((r) => r.hash === hash);
      if (result) {
        this.commitDetail.show(result, this.db);
      }
    });

    // Global keyboard shortcuts
    this.renderer.keyInput.on("keypress", (key) => {
      if (key.name === "q" && !this.searchInput.input.focused) {
        this.renderer.stop();
        process.exit(0);
      }
      if (key.name === "escape") {
        if (this.commitDetail.isVisible) {
          this.commitDetail.hide();
          this.resultsList.focus();
        } else if (this.resultsList.selectRenderable.focused) {
          this.searchInput.focus();
        }
      }
      if (key.name === "tab" && !key.shift) {
        if (this.searchInput.input.focused && this.currentResults.length > 0) {
          this.resultsList.focus();
          key.preventDefault();
        }
      }
      if (key.name === "tab" && key.shift) {
        if (this.resultsList.selectRenderable.focused) {
          this.searchInput.focus();
          key.preventDefault();
        }
      }
    });
  }

  private async performSearch(query: string): Promise<void> {
    try {
      this.currentResults = await search(this.db, query, 50);
      this.resultsList.setResults(this.currentResults);
      this.commitDetail.hide();
    } catch {
      // Search failed silently — user can keep typing
    }
  }

  async start(): Promise<void> {
    // Show indexing screen
    this.renderer.root.add(this.indexingScreen.container);

    const onProgress = (progress: IndexProgress) => {
      this.indexingScreen.update(progress);
      this.renderer.requestRender();
    };

    const result = await runIndex(this.db, onProgress);

    // Transition to search screen
    this.indexingScreen.container.destroy();
    this.showSearchScreen();

    // Pre-load model in background if not already loaded
    loadModel().catch(() => {});
  }

  private showSearchScreen(): void {
    const { root } = this.renderer;

    // Main layout: vertical stack
    root.add(this.searchInput.container);
    root.add(this.resultsList.container);
    root.add(this.commitDetail.container);
    root.add(this.statusBar.container);

    const repoName = basename(this.repoRoot);
    const commitCount = getCommitCount(this.db);
    this.statusBar.setRepoInfo(repoName, commitCount);

    this.searchInput.focus();
  }
}
