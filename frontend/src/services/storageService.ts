import type { Annotation } from "../types/annotation";

const RECENT_DOCS_KEY = "doculens:recent-documents";
const ANNOTATION_KEY = "doculens:annotations";

export type RecentDocument = {
  id: string;
  fileName: string;
  fileSize: number;
  pages: number;
  lastOpenedPage: number;
  openedAt: number;
};

type AnnotationMap = Record<string, Annotation[]>;

export function getRecentDocuments(): RecentDocument[] {
  try {
    const raw = localStorage.getItem(RECENT_DOCS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentDocument[];
  } catch {
    return [];
  }
}

export function upsertRecentDocument(doc: RecentDocument): void {
  const docs = getRecentDocuments();
  const next = [doc, ...docs.filter((item) => item.id !== doc.id)].slice(0, 12);
  localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(next));
}

export function updateLastOpenedPage(documentId: string, pageNumber: number): void {
  const docs = getRecentDocuments();
  const next = docs.map((doc) =>
    doc.id === documentId ? { ...doc, lastOpenedPage: pageNumber, openedAt: Date.now() } : doc
  );
  localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(next));
}

export function getAnnotations(documentId: string): Annotation[] {
  try {
    const raw = localStorage.getItem(ANNOTATION_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as AnnotationMap;
    return all[documentId] ?? [];
  } catch {
    return [];
  }
}

export function saveAnnotations(documentId: string, annotations: Annotation[]): void {
  const raw = localStorage.getItem(ANNOTATION_KEY);
  const all = raw ? (JSON.parse(raw) as AnnotationMap) : {};
  all[documentId] = annotations;
  localStorage.setItem(ANNOTATION_KEY, JSON.stringify(all));
}

export function exportAnnotations(documentId: string): void {
  const annotations = getAnnotations(documentId);
  const blob = new Blob([JSON.stringify(annotations, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `doculens-annotations-${documentId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
