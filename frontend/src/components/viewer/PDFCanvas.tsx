import { useEffect, useRef } from "react";
import { useViewerStore } from "../../stores/viewerStore";
import type { PDFPageProxy, PDFViewport } from "../../types/pdf";

type Props = {
  page: PDFPageProxy;
  viewport: PDFViewport;
  pageNumber: number;
};

export function PDFCanvas({ page, viewport, pageNumber }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const addMetric = useViewerStore((s) => s.addMetric);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const outputScale = window.devicePixelRatio || 1;
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

    const startedAt = performance.now();
    const renderTask = page.render({ canvas, canvasContext: context, viewport });

    renderTask.promise
      .then(() => {
        addMetric({
          pageNumber,
          renderMs: Math.round(performance.now() - startedAt)
        });
      })
      .catch(() => {
        // Rendering can be cancelled during fast scrolling or zoom changes.
      });

    return () => {
      renderTask.cancel?.();
    };
  }, [addMetric, page, pageNumber, viewport]);

  return <canvas ref={canvasRef} className="pdfCanvas" />;
}
