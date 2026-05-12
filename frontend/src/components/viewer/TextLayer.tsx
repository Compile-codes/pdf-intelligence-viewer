import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useState } from "react";
import { useAnnotationStore } from "../../stores/annotationStore";
import type { PDFPageProxy, PDFTextItem, PDFViewport } from "../../types/pdf";

type TextSpan = {
  id: string;
  text: string;
  left: number;
  top: number;
  fontSize: number;
  width: number;
  height: number;
};

type Props = {
  page: PDFPageProxy;
  viewport: PDFViewport;
  scale: number;
  pageNumber: number;
  documentId: string;
  searchTerm: string;
};

export function TextLayer({ page, viewport, scale, pageNumber, documentId, searchTerm }: Props) {
  const [spans, setSpans] = useState<TextSpan[]>([]);
  const addAnnotation = useAnnotationStore((s) => s.add);

  useEffect(() => {
    let cancelled = false;

    async function buildLayer() {
      const textContent = await page.getTextContent();
      const nextSpans = textContent.items
        .filter((item): item is PDFTextItem => "str" in item && typeof item.str === "string" && item.str.trim().length > 0)
        .map((item, index) => {
          const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const fontSize = Math.hypot(tx[2], tx[3]);
          const left = tx[4];
          const top = tx[5] - fontSize;
          return {
            id: `${pageNumber}-${index}`,
            text: item.str,
            left,
            top,
            fontSize,
            width: Math.max(item.width * scale, item.str.length * fontSize * 0.4),
            height: Math.max(fontSize * 1.25, 8)
          };
        });

      if (!cancelled) setSpans(nextSpans);
    }

    void buildLayer();

    return () => {
      cancelled = true;
    };
  }, [page, pageNumber, scale, viewport]);

  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    const selected = window.getSelection();
    const text = selected?.toString().trim();
    if (!selected || !text || selected.rangeCount === 0) return;

    const layerBox = event.currentTarget.getBoundingClientRect();
    const range = selected.getRangeAt(0);
    const selectionBoxes = Array.from(range.getClientRects()).filter(
      (box) =>
        box.width >= 2 &&
        box.height >= 2 &&
        box.right >= layerBox.left &&
        box.left <= layerBox.right &&
        box.bottom >= layerBox.top &&
        box.top <= layerBox.bottom
    );
    const rangeBox = selectionBoxes[0] ?? range.getBoundingClientRect();

    if (rangeBox.width < 4 || rangeBox.height < 4) return;

    addAnnotation({
      id: crypto.randomUUID(),
      documentId,
      pageNumber,
      type: "highlight",
      text,
      color: "rgba(255, 214, 10, 0.38)",
      x: (rangeBox.left - layerBox.left) / scale,
      y: (rangeBox.top - layerBox.top) / scale,
      width: rangeBox.width / scale,
      height: rangeBox.height / scale,
      createdAt: Date.now()
    });

    selected.removeAllRanges();
  }

  return (
    <div className="textLayer" onMouseUp={handleMouseUp} aria-label={`Selectable text for page ${pageNumber}`}>
      {spans.map((span) => (
        <span
          key={span.id}
          className={isSearchMatch(span.text, searchTerm) ? "textSpan searchHit" : "textSpan"}
          style={{
            left: span.left,
            top: span.top,
            fontSize: span.fontSize,
            width: span.width,
            height: span.height
          }}
        >
          {span.text}
        </span>
      ))}
    </div>
  );
}

function isSearchMatch(text: string, query: string): boolean {
  if (!query.trim()) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}
