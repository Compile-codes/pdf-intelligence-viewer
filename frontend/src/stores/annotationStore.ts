import { create } from "zustand";
import type { Annotation } from "../types/annotation";
import { getAnnotations, saveAnnotations } from "../services/storageService";

type AnnotationState = {
  annotations: Annotation[];
  activeDocumentId: string | null;
  load: (documentId: string) => void;
  add: (annotation: Annotation) => void;
  remove: (id: string) => void;
  updateComment: (id: string, comment: string) => void;
  clear: () => void;
};

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  activeDocumentId: null,
  load: (documentId) =>
    set({
      activeDocumentId: documentId,
      annotations: getAnnotations(documentId)
    }),
  add: (annotation) => {
    const documentId = annotation.documentId;
    const next = [annotation, ...get().annotations];
    saveAnnotations(documentId, next);
    set({ annotations: next, activeDocumentId: documentId });
  },
  remove: (id) => {
    const documentId = get().activeDocumentId;
    if (!documentId) return;
    const next = get().annotations.filter((annotation) => annotation.id !== id);
    saveAnnotations(documentId, next);
    set({ annotations: next });
  },
  updateComment: (id, comment) => {
    const documentId = get().activeDocumentId;
    if (!documentId) return;
    const next = get().annotations.map((annotation) =>
      annotation.id === id ? { ...annotation, comment } : annotation
    );
    saveAnnotations(documentId, next);
    set({ annotations: next });
  },
  clear: () => set({ annotations: [], activeDocumentId: null })
}));
