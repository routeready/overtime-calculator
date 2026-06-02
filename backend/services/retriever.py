"""
Hybrid retrieval: FTS (PostgreSQL tsvector) + semantic (pgvector cosine similarity).
Merge candidates, re-rank by cosine similarity, return top-k.
"""
import logging
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.embedder import embed_query
from backend.config import settings

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    id: str
    document_id: str
    section_number: str | None
    section_title: str | None
    text: str
    province: str | None
    act_name: str | None
    source_file: str | None
    score: float


async def hybrid_retrieve(
    db: AsyncSession,
    query: str,
    top_k: int | None = None,
) -> list[RetrievedChunk]:
    """
    Run FTS + semantic search, merge, re-rank by cosine similarity, return top_k chunks.
    Returns empty list only when BOTH searches return zero results — never falls back
    to training knowledge.
    """
    k = top_k or settings.retrieval_top_k
    query_embedding = await embed_query(query)
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    # --- Keyword (FTS) search ---
    fts_sql = text("""
        SELECT id, document_id, section_number, section_title, text,
               province, act_name, source_file,
               ts_rank_cd(textsearch, plainto_tsquery('english', :query)) AS fts_score
        FROM chunks
        WHERE textsearch @@ plainto_tsquery('english', :query)
        ORDER BY fts_score DESC
        LIMIT :limit
    """)
    fts_result = await db.execute(fts_sql, {"query": query, "limit": k * 3})
    fts_rows = fts_result.fetchall()

    # --- Semantic search ---
    sem_sql = text("""
        SELECT id, document_id, section_number, section_title, text,
               province, act_name, source_file,
               1 - (embedding <=> :embedding ::vector) AS cosine_sim
        FROM chunks
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> :embedding ::vector
        LIMIT :limit
    """)
    sem_result = await db.execute(sem_sql, {"embedding": embedding_str, "limit": k * 3})
    sem_rows = sem_result.fetchall()

    if not fts_rows and not sem_rows:
        logger.info("No results from either FTS or semantic search for query: %s", query[:80])
        return []

    # --- Merge (de-duplicate by id) ---
    candidates: dict[str, dict] = {}

    for row in fts_rows:
        row_id = str(row.id)
        candidates[row_id] = {
            "id": row_id,
            "document_id": str(row.document_id),
            "section_number": row.section_number,
            "section_title": row.section_title,
            "text": row.text,
            "province": row.province,
            "act_name": row.act_name,
            "source_file": row.source_file,
        }

    for row in sem_rows:
        row_id = str(row.id)
        if row_id not in candidates:
            candidates[row_id] = {
                "id": row_id,
                "document_id": str(row.document_id),
                "section_number": row.section_number,
                "section_title": row.section_title,
                "text": row.text,
                "province": row.province,
                "act_name": row.act_name,
                "source_file": row.source_file,
            }

    if not candidates:
        return []

    # --- Re-rank merged candidates by cosine similarity ---
    candidate_ids = list(candidates.keys())

    # Fetch cosine scores for all merged candidates in one query
    rerank_sql = text("""
        SELECT id::text,
               1 - (embedding <=> :embedding ::vector) AS cosine_sim
        FROM chunks
        WHERE id = ANY(:ids ::uuid[])
          AND embedding IS NOT NULL
    """)
    rerank_result = await db.execute(
        rerank_sql,
        {"embedding": embedding_str, "ids": candidate_ids},
    )

    scores: dict[str, float] = {str(row.id): row.cosine_sim for row in rerank_result.fetchall()}

    ranked = sorted(candidates.values(), key=lambda c: scores.get(c["id"], 0.0), reverse=True)
    top = ranked[:k]

    return [
        RetrievedChunk(
            id=c["id"],
            document_id=c["document_id"],
            section_number=c["section_number"],
            section_title=c["section_title"],
            text=c["text"],
            province=c["province"],
            act_name=c["act_name"],
            source_file=c["source_file"],
            score=scores.get(c["id"], 0.0),
        )
        for c in top
    ]
