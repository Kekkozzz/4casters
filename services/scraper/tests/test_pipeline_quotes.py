"""End-to-end tests for Phase A quote ingestion."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from scraper.db.repo import LiquipediaRepo
from scraper.liquipedia.client import LiquipediaNotFoundError
from scraper.pipeline_quotes import ingest_liquipedia_quotes

FIXTURES = Path(__file__).parent / "fixtures"


class FakeLiquipediaClient:
    def __init__(self, pages: dict[str, str]) -> None:
        self._pages = pages

    async def get_wikitext(self, page: str) -> str:
        if page not in self._pages:
            raise LiquipediaNotFoundError(page)
        return self._pages[page]


class FakeConn:
    def __init__(self) -> None:
        self.inserted_hashes: set[str] = set()

    async def execute(self, query: str, *args: Any) -> Any:
        return "OK"

    async def fetchrow(self, query: str, *args: Any) -> Any:
        # _UPSERT_QUOTE binds: speaker_id, text, url, source_type, ts, hash
        if "INSERT INTO quotes" in query:
            quote_hash = args[5]
            if quote_hash in self.inserted_hashes:
                return None  # simulate ON CONFLICT DO NOTHING
            self.inserted_hashes.add(quote_hash)
            return {"id": f"uuid-{len(self.inserted_hashes)}"}
        return None


@pytest.mark.asyncio
async def test_ingest_happy_path_inserts_all_quotes() -> None:
    wikitext = (FIXTURES / "player_itachi_with_quotes.wikitext").read_text(encoding="utf-8")
    client = FakeLiquipediaClient(pages={"itachi": wikitext})
    conn = FakeConn()
    repo = LiquipediaRepo(conn)

    report = await ingest_liquipedia_quotes(["itachi"], client=client, repo=repo)

    assert report.total_players_processed == 1
    assert report.quotes_inserted >= 3
    assert report.quotes_deduped == 0
    assert report.errors == []


@pytest.mark.asyncio
async def test_ingest_deduplicates_second_run() -> None:
    wikitext = (FIXTURES / "player_itachi_with_quotes.wikitext").read_text(encoding="utf-8")
    client = FakeLiquipediaClient(pages={"itachi": wikitext})
    conn = FakeConn()
    repo = LiquipediaRepo(conn)

    first = await ingest_liquipedia_quotes(["itachi"], client=client, repo=repo)
    second = await ingest_liquipedia_quotes(["itachi"], client=client, repo=repo)

    assert second.quotes_inserted == 0
    assert second.quotes_deduped == first.quotes_inserted


@pytest.mark.asyncio
async def test_ingest_skips_player_missing_on_liquipedia() -> None:
    client = FakeLiquipediaClient(pages={})  # nobody has a page
    repo = LiquipediaRepo(FakeConn())

    report = await ingest_liquipedia_quotes(
        ["ghost_player"], client=client, repo=repo
    )
    assert "ghost_player" in report.players_skipped
    assert report.quotes_inserted == 0


@pytest.mark.asyncio
async def test_ingest_collects_errors_per_player() -> None:
    # Player page exists but wikitext has no quotes → processed, 0 inserts.
    client = FakeLiquipediaClient(
        pages={"plain": "{{Infobox player|id=plain|name=p|nationality=x}}"}
    )
    repo = LiquipediaRepo(FakeConn())

    report = await ingest_liquipedia_quotes(["plain"], client=client, repo=repo)
    assert report.total_players_processed == 1
    assert report.quotes_inserted == 0
    assert report.errors == []
    assert report.players_skipped == []
