"""Backfill Gemini embeddings for quotes with NULL embedding column.

Runs in batches (default 100) and stops when there's nothing left or
the caller-specified cap is reached. Designed to be crash-safe: each
batch is embedded then UPDATEd; a crash halfway leaves remaining rows
still NULL for the next run.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from scraper.db.repo import LiquipediaRepo
from scraper.quotes.embeddings import GeminiEmbedder, GeminiEmbeddingError

logger = logging.getLogger(__name__)


@dataclass
class EmbeddingBackfillReport:
    batches_processed: int = 0
    embeddings_written: int = 0
    errors: list[str] = field(default_factory=list)


async def backfill_embeddings(
    *,
    repo: LiquipediaRepo,
    embedder: GeminiEmbedder,
    batch_size: int = 100,
    max_rows: int | None = None,
) -> EmbeddingBackfillReport:
    report = EmbeddingBackfillReport()
    remaining = max_rows

    while True:
        to_fetch = batch_size if remaining is None else min(batch_size, remaining)
        if to_fetch <= 0:
            break

        rows = await repo.fetch_quotes_missing_embedding(to_fetch)
        if not rows:
            break

        ids = [row[0] for row in rows]
        texts = [row[1] for row in rows]

        try:
            vectors = await embedder.embed(texts)
        except GeminiEmbeddingError as exc:
            report.errors.append(f"batch failed: {exc}")
            break

        for quote_id, vector in zip(ids, vectors, strict=True):
            try:
                await repo.set_quote_embedding(quote_id, vector)
            except Exception as exc:
                report.errors.append(f"{quote_id}: update failed: {exc}")
                continue
            report.embeddings_written += 1

        report.batches_processed += 1
        if remaining is not None:
            remaining -= len(rows)

    return report
