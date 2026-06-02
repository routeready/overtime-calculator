"""
AI answer layer. Grounds Claude responses strictly in retrieved chunks.
Never falls back to training knowledge.
"""
import anthropic
from backend.config import settings
from backend.services.retriever import RetrievedChunk

_client: anthropic.AsyncAnthropic | None = None

NO_CORPUS_MESSAGE = (
    "No relevant regulation sections found in the loaded corpus for this question. "
    "Please check that the relevant document has been ingested."
)

SYSTEM_PROMPT = """You are Mining Bible — a precise regulatory reference assistant for Canadian mining health and safety regulations.

You ONLY answer using the regulation sections provided below as context. Do not use any knowledge from your training data. If the provided sections do not contain enough information to answer the question, say exactly: "The provided regulation sections do not contain enough information to answer this question."

Always cite the exact section number from the provided context.

Format every answer as:

ANSWER
[Direct answer in plain language]

CITATION
[e.g. Reg. 854, s. 105(2) — include section title if available]

NOTE
[Only if there is a meaningful caveat, amendment flag, or cross-reference. Omit this block entirely if there is nothing meaningful to add.]"""


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


def _format_chunks_as_context(chunks: list[RetrievedChunk]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        citation = chunk.act_name or chunk.source_file or "Unknown document"
        if chunk.section_number:
            citation += f", s. {chunk.section_number}"
        if chunk.section_title:
            citation += f" — {chunk.section_title}"
        parts.append(f"[Context {i} — {citation}]\n{chunk.text}")
    return "\n\n---\n\n".join(parts)


async def answer_question(
    query: str,
    chunks: list[RetrievedChunk],
) -> str:
    """
    Generate a grounded answer using only the provided retrieved chunks.
    If chunks is empty, returns the no-corpus message without calling Claude.
    """
    if not chunks:
        return NO_CORPUS_MESSAGE

    context_text = _format_chunks_as_context(chunks)
    user_message = f"REGULATION CONTEXT:\n\n{context_text}\n\n---\n\nQUESTION: {query}"

    client = _get_client()
    response = await client.messages.create(
        model=settings.claude_model,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return response.content[0].text
