import { create } from "zustand";
import type { RenderMetric } from "../types/pdf";

type ViewerState = {
  currentPage: number;
  scale: number;
  rotation: number;
  searchTerm: string;
  sidebar: "thumbnails" | "outline" | "insights" | "chat";
  metrics: RenderMetric[];
  extractionProgress: number;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitWidth: () => void;
  rotateClockwise: () => void;
  setSearchTerm: (term: string) => void;
  setSidebar: (sidebar: ViewerState["sidebar"]) => void;
  addMetric: (metric: RenderMetric) => void;
  setExtractionProgress: (progress: number) => void;
  reset: () => void;
};

export const useViewerStore = create<ViewerState>((set) => ({
  currentPage: 1,
  scale: 1.15,
  rotation: 0,
  searchTerm: "",
  sidebar: "thumbnails",
  metrics: [],
  extractionProgress: 0,
  setCurrentPage: (page) => set({ currentPage: Math.max(1, page) }),
  setScale: (scale) => set({ scale: clamp(scale, 0.5, 3) }),
  zoomIn: () => set((state) => ({ scale: clamp(Number((state.scale + 0.15).toFixed(2)), 0.5, 3) })),
  zoomOut: () => set((state) => ({ scale: clamp(Number((state.scale - 0.15).toFixed(2)), 0.5, 3) })),
  fitWidth: () => set({ scale: 1.15 }),
  rotateClockwise: () => set((state) => ({ rotation: (state.rotation + 90) % 360 })),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSidebar: (sidebar) => set({ sidebar }),
  addMetric: (metric) =>
    set((state) => ({
      metrics: [metric, ...state.metrics.filter((m) => m.pageNumber !== metric.pageNumber)].slice(0, 50)
    })),
  setExtractionProgress: (progress) => set({ extractionProgress: progress }),
  reset: () =>
    set({
      currentPage: 1,
      scale: 1.15,
      rotation: 0,
      searchTerm: "",
      metrics: [],
      extractionProgress: 0,
      sidebar: "thumbnails"
    })
}));

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
