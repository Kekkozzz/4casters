"""Gemini REST embedder for the quote corpus.

Uses `models/text-embedding-004` which produces 768-dim vectors,
matching our schema's `vector(768)` column. Plain REST via httpx —
no SDK dependency needed for this small surface.

Reference: https://ai.google.dev/api/embeddings#method:-models.batchembedcontents
"""

from __future__ import annotations

import asyncio
import time
from types import TracebackType
from typing import Any, Self

import httpx

DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = "text-embedding-004"
EMBEDDING_DIMS = 768


class GeminiEmbeddingError(RuntimeError):
    """Generic failure talking to Gemini embeddings endpoint."""


class GeminiEmbedder:
    def __init__(
        self,
        *,
        api_key: str,
        min_interval_seconds: float = 0.05,
        model: str = DEFAULT_MODEL,
        base_url: str = DEFAULT_BASE_URL,
        timeout_seconds: float = 30.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("api-key is required (set GEMINI_API_KEY in .env)")
        self._api_key = api_key.strip()
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._min_interval = max(0.0, min_interval_seconds)
        self._lock = asyncio.Lock()
        self._last_request_at = 0.0
        self._client = httpx.AsyncClient(
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=timeout_seconds,
        )

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self._client.aclose()

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one 768-dim embedding vector per input text."""
        if not texts:
            return []
        body = {
            "requests": [
                {
                    "model": f"models/{self._model}",
                    "content": {"parts": [{"text": text}]},
                }
                for text in texts
            ]
        }
        async with self._lock:
            await self._respect_rate_limit()
            try:
                resp = await self._client.post(
                    f"{self._base_url}/models/{self._model}:batchEmbedContents",
                    params={"key": self._api_key},
                    json=body,
                )
            except httpx.HTTPError as exc:
                raise GeminiEmbeddingError(f"transport error: {exc}") from exc
            finally:
                self._last_request_at = time.perf_counter()

            if resp.status_code == 401:
                raise GeminiEmbeddingError("unauthorized: check GEMINI_API_KEY")
            if resp.status_code == 429:
                raise GeminiEmbeddingError("rate limited; backoff required")
            if resp.status_code >= 400:
                raise GeminiEmbeddingError(
                    f"HTTP {resp.status_code}: {resp.text[:200]}"
                )
            try:
                payload: Any = resp.json()
            except ValueError as exc:
                raise GeminiEmbeddingError(f"non-json response: {exc}") from exc

        embeddings = payload.get("embeddings")
        if not isinstance(embeddings, list):
            raise GeminiEmbeddingError("response missing embeddings array")
        if len(embeddings) != len(texts):
            raise GeminiEmbeddingError(
                f"embeddings count mismatch: got {len(embeddings)}, expected {len(texts)}"
            )
        vectors: list[list[float]] = []
        for entry in embeddings:
            values = entry.get("values") if isinstance(entry, dict) else None
            if not isinstance(values, list) or len(values) != EMBEDDING_DIMS:
                raise GeminiEmbeddingError(
                    f"unexpected embedding dimension (expected {EMBEDDING_DIMS})"
                )
            vectors.append([float(v) for v in values])
        return vectors

    async def _respect_rate_limit(self) -> None:
        if self._min_interval <= 0 or self._last_request_at == 0:
            return
        elapsed = time.perf_counter() - self._last_request_at
        wait = self._min_interval - elapsed
        if wait > 0:
            await asyncio.sleep(wait)
