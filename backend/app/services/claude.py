import anthropic

client = anthropic.AsyncAnthropic()

SYSTEM_PROMPT = """You are a precise document assistant. Answer questions using ONLY
the context provided. If the answer is not present, say exactly:
"I don't see that in this document."

CRITICAL RULES:
- Key facts like names, locations, salaries, dates are almost always in a
  summary table on the first page. Always check page 1 context first.
- For ANY question about location, address, city, suburb, or place —
  look for the "Location" field in the Key Terms table.
- For tables: left column = label, right column = value.
- Cite pages inline as [Page N].
- Never say you don't see something if it appears anywhere in the context.
- Never invent facts."""

async def stream_answer(chunks, messages: list[dict]):
    context = "\n\n---\n\n".join(
        f"[Page {c['page_number']}]\n{c['text']}" for c in chunks
    )
    # Inject context into the last user turn only
    augmented = messages[:-1] + [{
        "role": "user",
        "content": f"Document context:\n{context}\n\nQuestion: {messages[-1]['content']}"
    }]

    async with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=augmented,
    ) as stream:
        async for text in stream.text_stream:
            yield text