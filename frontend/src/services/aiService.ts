const BASE = "/api";

export async function uploadDocument(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/documents`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json() as { id: string };
  return data.id;
}

export async function pollStatus(documentId: string) {
  const res = await fetch(`${BASE}/documents/${documentId}/status`);
  if (!res.ok) throw new Error("Status check failed");
  return res.json() as Promise<{
    status: "pending" | "indexing" | "ready" | "error";
    page_count: number | null;
    chunk_count: number | null;
  }>;
}

export async function* streamChat(
  documentId: string,
  messages: Array<{ role: string; content: string }>
): AsyncGenerator<{ type: string; text?: string; pages?: number[] }> {
  const res = await fetch(`${BASE}/documents/${documentId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("Chat request failed");

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        yield JSON.parse(line.slice(6)) as { type: string; text?: string; pages?: number[] };
      }
    }
  }
}