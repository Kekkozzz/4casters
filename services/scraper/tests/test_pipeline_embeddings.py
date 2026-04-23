"""Tests for the embedding backfill pipeline."""

from __future__ import annotations

from typing import Any

import pytest

from scraper.db.repo import LiquipediaRepo
from scraper.pipeline_embeddings import backfill_embeddings
from scraper.quotes.embeddings import EMBEDDING_DIMS, GeminiEmbeddingError


class FakeConn:
    """Minimal executor that tracks updates and simulates a quotes queue."""

    def __init__(self, queue: list[tuple[str, str]]) -> None:
        self._queue = queue
        self.updates: dict[str, str] = {}  # id -> embedding literal

    async def execute(self, query: str, *args: Any) -> Any:
        if "UPDATE quotes" in query:
            literal, qid = args
            self.updates[qid] = literal
        return "OK"

    async def fetchrow(self, query: str, *args: Any) -> Any:
        return None

    async def fetch(self, query: str, *args: Any) -> Any:
        (limit,) = args
        # Consume from queue (the previous batches have now been UPDATEd so
        # they no longer match the embedding IS NULL filter).
        already_updated = set(self.updates.keys())
        available = [row for row in self._queue if row[0] not in already_updated]
        batch = available[:limit]
        return [{"id": qid, "text": text} for qid, text in batch]


class FakeEmbedder:
    """Returns deterministic vectors, records every call."""

    def __init__(self, raise_on_call: int | None = None) -> None:
        self.calls: list[list[str]] = []
        self._raise_on_call = raise_on_call

    async def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(list(texts))
        if self._raise_on_call is not None and len(self.calls) == self._raise_on_call:
            raise GeminiEmbeddingError("simulated failure")
        return [[float(i + 1)] * EMBEDDING_DIMS for i, _ in enumerate(texts)]


@pytest.mark.asyncio
async def test_backfills_all_rows_in_batches() -> None:
    queue = [(f"q{i}", f"text {i}") for i in range(5)]
    conn = FakeConn(queue=queue)
    repo = LiquipediaRepo(conn)
    embedder = FakeEmbedder()

    report = await backfill_embeddings(
        repo=repo, embedder=embedder, batch_size=2  # type: ignore[arg-type]
    )

    assert report.embeddings_written == 5
    assert report.batches_processed == 3  # 2 + 2 + 1
    assert report.errors == []
    assert set(conn.updates.keys()) == {f"q{i}" for i in range(5)}


@pytest.mark.asyncio
async def test_respects_max_rows_cap() -> None:
    queue = [(f"q{i}", f"text {i}") for i in range(10)]
    conn = FakeConn(queue=queue)
    repo = LiquipediaRepo(conn)
    embedder = FakeEmbedder()

    report = await backfill_embeddings(
        repo=repo, embedder=embedder, batch_size=3, max_rows=5  # type: ignore[arg-type]
    )

    assert report.embeddings_written == 5


@pytest.mark.asyncio
async def test_stops_on_embedder_error_and_surfaces_it() -> None:
    queue = [(f"q{i}", f"text {i}") for i in range(10)]
    conn = FakeConn(queue=queue)
    repo = LiquipediaRepo(conn)
    embedder = FakeEmbedder(raise_on_call=2)  # second batch raises

    report = await backfill_embeddings(
        repo=repo, embedder=embedder, batch_size=3  # type: ignore[arg-type]
    )

    assert report.embeddings_written == 3  # first batch went through
    assert any("simulated failure" in e for e in report.errors)


@pytest.mark.asyncio
async def test_noop_when_queue_is_empty() -> None:
    conn = FakeConn(queue=[])
    repo = LiquipediaRepo(conn)
    embedder = FakeEmbedder()

    report = await backfill_embeddings(repo=repo, embedder=embedder)  # type: ignore[arg-type]
    assert report.embeddings_written == 0
    assert report.batches_processed == 0
