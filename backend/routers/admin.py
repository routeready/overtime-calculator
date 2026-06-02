import asyncio
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth import get_current_admin
from backend.database import get_db
from backend.models.user import User, UserRole, SubscriptionStatus
from backend.models.document import Document
from backend.models.chunk import Chunk
from backend.services.ingest import ingest_document

router = APIRouter(prefix="/admin", tags=["admin"])

UPLOAD_DIR = Path("corpus")


# --- Users ---

@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "role": u.role,
            "email_verified": u.email_verified,
            "subscription_status": u.subscription_status,
            "subscription_end_date": u.subscription_end_date,
            "question_count": u.question_count,
            "created_at": u.created_at,
        }
        for u in users
    ]


class UpdateUserRequest(BaseModel):
    role: UserRole | None = None
    subscription_status: SubscriptionStatus | None = None


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body: UpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if body.role is not None:
        user.role = body.role
    if body.subscription_status is not None:
        user.subscription_status = body.subscription_status

    return {"message": "User updated"}


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    if str(admin.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)


# --- Documents ---

@router.get("/documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(Document).order_by(Document.ingested_at.desc()))
    docs = result.scalars().all()
    return [
        {
            "id": str(d.id),
            "filename": d.filename,
            "province": d.province,
            "act_name": d.act_name,
            "chunk_count": d.chunk_count,
            "ingested_at": d.ingested_at,
            "ingestion_status": d.ingestion_status,
            "ingestion_error": d.ingestion_error,
            "update_available": d.update_available,
        }
        for d in docs
    ]


@router.post("/documents/upload", status_code=202)
async def upload_document(
    file: UploadFile = File(...),
    province: str = Form(None),
    act_name: str = Form(None),
    source_url: str = Form(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    UPLOAD_DIR.mkdir(exist_ok=True)
    dest = UPLOAD_DIR / file.filename
    content = await file.read()
    dest.write_bytes(content)

    doc = await ingest_document(db, dest, province=province, act_name=act_name,
                                source_url=source_url)
    return {"document_id": str(doc.id), "status": doc.ingestion_status}


@router.post("/documents/{doc_id}/reingest", status_code=202)
async def reingest_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    path = UPLOAD_DIR / doc.filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Source file not found on disk")

    doc = await ingest_document(db, path, province=doc.province, act_name=doc.act_name,
                                source_url=doc.source_url)
    return {"document_id": str(doc.id), "status": doc.ingestion_status}


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)


# --- Stats ---

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user_count = await db.scalar(select(func.count(User.id)))
    doc_count = await db.scalar(select(func.count(Document.id)))
    chunk_count = await db.scalar(select(func.count(Chunk.id)))
    return {
        "user_count": user_count,
        "document_count": doc_count,
        "chunk_count": chunk_count,
    }
