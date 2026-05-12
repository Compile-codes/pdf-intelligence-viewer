import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getOutline, resolveOutlinePage } from "../../services/pdfService";
import { useViewerStore } from "../../stores/viewerStore";
import type { LoadedPDF, PDFOutlineItem } from "../../types/pdf";

export function OutlineSidebar({ loaded }: { loaded: LoadedPDF }) {
  const [outline, setOutline] = useState<PDFOutlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOutline() {
      setIsLoading(true);
      const items = await getOutline(loaded.pdf);
      if (!cancelled) {
        setOutline(items);
        setIsLoading(false);
      }
    }

    void loadOutline();

    return () => {
      cancelled = true;
    };
  }, [loaded.pdf]);

  if (isLoading) return <p className="muted sidebarPadding">Loading outline...</p>;
  if (outline.length === 0) {
    return (
      <div className="emptyState sidebarPadding">
        <h3>No outline found</h3>
        <p>This PDF does not expose bookmarks/table-of-contents metadata.</p>
      </div>
    );
  }

  return (
    <div className="outlineList">
      {outline.map((item, index) => (
        <OutlineItem key={`${item.title}-${index}`} item={item} loaded={loaded} depth={0} />
      ))}
    </div>
  );
}

function OutlineItem({ item, loaded, depth }: { item: PDFOutlineItem; loaded: LoadedPDF; depth: number }) {
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);

  async function goToItem() {
    const pageNumber = await resolveOutlinePage(loaded.pdf, item.dest);
    if (pageNumber) setCurrentPage(pageNumber);
  }

  return (
    <div className="outlineGroup">
      <button className="outlineItem" style={{ paddingLeft: 12 + depth * 14 }} onClick={goToItem}>
        <ChevronRight size={13} />
        <span>{item.title}</span>
      </button>
      {item.items?.map((child, index) => (
        <OutlineItem key={`${child.title}-${index}`} item={child} loaded={loaded} depth={depth + 1} />
      ))}
    </div>
  );
}
