import { useViewerStore } from "../../stores/viewerStore";
import type { SearchResult } from "../../types/pdf";

export function SearchResults({ results }: { results: SearchResult[] }) {
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);

  return (
    <div className="searchResults">
      {results.map((result) => (
        <button key={result.id} className="searchResult" onClick={() => setCurrentPage(result.pageNumber)}>
          <strong>Page {result.pageNumber}</strong>
          <span>{result.matchCount} matches</span>
          <p>{result.snippet}</p>
        </button>
      ))}
    </div>
  );
}
