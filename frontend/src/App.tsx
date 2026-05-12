import { useState, useEffect } from "react";
import { FileDropzone } from "./components/FileDropzone";
import { ViewerShell } from "./components/ViewerShell";
import { usePDFDocument } from "./hooks/usePDFDocument";
import { usePDFSearch } from "./hooks/usePDFSearch";
import { uploadDocument, pollStatus } from "./services/aiService";
import type { IndexingStatus } from "./types/chat";

export function App() {
  const { document, isLoading, error, openFile } = usePDFDocument();
  const searchState = usePDFSearch(document?.pdf ?? null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus>("idle");

  // Upload to backend as soon as the user opens a file
  async function handleOpenFile(file: File) {
    openFile(file);
    setIndexingStatus("uploading");
    try {
      const id = await uploadDocument(file);
      setDocumentId(id);
      setIndexingStatus("indexing");
    } catch {
      setIndexingStatus("error");
    }
  }

  // Poll until ready
  useEffect(() => {
    if (!documentId || indexingStatus !== "indexing") return;
    const interval = setInterval(async () => {
      try {
        const status = await pollStatus(documentId);
        if (status.status === "ready") {
          setIndexingStatus("ready");
          clearInterval(interval);
        } else if (status.status === "error") {
          setIndexingStatus("error");
          clearInterval(interval);
        }
      } catch {
        // keep polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [documentId, indexingStatus]);

  if (!document) {
    return <FileDropzone onOpenFile={handleOpenFile} isLoading={isLoading} error={error} />;
  }

  return (
    <ViewerShell
      loaded={document}
      search={searchState.search}
      searchResults={searchState.results}
      isIndexing={searchState.isIndexing}
      indexReady={searchState.indexReady}
      searchMs={searchState.searchMs}
      totalWords={searchState.totalWords}
      documentId={documentId}
      indexingStatus={indexingStatus}
    />
  );
}