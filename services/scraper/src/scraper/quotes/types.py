"""Shared types for the quote corpus ingestion layer.

All sources (liquipedia/youtube/twitter) produce ParsedQuote records
with the same shape so the repo and dedup logic don't care which
pipeline fed them.

Guardrail: a ParsedQuote is not valid without a non-empty speaker_id
AND a non-empty source_url. The pydantic model enforces this; callers
can catch ValidationError to skip malformed entries.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class QuoteSource(StrEnum):
    LIQUIPEDIA = "liquipedia"
    YOUTUBE = "youtube"
    TWITTER = "twitter"


_WHITESPACE_RE = re.compile(r"\s+")


def normalize_quote_text(text: str) -> str:
    """Canonicalize a quote string before hashing.

    - NFKC unicode normalization (collapses full-width etc.)
    - Strip surrounding quote marks / whitespace
    - Lowercase
    - Collapse internal whitespace to a single space

    This is ONLY used for dedup hashing, not for storage. The
    original text (with original casing, punctuation, smart quotes)
    is what gets saved and shown to users.
    """
    value = unicodedata.normalize("NFKC", text)
    # Strip ASCII and common Unicode quote marks from both ends.
    smart_quotes = "“”‘’"
    value = value.strip().strip('"').strip("'").strip(smart_quotes)
    value = _WHITESPACE_RE.sub(" ", value)
    return value.lower().strip()


def content_hash(text: str) -> str:
    """SHA-256 of the normalized quote text. Deterministic."""
    normalized = normalize_quote_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class ParsedQuote(BaseModel):
    speaker_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    source_url: str = Field(..., min_length=1)
    source_type: QuoteSource
    source_timestamp: datetime | None = None

    @property
    def hash(self) -> str:
        return content_hash(self.text)
