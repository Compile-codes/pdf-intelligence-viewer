import { Sidebar } from "./sidebar/Sidebar";
import { ViewerToolbar } from "./toolbar/ViewerToolbar";
import { PDFViewer } from "./viewer/PDFViewer";
import type { LoadedPDF, SearchResult } from "../types/pdf";
import type { IndexingStatus } from "../types/chat";

type Props = {
  loaded: LoadedPDF;
  search: (query: string) => void;
  searchResults: SearchResult[];
  isIndexing: boolean;
  indexReady: boolean;
  searchMs: number;
  totalWords: number;
  documentId: string | null;
  indexingStatus: IndexingStatus;
};

export function ViewerShell({
  loaded,
  search,
  searchResults,
  isIndexing,
  indexReady,
  searchMs,
  totalWords,
  documentId,
  indexingStatus,
}: Props) {
  return (
    <div className="viewerShell">
      <ViewerToolbar
        loaded={loaded}
        search={search}
        searchResults={searchResults}
        isIndexing={isIndexing}
        indexReady={indexReady}
        searchMs={searchMs}
        totalWords={totalWords}
      />
      <div className="viewerBody">
        <Sidebar
          loaded={loaded}
          searchResults={searchResults}
          documentId={documentId}
          indexingStatus={indexingStatus}
        />
        <PDFViewer loaded={loaded} />
      </div>
    </div>
  );
}