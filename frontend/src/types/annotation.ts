export type AnnotationType = "highlight" | "note";

export type Annotation = {
  id: string;
  documentId: string;
  pageNumber: number;
  type: AnnotationType;
  text: string;
  comment?: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: number;
};
