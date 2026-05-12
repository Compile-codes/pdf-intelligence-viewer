import { useMemo } from "react";
import { useViewerStore } from "../../stores/viewerStore";
import type { LoadedPDF } from "../../types/pdf";
import { Thumbnail } from "./Thumbnail";

export function ThumbnailSidebar({ loaded }: { loaded: LoadedPDF }) {
  const pages = useMemo(() => Array.from({ length: loaded.pdf.numPages }, (_, index) => index + 1), [loaded.pdf.numPages]);

  return (
    <div className="thumbnailList">
      {pages.map((pageNumber) => (
        <Thumbnail key={pageNumber} loaded={loaded} pageNumber={pageNumber} />
      ))}
    </div>
  );
}

export function ThumbnailLabel({ pageNumber }: { pageNumber: number }) {
  const currentPage = useViewerStore((s) => s.currentPage);
  return <span className={currentPage === pageNumber ? "pageLabel active" : "pageLabel"}>{pageNumber}</span>;
}
