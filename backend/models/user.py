from sqlalchemy import Column, String, Boolean, DateTime, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from backend.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class SubscriptionStatus(str, enum.Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    cancelled = "cancelled"
    none = "none"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.user)
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verification_token = Column(String(255), nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True, unique=True)
    stripe_subscription_id = Column(String(255), nullable=True, unique=True)
    subscription_status = Column(
        SAEnum(SubscriptionStatus),
        nullable=False,
        default=SubscriptionStatus.none,
    )
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)
    question_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    questions = relationship("Question", back_populates="user", cascade="all, delete-orphan")
