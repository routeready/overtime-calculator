"""Initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("admin", "user", name="userrole"), nullable=False,
                  server_default="user"),
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("email_verification_token", sa.String(255), nullable=True),
        sa.Column("password_reset_token", sa.String(255), nullable=True),
        sa.Column("password_reset_expires", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True, unique=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True, unique=True),
        sa.Column("subscription_status",
                  sa.Enum("trialing", "active", "past_due", "cancelled", "none",
                          name="subscriptionstatus"),
                  nullable=False, server_default="none"),
        sa.Column("subscription_end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("province", sa.String(100), nullable=True),
        sa.Column("act_name", sa.String(512), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ingestion_status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("ingestion_error", sa.Text(), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("update_available", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("pending_update_url", sa.Text(), nullable=True),
    )

    op.create_table(
        "chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("document_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("section_number", sa.String(100), nullable=True),
        sa.Column("section_title", sa.String(512), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("province", sa.String(100), nullable=True),
        sa.Column("act_name", sa.String(512), nullable=True),
        sa.Column("source_file", sa.String(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
    )

    # Add the pgvector column — must be done via raw SQL since SA doesn't know vector type
    op.execute("ALTER TABLE chunks ADD COLUMN embedding vector(1024)")
    # HNSW index works on empty tables (unlike IVFFlat which requires data)
    op.execute("CREATE INDEX ix_chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops)")
    op.create_index("ix_chunks_document_id", "chunks", ["document_id"])

    # Full-text search index on chunk text
    op.execute("""
        ALTER TABLE chunks ADD COLUMN textsearch tsvector
        GENERATED ALWAYS AS (to_tsvector('english', coalesce(text, ''))) STORED
    """)
    op.execute("CREATE INDEX ix_chunks_textsearch ON chunks USING GIN(textsearch)")

    op.create_table(
        "questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("uuid_generate_v4()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("retrieved_chunk_ids", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"),
                  nullable=False),
    )
    op.create_index("ix_questions_user_id", "questions", ["user_id"])


def downgrade() -> None:
    op.drop_table("questions")
    op.drop_table("chunks")
    op.drop_table("documents")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
