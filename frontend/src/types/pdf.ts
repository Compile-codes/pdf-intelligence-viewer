export type PDFDocumentProxy = {
  numPages: number;
  fingerprint?: string;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
  getOutline: () => Promise<PDFOutlineItem[] | null>;
  getDestination: (dest: string) => Promise<unknown[] | null>;
  getPageIndex: (ref: unknown) => Promise<number>;
  destroy: () => Promise<void>;
};

export type PDFPageProxy = {
  pageNumber: number;
  getViewport: (options: { scale: number; rotation?: number }) => PDFViewport;
  render: (options: {
    canvas?: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: PDFViewport;
  }) => { promise: Promise<void>; cancel?: () => void };
  getTextContent: () => Promise<PDFTextContent>;
};

export type PDFViewport = {
  width: number;
  height: number;
  transform: number[];
};

export type PDFTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
  dir?: string;
};

export type PDFTextContent = {
  items: Array<PDFTextItem | Record<string, unknown>>;
};

export type PDFOutlineItem = {
  title: string;
  bold?: boolean;
  italic?: boolean;
  color?: Uint8ClampedArray;
  dest?: string | unknown[] | null;
  items?: PDFOutlineItem[];
};

export type LoadedPDF = {
  fileName: string;
  fileSize: number;
  pdf: PDFDocumentProxy;
  fingerprint: string;
  loadedAt: number;
};

export type PageText = {
  pageNumber: number;
  text: string;
};

export type SearchResult = {
  id: string;
  pageNumber: number;
  snippet: string;
  matchCount: number;
};

export type RenderMetric = {
  pageNumber: number;
  renderMs: number;
};
