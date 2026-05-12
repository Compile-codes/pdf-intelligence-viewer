import { useEffect, useRef, useState } from "react";
import { useIntersection } from "../../hooks/useIntersection";
import { useViewerStore } from "../../stores/viewerStore";
import type { LoadedPDF, PDFPageProxy } from "../../types/pdf";
import { AnnotationLayer } from "./AnnotationLayer";
import { PDFCanvas } from "./PDFCanvas";
import { TextLayer } from "./TextLayer";

type Props = {
  loaded: LoadedPDF;
  pageNumber: number;
};

export function PDFPage({ loaded, pageNumber }: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const isVisible = useIntersection(shellRef, "1000px");
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const scale = useViewerStore((s) => s.scale);
  const rotation = useViewerStore((s) => s.rotation);
  const searchTerm = useViewerStore((s) => s.searchTerm);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);
  const viewport = page?.getViewport({ scale, rotation });

  useEffect(() => {
    if (!isVisible || page) return;
    let cancelled = false;

    async function loadPage() {
      const nextPage = await loaded.pdf.getPage(pageNumber);
      if (!cancelled) setPage(nextPage);
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [isVisible, loaded.pdf, page, pageNumber]);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.45) {
          setCurrentPage(pageNumber);
        }
      },
      { threshold: [0.45, 0.65] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [pageNumber, setCurrentPage]);

  const width = viewport?.width ?? 820 * scale;
  const height = viewport?.height ?? 1060 * scale;

  return (
    <section id={`page-${pageNumber}`} ref={shellRef} className="pdfPageShell">
      <div className="pageNumberBadge">Page {pageNumber}</div>
      <div className="pdfPage" style={{ width, height }}>
        {page && viewport ? (
          <>
            <PDFCanvas page={page} viewport={viewport} pageNumber={pageNumber} />
            <TextLayer
              page={page}
              viewport={viewport}
              scale={scale}
              pageNumber={pageNumber}
              documentId={loaded.fingerprint}
              searchTerm={searchTerm}
            />
            <AnnotationLayer documentId={loaded.fingerprint} pageNumber={pageNumber} scale={scale} />
          </>
        ) : (
          <div className="pageSkeleton">Lazy loading page {pageNumber}...</div>
        )}
      </div>
    </section>
  );
}
