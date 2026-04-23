"""Tests for GeminiEmbedder: REST client for batch text embeddings."""

from __future__ import annotations

import httpx
import pytest
import respx

from scraper.quotes.embeddings import (
    EMBEDDING_DIMS,
    GeminiEmbedder,
    GeminiEmbeddingError,
)

BASE = "https://generativelanguage.googleapis.com/v1beta"


@pytest.mark.asyncio
@respx.mock
async def test_embed_returns_vectors_for_each_text() -> None:
    respx.post(f"{BASE}/models/text-embedding-004:batchEmbedContents").mock(
        return_value=httpx.Response(
            200,
            json={
                "embeddings": [
                    {"values": [0.1] * EMBEDDING_DIMS},
                    {"values": [0.2] * EMBEDDING_DIMS},
                ]
            },
        )
    )
    async with GeminiEmbedder(api_key="k", min_interval_seconds=0.0) as embedder:
        vectors = await embedder.embed(["quote one", "quote two"])
    assert len(vectors) == 2
    assert all(len(v) == EMBEDDING_DIMS for v in vectors)
    assert vectors[0][0] == pytest.approx(0.1)


@pytest.mark.asyncio
@respx.mock
async def test_embed_sends_api_key_as_query_param() -> None:
    route = respx.post(f"{BASE}/models/text-embedding-004:batchEmbedContents").mock(
        return_value=httpx.Response(
            200, json={"embeddings": [{"values": [0.1] * EMBEDDING_DIMS}]}
        )
    )
    async with GeminiEmbedder(api_key="secret-key", min_interval_seconds=0.0) as e:
        await e.embed(["x"])
    sent = route.calls.last.request
    assert sent.url.params.get("key") == "secret-key"


@pytest.mark.asyncio
async def test_requires_api_key() -> None:
    with pytest.raises(ValueError, match=r"api.?key"):
        GeminiEmbedder(api_key="", min_interval_seconds=0.0)


@pytest.mark.asyncio
async def test_embed_empty_list_short_circuits() -> None:
    async with GeminiEmbedder(api_key="k", min_interval_seconds=0.0) as embedder:
        assert await embedder.embed([]) == []


@pytest.mark.asyncio
@respx.mock
async def test_embed_validates_response_dimensions() -> None:
    respx.post(f"{BASE}/models/text-embedding-004:batchEmbedContents").mock(
        return_value=httpx.Response(
            200, json={"embeddings": [{"values": [0.1, 0.2, 0.3]}]}
        )
    )
    async with GeminiEmbedder(api_key="k", min_interval_seconds=0.0) as embedder:
        with pytest.raises(GeminiEmbeddingError, match="dimension"):
            await embedder.embed(["x"])


@pytest.mark.asyncio
@respx.mock
async def test_embed_raises_on_http_error() -> None:
    respx.post(f"{BASE}/models/text-embedding-004:batchEmbedContents").mock(
        return_value=httpx.Response(503, text="boom")
    )
    async with GeminiEmbedder(api_key="k", min_interval_seconds=0.0) as embedder:
        with pytest.raises(GeminiEmbeddingError):
            await embedder.embed(["x"])


@pytest.mark.asyncio
@respx.mock
async def test_embed_raises_when_count_mismatch() -> None:
    respx.post(f"{BASE}/models/text-embedding-004:batchEmbedContents").mock(
        return_value=httpx.Response(
            200, json={"embeddings": [{"values": [0.1] * EMBEDDING_DIMS}]}
        )
    )
    async with GeminiEmbedder(api_key="k", min_interval_seconds=0.0) as embedder:
        with pytest.raises(GeminiEmbeddingError, match="count"):
            await embedder.embed(["a", "b"])
