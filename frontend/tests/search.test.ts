import { describe, expect, it } from "vitest";

function countMatches(text: string, query: string): number {
  if (!query.trim()) return 0;
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.match(new RegExp(safeQuery, "gi"));
  return matches?.length ?? 0;
}

describe("search matching", () => {
  it("counts case-insensitive matches", () => {
    expect(countMatches("PDF rendering with pdf.js and PDF text layers", "pdf")).toBe(3);
  });

  it("handles regex-like search safely", () => {
    expect(countMatches("A+B is not A?B", "A+B")).toBe(1);
  });
});
