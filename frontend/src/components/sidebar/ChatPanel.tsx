import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useViewerStore } from "../../stores/viewerStore";
import { streamChat } from "../../services/aiService";
import type { ChatMessage, IndexingStatus } from "../../types/chat";

type Props = {
  documentId: string | null;
  indexingStatus: IndexingStatus;
};

export function ChatPanel({ documentId, indexingStatus }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [userNavigating, setUserNavigating] = useState(false);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userNavigating) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, userNavigating]);

  function navigateToPage(page: number) {
    setUserNavigating(true);
    setCurrentPage(page);
    setTimeout(() => {
      const scrollArea = document.querySelector(".pdfScrollArea");
      const target = document.getElementById(`page-${page}`);
      if (!target || !scrollArea) return;
      const targetTop =
        target.getBoundingClientRect().top -
        scrollArea.getBoundingClientRect().top +
        scrollArea.scrollTop;
      scrollArea.scrollTo({ top: targetTop, behavior: "smooth" });
      setTimeout(() => setUserNavigating(false), 1000);
    }, 150);
  }

  async function handleSend() {
    if (!input.trim() || !documentId || isStreaming || indexingStatus !== "ready") return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      citations: [],
    };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      citations: [],
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);

    const history = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      for await (const event of streamChat(documentId, history)) {
        if (event.type === "chunk" && event.text) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + event.text }
                : m
            )
          );
        }
        if (event.type === "citations" && event.pages) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, citations: event.pages! }
                : m
            )
          );
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  if (!documentId) {
    return (
      <div className="chatEmpty">
        <p>Open a PDF to start asking questions.</p>
      </div>
    );
  }

  if (indexingStatus !== "ready") {
    return (
      <div className="chatEmpty">
        <Loader2 size={20} className="chatSpinner" />
        <p>{indexingStatus === "error" ? "Indexing failed." : "Indexing document…"}</p>
        <p className="chatHint">You can keep reading while this runs.</p>
      </div>
    );
  }

  return (
    <div className="chatPanel">
      <div className="chatMessages">
        {messages.length === 0 && (
          <p className="chatHint">Ask anything about this document.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chatBubble chatBubble--${msg.role}`}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
            {msg.citations.length > 0 && (
              <div className="chatCitations">
                {msg.citations.map((page) => (
                  <button
                  key={page}
                  className="citationChip"
                  data-page={page}
                >
                  Page {page}
                </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chatInputRow">
        <input
          className="chatInput"
          value={input}
          placeholder="Ask a question…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          disabled={isStreaming}
        />
        <button
          className="chatSend"
          onClick={() => void handleSend()}
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? <Loader2 size={16} className="chatSpinner" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
