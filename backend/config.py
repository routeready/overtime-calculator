from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_port: int = 8001
    app_secret_key: str = "changeme"
    environment: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://miningbible:password@localhost:5432/miningbible"

    # Claude
    anthropic_api_key: str = ""
    claude_model: str = "claude-opus-4-8"

    # Voyage AI embeddings
    voyage_api_key: str = ""
    embedding_model: str = "voyage-law-2"
    embedding_dim: int = 1024

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id: str = ""

    # Email
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "noreply@mineready.io"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:8001"

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Trial period (days)
    trial_days: int = 7

    # Retrieval
    retrieval_top_k: int = 6
    max_chunk_tokens: int = 1000

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
