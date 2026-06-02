from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_active_subscriber
from backend.database import get_db
from backend.models.user import User
from backend.models.question import Question
from backend.services.retriever import hybrid_retrieve
from backend.services.answerer import answer_question

router = APIRouter(prefix="/ask", tags=["ask"])


class AskRequest(BaseModel):
    query: str


class AskResponse(BaseModel):
    answer: str
    chunks_used: int
    citations: list[dict]


@router.post("", response_model=AskResponse)
async def ask(
    body: AskRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_active_subscriber),
):
    query = body.query.strip()
    if not query:
        return AskResponse(answer="Please enter a question.", chunks_used=0, citations=[])

    chunks = await hybrid_retrieve(db, query)
    answer = await answer_question(query, chunks)

    # Audit log
    question = Question(
        user_id=user.id,
        query=query,
        retrieved_chunk_ids=[c.id for c in chunks],
        answer=answer,
    )
    db.add(question)
    user.question_count = (user.question_count or 0) + 1

    citations = [
        {
            "section_number": c.section_number,
            "section_title": c.section_title,
            "act_name": c.act_name,
            "province": c.province,
            "score": round(c.score, 4),
        }
        for c in chunks
    ]

    return AskResponse(answer=answer, chunks_used=len(chunks), citations=citations)
