from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
import uuid
from backend.database import Base
from backend.config import settings


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    section_number = Column(String(100), nullable=True)
    section_title = Column(String(512), nullable=True)
    text = Column(Text, nullable=False)
    embedding = Column(Vector(settings.embedding_dim), nullable=True)
    province = Column(String(100), nullable=True)
    act_name = Column(String(512), nullable=True)
    source_file = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    document = relationship("Document", back_populates="chunks")

    # HNSW vector index is created via raw SQL in the migration (not declared here
    # to avoid Alembic autogenerate conflicts with pgvector-specific index syntax).
