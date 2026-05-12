import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SearchWorker from "../workers/pdfSearch.worker?worker";
import { extractAllText } from "../services/pdfService";
import type { PDFDocumentProxy, SearchResult } from "../types/pdf";
import { useViewerStore } from "../stores/viewerStore";

type WorkerMessage =
  | { type: "INDEX_READY"; totalPages: number; totalWords: number; buildMs: number }
  | { type: "SEARCH_RESULTS"; query: string; results: SearchResult[]; searchMs: number }
  | { type: "ERROR"; message: string };

type SearchState = {
  isIndexing: boolean;
  indexReady: boolean;
  totalWords: number;
  buildMs: number;
  searchMs: number;
  results: SearchResult[];
  error: string | null;
};

export function usePDFSearch(pdf: PDFDocumentProxy | null) {
  const workerRef = useRef<Worker | null>(null);
  const setExtractionProgress = useViewerStore((s) => s.setExtractionProgress);
  const [state, setState] = useState<SearchState>({
    isIndexing: false,
    indexReady: false,
    totalWords: 0,
    buildMs: 0,
    searchMs: 0,
    results: [],
    error: null
  });

  useEffect(() => {
    workerRef.current = new SearchWorker();
    workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      if (message.type === "INDEX_READY") {
        setState((current) => ({
          ...current,
          isIndexing: false,
          indexReady: true,
          totalWords: message.totalWords,
          buildMs: message.buildMs,
          error: null
        }));
      }

      if (message.type === "SEARCH_RESULTS") {
        setState((current) => ({
          ...current,
          results: message.results,
          searchMs: message.searchMs
        }));
      }

      if (message.type === "ERROR") {
        setState((current) => ({
          ...current,
          isIndexing: false,
          error: message.message
        }));
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (!pdf || !workerRef.current) return;
    let cancelled = false;
    const documentPdf = pdf;

    async function indexDocument() {
      setState({
        isIndexing: true,
        indexReady: false,
        totalWords: 0,
        buildMs: 0,
        searchMs: 0,
        results: [],
        error: null
      });
      setExtractionProgress(0);

      try {
        const pages = await extractAllText(documentPdf, (page, total) => {
          if (!cancelled) setExtractionProgress(Math.round((page / total) * 100));
        });
        if (!cancelled) {
          workerRef.current?.postMessage({ type: "BUILD_INDEX", pages });
        }
      } catch (error) {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            isIndexing: false,
            error: error instanceof Error ? error.message : "Search indexing failed."
          }));
        }
      }
    }

    void indexDocument();

    return () => {
      cancelled = true;
    };
  }, [pdf, setExtractionProgress]);

  const search = useCallback((query: string) => {
    workerRef.current?.postMessage({ type: "SEARCH", query });
  }, []);

  return useMemo(
    () => ({
      ...state,
      search
    }),
    [search, state]
  );
}
