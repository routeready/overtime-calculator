"""
Document ingestion pipeline.
Supports: PDF (pdfplumber), .txt, .md
Unsupported formats are logged and skipped.
"""
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone

import pdfplumber
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from backend.models.document import Document
from backend.models.chunk import Chunk
from backend.services.chunker import chunk_text
from backend.services.embedder import embed_texts
from backend.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}
EMBED_BATCH_SIZE = 32  # Voyage free tier: stay well under rate limits


def _extract_text_pdf(path: Path) -> str:
    """Extract full text from a PDF using pdfplumber."""
    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n".join(pages)


def _extract_text_plain(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _extract_text(path: Path) -> str | None:
    ext = path.suffix.lower()
    if ext == ".pdf":
        return _extract_text_pdf(path)
    elif ext in {".txt", ".md"}:
        return _extract_text_plain(path)
    else:
        logger.warning("Unsupported file format: %s — skipping", path.name)
        return None


async def ingest_document(
    db: AsyncSession,
    path: Path,
    province: str | None = None,
    act_name: str | None = None,
    source_url: str | None = None,
) -> Document:
    """
    Ingest a single document file: parse → chunk → embed → store.
    Creates or updates the Document record and upserts all chunks.
    """
    filename = path.name

    # Check for existing document record
    result = await db.execute(select(Document).where(Document.filename == filename))
    doc = result.scalar_one_or_none()

    if doc is None:
        doc = Document(
            filename=filename,
            province=province,
            act_name=act_name,
            source_url=source_url,
            ingestion_status="processing",
        )
        db.add(doc)
    else:
        # Re-ingestion: delete existing chunks first
        logger.info("Re-ingesting %s — deleting %d existing chunks", filename, doc.chunk_count)
        for chunk in await db.scalars(select(Chunk).where(Chunk.document_id == doc.id)):
            await db.delete(chunk)
        doc.ingestion_status = "processing"
        doc.ingestion_error = None
        if province:
            doc.province = province
        if act_name:
            doc.act_name = act_name
        if source_url:
            doc.source_url = source_url

    await db.flush()

    try:
        text = _extract_text(path)
        if text is None:
            doc.ingestion_status = "error"
            doc.ingestion_error = f"Unsupported file format: {path.suffix}"
            await db.flush()
            return doc

        raw_chunks = chunk_text(text, max_tokens=settings.max_chunk_tokens)
        logger.info("Parsed %d chunks from %s", len(raw_chunks), filename)

        # Embed in batches
        all_chunks: list[Chunk] = []
        texts = [c.text for c in raw_chunks]

        for batch_start in range(0, len(texts), EMBED_BATCH_SIZE):
            batch_texts = texts[batch_start:batch_start + EMBED_BATCH_SIZE]
            embeddings = await embed_texts(batch_texts)

            for i, (raw, embedding) in enumerate(zip(
                raw_chunks[batch_start:batch_start + EMBED_BATCH_SIZE], embeddings
            )):
                chunk = Chunk(
                    document_id=doc.id,
                    section_number=raw.section_number or None,
                    section_title=raw.section_title or None,
                    text=raw.text,
                    embedding=embedding,
                    province=province or doc.province,
                    act_name=act_name or doc.act_name,
                    source_file=filename,
                )
                db.add(chunk)
                all_chunks.append(chunk)

            logger.info("Embedded batch %d-%d", batch_start, batch_start + len(batch_texts) - 1)
            # Small delay between batches to respect rate limits
            if batch_start + EMBED_BATCH_SIZE < len(texts):
                await asyncio.sleep(0.5)

        doc.chunk_count = len(all_chunks)
        doc.ingested_at = datetime.now(timezone.utc)
        doc.ingestion_status = "complete"
        await db.flush()

        logger.info("Ingestion complete: %s — %d chunks stored", filename, len(all_chunks))
        return doc

    except Exception as exc:
        logger.exception("Ingestion failed for %s: %s", filename, exc)
        doc.ingestion_status = "error"
        doc.ingestion_error = str(exc)
        await db.flush()
        return doc
