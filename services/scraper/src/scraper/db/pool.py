"""asyncpg connection pool lifecycle helpers."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import asyncpg  # type: ignore[import-untyped]

from scraper.config import get_settings


@asynccontextmanager
async def pool_from_settings() -> AsyncIterator[asyncpg.Pool]:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError(
            "DATABASE_URL is not set; add it to the repo-root .env before running "
            "any db-touching command."
        )
    pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=1,
        max_size=4,
        statement_cache_size=0,  # required for Supabase transaction pooler
    )
    try:
        yield pool
    finally:
        await pool.close()
