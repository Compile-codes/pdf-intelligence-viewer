import { useCallback, useEffect, useState } from "react";
import { loadPdfFromFile } from "../services/pdfService";
import { upsertRecentDocument } from "../services/storageService";
import { useAnnotationStore } from "../stores/annotationStore";
import { useViewerStore } from "../stores/viewerStore";
import type { LoadedPDF } from "../types/pdf";

type State = {
  document: LoadedPDF | null;
  isLoading: boolean;
  error: string | null;
};

export function usePDFDocument() {
  const [state, setState] = useState<State>({
    document: null,
    isLoading: false,
    error: null
  });
  const loadAnnotations = useAnnotationStore((s) => s.load);
  const resetViewer = useViewerStore((s) => s.reset);

  const openFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setState((current) => ({ ...current, error: "Please choose a PDF file." }));
        return;
      }

      setState({ document: null, isLoading: true, error: null });
      resetViewer();

      try {
        const loaded = await loadPdfFromFile(file);
        setState({ document: loaded, isLoading: false, error: null });
        loadAnnotations(loaded.fingerprint);
        upsertRecentDocument({
          id: loaded.fingerprint,
          fileName: loaded.fileName,
          fileSize: loaded.fileSize,
          pages: loaded.pdf.numPages,
          lastOpenedPage: 1,
          openedAt: Date.now()
        });
      } catch (error) {
        setState({
          document: null,
          isLoading: false,
          error: error instanceof Error ? error.message : "Could not open this PDF."
        });
      }
    },
    [loadAnnotations, resetViewer]
  );

  useEffect(() => {
    return () => {
      void state.document?.pdf.destroy();
    };
  }, [state.document]);

  return {
    ...state,
    openFile
  };
}
