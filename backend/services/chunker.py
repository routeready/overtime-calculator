"""
Section-aware chunker for Canadian mining regulation documents.

Splits text at section boundaries (Section X, s. X headings), preserves
section numbers for citations, and enforces a max token limit by splitting
oversized sections at subsection level.
"""
import re
import tiktoken
from dataclasses import dataclass, field

_enc = tiktoken.get_encoding("cl100k_base")

# Patterns that mark the start of a new top-level section
SECTION_PATTERNS = [
    re.compile(r"^\s*(?:Section|SECTION)\s+(\d+(?:\.\d+)*)\b(.*)$", re.MULTILINE),
    re.compile(r"^\s*s\.\s*(\d+(?:\.\d+)*)\b(.*)$", re.MULTILINE),
    re.compile(r"^\s*(\d+(?:\.\d+)*)\s*\.\s+([A-Z][^a-z]{2,}.*?)$", re.MULTILINE),
]

# Pattern for subsection splits within an oversized section
SUBSECTION_PATTERN = re.compile(
    r"(?=\n\s*\((?:[a-z]|\d+)\)\s)", re.MULTILINE
)


@dataclass
class RawChunk:
    section_number: str
    section_title: str
    text: str
    token_count: int = field(default=0, init=False)

    def __post_init__(self):
        self.token_count = len(_enc.encode(self.text))


def _count_tokens(text: str) -> int:
    return len(_enc.encode(text))


def _find_sections(text: str) -> list[tuple[int, str, str]]:
    """Return list of (char_offset, section_number, section_title) for each section boundary."""
    hits: list[tuple[int, str, str]] = []
    seen_offsets: set[int] = set()

    for pattern in SECTION_PATTERNS:
        for m in pattern.finditer(text):
            if m.start() not in seen_offsets:
                seen_offsets.add(m.start())
                sec_num = m.group(1).strip()
                title_part = m.group(2).strip() if m.lastindex >= 2 else ""
                # Clean trailing punctuation from title
                title_part = re.sub(r"[:\-–—]+$", "", title_part).strip()
                hits.append((m.start(), sec_num, title_part))

    hits.sort(key=lambda x: x[0])
    return hits


def _split_oversized(text: str, section_number: str, section_title: str,
                     max_tokens: int) -> list[RawChunk]:
    """Split a section that exceeds max_tokens at subsection boundaries."""
    parts = SUBSECTION_PATTERN.split(text)
    chunks: list[RawChunk] = []
    buffer = ""
    part_index = 0

    for part in parts:
        if _count_tokens(buffer + part) <= max_tokens:
            buffer += part
        else:
            if buffer.strip():
                label = f"{section_number}" if part_index == 0 else f"{section_number} (cont.)"
                chunks.append(RawChunk(label, section_title, buffer.strip()))
                part_index += 1
            buffer = part

    if buffer.strip():
        label = f"{section_number}" if part_index == 0 else f"{section_number} (cont.)"
        chunks.append(RawChunk(label, section_title, buffer.strip()))

    # If we still have oversized parts (e.g., no subsection markers), hard-split by token
    final: list[RawChunk] = []
    for c in chunks:
        if c.token_count > max_tokens:
            tokens = _enc.encode(c.text)
            for i in range(0, len(tokens), max_tokens):
                piece = _enc.decode(tokens[i:i + max_tokens])
                idx = i // max_tokens
                label = f"{c.section_number} (pt.{idx + 1})"
                final.append(RawChunk(label, c.section_title, piece.strip()))
        else:
            final.append(c)
    return final


def chunk_text(text: str, max_tokens: int = 1000) -> list[RawChunk]:
    """
    Split document text into section-aligned chunks.
    Returns list of RawChunk with section_number, section_title, and text preserved.
    """
    boundaries = _find_sections(text)

    if not boundaries:
        # No section markers found — treat entire document as one chunk (or split by tokens)
        if _count_tokens(text) <= max_tokens:
            return [RawChunk("", "", text.strip())]
        return _split_oversized(text, "", "", max_tokens)

    chunks: list[RawChunk] = []

    for i, (start, sec_num, sec_title) in enumerate(boundaries):
        end = boundaries[i + 1][0] if i + 1 < len(boundaries) else len(text)
        section_text = text[start:end].strip()

        if not section_text:
            continue

        if _count_tokens(section_text) <= max_tokens:
            chunks.append(RawChunk(sec_num, sec_title, section_text))
        else:
            chunks.extend(_split_oversized(section_text, sec_num, sec_title, max_tokens))

    return chunks
