import { useEffect, useMemo, useRef } from "react";
import { updateLastOpenedPage } from "../../services/storageService";
import { useViewerStore } from "../../stores/viewerStore";
import type { LoadedPDF } from "../../types/pdf";
import { PDFPage } from "./PDFPage";

export function PDFViewer({ loaded }: { loaded: LoadedPDF }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const currentPage = useViewerStore((s) => s.currentPage);
  const pages = useMemo(() => Array.from({ length: loaded.pdf.numPages }, (_, index) => index + 1), [loaded.pdf.numPages]);

  useEffect(() => {
    const target = document.getElementById(`page-${currentPage}`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    updateLastOpenedPage(loaded.fingerprint, currentPage);
  }, [currentPage, loaded.fingerprint]);

  return (
    <main ref={containerRef} className="pdfScrollArea">
      <div className="pageStack">
        {pages.map((pageNumber) => (
          <PDFPage key={pageNumber} loaded={loaded} pageNumber={pageNumber} />
        ))}
      </div>
    </main>
  );
}
