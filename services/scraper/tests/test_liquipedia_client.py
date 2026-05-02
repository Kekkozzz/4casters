"""Tests for LiquipediaClient: UA compliance, rate limiting, wikitext/html fetch."""

from __future__ import annotations

import asyncio
import time

import httpx
import pytest
import respx

from scraper.liquipedia.client import (
    LiquipediaClient,
    LiquipediaError,
    LiquipediaNotFoundError,
)

API_URL = "https://liquipedia.net/rocketleague/api.php"


@pytest.fixture
def ua() -> str:
    return "4casters-test/0.0 (https://github.com/Kekkozzz/4casters; test@4casters.app)"


def _query_wikitext_payload(text: str = "y", title: str = "X") -> dict[str, object]:
    return {
        "query": {
            "pages": [
                {
                    "pageid": 1,
                    "title": title,
                    "revisions": [
                        {"slots": {"main": {"content": text}}},
                    ],
                }
            ]
        }
    }


@pytest.mark.asyncio
@respx.mock
async def test_get_wikitext_returns_content(ua: str) -> None:
    respx.get(API_URL).mock(
        return_value=httpx.Response(
            200,
            json=_query_wikitext_payload(
                "{{Infobox league|name=RLCS 2026}}", title="RLCS_2026"
            ),
        )
    )
    async with LiquipediaClient(user_agent=ua, min_interval_seconds=0.0) as client:
        text = await client.get_wikitext("RLCS_2026")
    assert "Infobox league" in text


@pytest.mark.asyncio
@respx.mock
async def test_sends_required_user_agent(ua: str) -> None:
    route = respx.get(API_URL).mock(
        return_value=httpx.Response(200, json=_query_wikitext_payload())
    )
    async with LiquipediaClient(user_agent=ua, min_interval_seconds=0.0) as client:
        await client.get_wikitext("X")
    assert route.called
    sent = route.calls.last.request
    assert sent.headers["user-agent"] == ua
    assert sent.headers["accept-encoding"].lower().find("gzip") >= 0
    params = dict(sent.url.params)
    assert params.get("action") == "query"
    assert params.get("prop") == "revisions"
    assert params.get("rvprop") == "content"


@pytest.mark.asyncio
async def test_requires_user_agent_with_contact() -> None:
    with pytest.raises(ValueError, match=r"user.?agent"):
        LiquipediaClient(user_agent="", min_interval_seconds=0.0)
    with pytest.raises(ValueError, match="contact"):
        LiquipediaClient(user_agent="4casters/0.1", min_interval_seconds=0.0)


@pytest.mark.asyncio
@respx.mock
async def test_rate_limit_spaces_requests(ua: str) -> None:
    respx.get(API_URL).mock(
        return_value=httpx.Response(200, json=_query_wikitext_payload())
    )
    async with LiquipediaClient(user_agent=ua, min_interval_seconds=0.25) as client:
        t0 = time.perf_counter()
        await client.get_wikitext("A")
        await client.get_wikitext("B")
        await client.get_wikitext("C")
        elapsed = time.perf_counter() - t0
    assert elapsed >= 0.5, f"expected >= 0.5s with 0.25s interval, got {elapsed:.3f}"


@pytest.mark.asyncio
@respx.mock
async def test_raises_not_found_when_page_missing(ua: str) -> None:
    respx.get(API_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "query": {
                    "pages": [
                        {"title": "Nonexistent_Page", "missing": True},
                    ]
                }
            },
        )
    )
    async with LiquipediaClient(user_agent=ua, min_interval_seconds=0.0) as client:
        with pytest.raises(LiquipediaNotFoundError):
            await client.get_wikitext("Nonexistent_Page")


@pytest.mark.asyncio
@respx.mock
async def test_raises_on_http_error(ua: str) -> None:
    respx.get(API_URL).mock(return_value=httpx.Response(503, text="boom"))
    async with LiquipediaClient(user_agent=ua, min_interval_seconds=0.0) as client:
        with pytest.raises(LiquipediaError):
            await client.get_wikitext("X")


@pytest.mark.asyncio
@respx.mock
async def test_get_html_uses_prop_text(ua: str) -> None:
    route = respx.get(API_URL).mock(
        return_value=httpx.Response(
            200,
            json={
                "parse": {"title": "X", "text": {"*": "<p>hello</p>"}}
            },
        )
    )
    async with LiquipediaClient(user_agent=ua, min_interval_seconds=0.0) as client:
        html = await client.get_html("X")
    assert "<p>hello</p>" in html
    params = dict(route.calls.last.request.url.params)
    assert params.get("prop") == "text"
    assert params.get("format") == "json"


@pytest.mark.asyncio
@respx.mock
async def test_concurrent_calls_still_serialize(ua: str) -> None:
    respx.get(API_URL).mock(
        return_value=httpx.Response(200, json=_query_wikitext_payload())
    )
    async with LiquipediaClient(user_agent=ua, min_interval_seconds=0.15) as client:
        t0 = time.perf_counter()
        await asyncio.gather(
            client.get_wikitext("A"),
            client.get_wikitext("B"),
            client.get_wikitext("C"),
        )
        elapsed = time.perf_counter() - t0
    assert elapsed >= 0.30, f"expected serialized >= 0.30s, got {elapsed:.3f}"
