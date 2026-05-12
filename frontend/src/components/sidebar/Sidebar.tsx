import { BarChart3, BookOpen, Image, MessageSquare, Search } from "lucide-react";
import { useViewerStore } from "../../stores/viewerStore";
import type { LoadedPDF, SearchResult } from "../../types/pdf";
import type { IndexingStatus } from "../../types/chat";
import { ChatPanel } from "./ChatPanel";
import { InsightsPanel } from "./InsightsPanel";
import { OutlineSidebar } from "./OutlineSidebar";
import { SearchResults } from "./SearchResults";
import { ThumbnailSidebar } from "./ThumbnailSidebar";

type Props = {
  loaded: LoadedPDF;
  searchResults: SearchResult[];
  documentId: string | null;
  indexingStatus: IndexingStatus;
};

export function Sidebar({ loaded, searchResults, documentId, indexingStatus }: Props) {
  const sidebar = useViewerStore((s) => s.sidebar);
  const setSidebar = useViewerStore((s) => s.setSidebar);

  return (
    <aside className="sidebar">
      <nav className="sidebarTabs">
        <button className={sidebar === "thumbnails" ? "tab active" : "tab"} onClick={() => setSidebar("thumbnails")}>
          <Image size={16} /> Pages
        </button>
        <button className={sidebar === "outline" ? "tab active" : "tab"} onClick={() => setSidebar("outline")}>
          <BookOpen size={16} /> Outline
        </button>
        <button className={sidebar === "insights" ? "tab active" : "tab"} onClick={() => setSidebar("insights")}>
          <BarChart3 size={16} /> Insights
        </button>
        <button className={sidebar === "chat" ? "tab active" : "tab"} onClick={() => setSidebar("chat")}>
          <MessageSquare size={16} /> Ask AI
          {indexingStatus === "ready" && <span className="tabDot" />}
        </button>
      </nav>

      {searchResults.length > 0 && sidebar !== "chat" && (
        <div className="sidebarSection">
          <h3><Search size={15} /> Search results</h3>
          <SearchResults results={searchResults} />
        </div>
      )}

      {sidebar === "thumbnails" && <ThumbnailSidebar loaded={loaded} />}
      {sidebar === "outline" && <OutlineSidebar loaded={loaded} />}
      {sidebar === "insights" && <InsightsPanel loaded={loaded} />}
      {sidebar === "chat" && (
        <ChatPanel documentId={documentId} indexingStatus={indexingStatus} />
      )}
    </aside>
  );
}