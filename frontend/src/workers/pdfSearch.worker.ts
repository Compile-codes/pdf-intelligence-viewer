import type { PageText, SearchResult } from "../types/pdf";

let index: PageText[] = [];

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildSnippet(text: string, query: string): string {
  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex < 0) {
    return text.slice(0, 180);
  }

  const start = Math.max(0, matchIndex - 70);
  const end = Math.min(text.length, matchIndex + normalizedQuery.length + 110);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function countMatches(text: string, query: string): number {
  if (!query.trim()) return 0;
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.match(new RegExp(safeQuery, "gi"));
  return matches?.length ?? 0;
}

self.onmessage = (event: MessageEvent) => {
  const message = event.data;

  try {
    if (message.type === "BUILD_INDEX") {
      const startedAt = performance.now();
      index = message.pages as PageText[];
      const totalWords = index.reduce((sum, page) => sum + page.text.split(/\s+/).filter(Boolean).length, 0);
      self.postMessage({
        type: "INDEX_READY",
        totalPages: index.length,
        totalWords,
        buildMs: Math.round(performance.now() - startedAt)
      });
    }

    if (message.type === "SEARCH") {
      const query = String(message.query ?? "").trim();
      const startedAt = performance.now();

      if (!query) {
        self.postMessage({ type: "SEARCH_RESULTS", query, results: [], searchMs: 0 });
        return;
      }

      const normalizedQuery = normalize(query);
      const results: SearchResult[] = index
        .filter((page) => normalize(page.text).includes(normalizedQuery))
        .map((page) => ({
          id: `${page.pageNumber}-${normalizedQuery}`,
          pageNumber: page.pageNumber,
          snippet: buildSnippet(page.text, query),
          matchCount: countMatches(page.text, query)
        }))
        .slice(0, 100);

      self.postMessage({
        type: "SEARCH_RESULTS",
        query,
        results,
        searchMs: Math.round(performance.now() - startedAt)
      });
    }
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      message: error instanceof Error ? error.message : "Search worker failed."
    });
  }
};

export {};
