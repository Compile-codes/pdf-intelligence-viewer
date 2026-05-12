import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { LoadedPDF, PDFDocumentProxy, PDFOutlineItem, PDFPageProxy, PageText } from "../types/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function loadPdfFromFile(file: File): Promise<LoadedPDF> {
  const buffer = await file.arrayBuffer();
  const pdf = (await pdfjsLib.getDocument({ data: buffer }).promise) as unknown as PDFDocumentProxy;

  return {
    fileName: file.name,
    fileSize: file.size,
    pdf,
    fingerprint: getDocumentFingerprint(pdf, file),
    loadedAt: Date.now()
  };
}

export function getDocumentFingerprint(pdf: PDFDocumentProxy, file: File): string {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${pdf.fingerprint ?? safeName}-${file.size}`;
}

export async function extractPageText(page: PDFPageProxy): Promise<string> {
  const textContent = await page.getTextContent();
  return textContent.items
    .map((item) => {
      if ("str" in item && typeof item.str === "string") return item.str;
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractAllText(pdf: PDFDocumentProxy, onProgress?: (page: number, total: number) => void): Promise<PageText[]> {
  const pages: PageText[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const text = await extractPageText(page);
    pages.push({ pageNumber, text });
    onProgress?.(pageNumber, pdf.numPages);
  }
  return pages;
}

export async function getOutline(pdf: PDFDocumentProxy): Promise<PDFOutlineItem[]> {
  const outline = await pdf.getOutline();
  return outline ?? [];
}

export async function resolveOutlinePage(pdf: PDFDocumentProxy, dest: string | unknown[] | null | undefined): Promise<number | null> {
  if (!dest) return null;

  const destination = typeof dest === "string" ? await pdf.getDestination(dest) : dest;
  if (!Array.isArray(destination) || destination.length === 0) return null;

  const ref = destination[0];
  try {
    const pageIndex = await pdf.getPageIndex(ref);
    return pageIndex + 1;
  } catch {
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
