from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from backend.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(512), nullable=False)
    province = Column(String(100), nullable=True)
    act_name = Column(String(512), nullable=True)
    source_url = Column(Text, nullable=True)
    chunk_count = Column(Integer, default=0, nullable=False)
    ingested_at = Column(DateTime(timezone=True), nullable=True)
    ingestion_status = Column(String(50), default="pending", nullable=False)
    ingestion_error = Column(Text, nullable=True)

    # Scaffold columns for future reg monitoring (not functional at launch)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    update_available = Column(Boolean, default=False, nullable=False)
    pending_update_url = Column(Text, nullable=True)

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
