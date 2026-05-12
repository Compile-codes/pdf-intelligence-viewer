import { useEffect, useRef, useState } from "react";
import { useIntersection } from "../../hooks/useIntersection";
import { useViewerStore } from "../../stores/viewerStore";
import type { LoadedPDF } from "../../types/pdf";
import { ThumbnailLabel } from "./ThumbnailSidebar";

type Props = {
  loaded: LoadedPDF;
  pageNumber: number;
};

export function Thumbnail({ loaded, pageNumber }: Props) {
  const wrapperRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isVisible = useIntersection(wrapperRef, "500px");
  const currentPage = useViewerStore((s) => s.currentPage);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!isVisible || rendered) return;
    let cancelled = false;

    async function renderThumbnail() {
      const page = await loaded.pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.18 });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;

      if (!cancelled) setRendered(true);
    }

    void renderThumbnail();

    return () => {
      cancelled = true;
    };
  }, [isVisible, loaded.pdf, pageNumber, rendered]);

  return (
    <button
      ref={wrapperRef}
      className={currentPage === pageNumber ? "thumbnail active" : "thumbnail"}
      onClick={() => setCurrentPage(pageNumber)}
    >
      <canvas ref={canvasRef} />
      {!rendered && <div className="thumbnailSkeleton" />}
      <ThumbnailLabel pageNumber={pageNumber} />
    </button>
  );
}
