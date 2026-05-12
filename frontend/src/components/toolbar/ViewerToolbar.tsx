import { Download, FileText, PanelLeft, RotateCw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import { exportAnnotations } from "../../services/storageService";
import { useViewerStore } from "../../stores/viewerStore";
import type { LoadedPDF, SearchResult } from "../../types/pdf";

type Props = {
  loaded: LoadedPDF;
  search: (query: string) => void;
  searchResults: SearchResult[];
  isIndexing: boolean;
  indexReady: boolean;
  searchMs: number;
  totalWords: number;
};

export function ViewerToolbar({
  loaded,
  search,
  searchResults,
  isIndexing,
  indexReady,
  searchMs,
  totalWords
}: Props) {
  const currentPage = useViewerStore((s) => s.currentPage);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);
  const scale = useViewerStore((s) => s.scale);
  const zoomIn = useViewerStore((s) => s.zoomIn);
  const zoomOut = useViewerStore((s) => s.zoomOut);
  const rotateClockwise = useViewerStore((s) => s.rotateClockwise);
  const setSearchTerm = useViewerStore((s) => s.setSearchTerm);
  const sidebar = useViewerStore((s) => s.sidebar);
  const setSidebar = useViewerStore((s) => s.setSidebar);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchTerm(query);
      if (indexReady || !query.trim()) {
        search(query);
      }
    }, 180);

    return () => window.clearTimeout(id);
  }, [indexReady, query, search, setSearchTerm]);

  return (
    <header className="toolbar">
      <div className="toolbarLeft">
        <button
          className="iconButton"
          onClick={() => setSidebar(sidebar === "thumbnails" ? "outline" : "thumbnails")}
          title="Toggle sidebar"
        >
          <PanelLeft size={18} />
        </button>
        <FileText size={18} />
        <div className="fileMeta">
          <strong>{loaded.fileName}</strong>
          <span>{loaded.pdf.numPages} pages</span>
        </div>
      </div>

      <div className="pageControls">
        <input
          aria-label="Current page"
          value={currentPage}
          onChange={(event) => setCurrentPage(Number(event.target.value))}
          onBlur={() => setCurrentPage(Math.min(Math.max(currentPage, 1), loaded.pdf.numPages))}
        />
        <span>/ {loaded.pdf.numPages}</span>
      </div>

      <div className="zoomControls">
        <button className="iconButton" onClick={zoomOut} title="Zoom out">
          <ZoomOut size={18} />
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button className="iconButton" onClick={zoomIn} title="Zoom in">
          <ZoomIn size={18} />
        </button>
        <button className="iconButton" onClick={rotateClockwise} title="Rotate">
          <RotateCw size={18} />
        </button>
      </div>

      <div className="searchBox">
        <Search size={17} />
        <input
          value={query}
          placeholder={isIndexing ? "Indexing document..." : "Search PDF text"}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <span className="searchMeta">
            {searchResults.length} pages · {searchMs}ms
          </span>
        )}
      </div>

      <div className="toolbarRight">
        <span className="wordCount">{totalWords ? `${totalWords.toLocaleString()} words indexed` : "Index pending"}</span>
        <button className="secondaryButton" onClick={() => exportAnnotations(loaded.fingerprint)}>
          <Download size={16} />
          Export annotations
        </button>
      </div>
    </header>
  );
}
