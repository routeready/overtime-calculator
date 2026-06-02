import voyageai
from backend.config import settings

_client: voyageai.AsyncClient | None = None


def _get_client() -> voyageai.AsyncClient:
    global _client
    if _client is None:
        _client = voyageai.AsyncClient(api_key=settings.voyage_api_key)
    return _client


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts using Voyage voyage-law-2. Returns list of 1024-dim vectors."""
    client = _get_client()
    result = await client.embed(
        texts=texts,
        model=settings.embedding_model,
        input_type="document",
    )
    return result.embeddings


async def embed_query(query: str) -> list[float]:
    """Embed a single query string for retrieval."""
    client = _get_client()
    result = await client.embed(
        texts=[query],
        model=settings.embedding_model,
        input_type="query",
    )
    return result.embeddings[0]
