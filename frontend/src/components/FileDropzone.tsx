import { FileText, UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { getRecentDocuments, type RecentDocument } from "../services/storageService";
import { formatFileSize } from "../services/pdfService";

type Props = {
  onOpenFile: (file: File) => void;
  isLoading: boolean;
  error: string | null;
};

export function FileDropzone({ onOpenFile, isLoading, error }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const recentDocs = getRecentDocuments();

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) onOpenFile(file);
    },
    [onOpenFile]
  );

  function onFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onOpenFile(file);
  }

  return (
    <main className="landing">
      <section
        className={`dropzone ${isDragging ? "dropzoneActive" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <div className="brandMark">DL</div>
        <p className="eyebrow">PDF.js portfolio project</p>
        <h1>DocuLens</h1>
        <p className="subtitle">
          A high-performance PDF intelligence viewer with lazy rendering, full-document search,
          thumbnails, outlines, annotations and local persistence.
        </p>

        <label className="uploadButton">
          <UploadCloud size={20} />
          {isLoading ? "Opening PDF..." : "Choose a PDF"}
          <input type="file" accept="application/pdf,.pdf" onChange={onFileInput} />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="featureGrid">
          <Feature title="PDF.js rendering" description="Canvas rendering with a selectable text layer." />
          <Feature title="Search worker" description="Full-document search index runs off the main thread." />
          <Feature title="Annotations" description="Highlight selected text and export annotations as JSON." />
          <Feature title="Performance panel" description="Track render timing, visible pages and indexing progress." />
        </div>
      </section>

      <RecentDocuments docs={recentDocs} />
    </main>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <article className="featureCard">
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

function RecentDocuments({ docs }: { docs: RecentDocument[] }) {
  if (docs.length === 0) return null;

  return (
    <section className="recentDocs">
      <h2>Recently opened</h2>
      <div className="recentList">
        {docs.map((doc) => (
          <article key={doc.id} className="recentItem">
            <FileText size={18} />
            <div>
              <strong>{doc.fileName}</strong>
              <span>
                {doc.pages} pages · {formatFileSize(doc.fileSize)} · last page {doc.lastOpenedPage}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
