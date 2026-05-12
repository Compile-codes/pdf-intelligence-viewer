export type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations: number[];  // page numbers
  };
  
  export type IndexingStatus = "idle" | "uploading" | "indexing" | "ready" | "error";