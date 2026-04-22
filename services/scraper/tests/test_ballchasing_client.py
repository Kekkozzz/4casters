"""Tests for BallchasingClient: auth, rate limit, group fetch + search."""

from __future__ import annotations

import time

import httpx
import pytest
import respx

from scraper.ballchasing.client import (
    BallchasingClient,
    BallchasingError,
    BallchasingNotFoundError,
)

BASE = "https://ballchasing.com/api"


@pytest.mark.asyncio
@respx.mock
async def test_get_group_returns_json() -> None:
    respx.get(f"{BASE}/groups/rlcs-2026-major-1-eu").mock(
        return_value=httpx.Response(
            200,
            json={"id": "rlcs-2026-major-1-eu", "name": "RLCS 2026 Major 1 EU"},
        )
    )
    async with BallchasingClient(api_key="x", min_interval_seconds=0.0) as client:
        payload = await client.get_group("rlcs-2026-major-1-eu")
    assert payload["id"] == "rlcs-2026-major-1-eu"


@pytest.mark.asyncio
@respx.mock
async def test_sends_authorization_header() -> None:
    route = respx.get(f"{BASE}/groups/x").mock(
        return_value=httpx.Response(200, json={"id": "x"})
    )
    async with BallchasingClient(
        api_key="secret-token", min_interval_seconds=0.0
    ) as client:
        await client.get_group("x")
    assert route.called
    sent = route.calls.last.request
    assert sent.headers["authorization"] == "secret-token"


@pytest.mark.asyncio
async def test_requires_api_key() -> None:
    with pytest.raises(ValueError, match=r"api.?key"):
        BallchasingClient(api_key="", min_interval_seconds=0.0)


@pytest.mark.asyncio
@respx.mock
async def test_raises_not_found() -> None:
    respx.get(f"{BASE}/groups/missing").mock(
        return_value=httpx.Response(404, text="not found")
    )
    async with BallchasingClient(api_key="x", min_interval_seconds=0.0) as client:
        with pytest.raises(BallchasingNotFoundError):
            await client.get_group("missing")


@pytest.mark.asyncio
@respx.mock
async def test_raises_on_5xx() -> None:
    respx.get(f"{BASE}/groups/x").mock(
        return_value=httpx.Response(503, text="boom")
    )
    async with BallchasingClient(api_key="x", min_interval_seconds=0.0) as client:
        with pytest.raises(BallchasingError):
            await client.get_group("x")


@pytest.mark.asyncio
@respx.mock
async def test_search_groups_sends_params() -> None:
    route = respx.get(f"{BASE}/groups").mock(
        return_value=httpx.Response(
            200,
            json={
                "list": [
                    {"id": "a", "name": "RLCS 2026 Major 1", "created": "2026-03-10"},
                    {"id": "b", "name": "RLCS 2026 Major 1 EU", "created": "2026-03-14"},
                ]
            },
        )
    )
    async with BallchasingClient(api_key="x", min_interval_seconds=0.0) as client:
        results = await client.search_groups(name="RLCS 2026 Major 1")
    assert [g["id"] for g in results] == ["a", "b"]
    params = dict(route.calls.last.request.url.params)
    assert params.get("name") == "RLCS 2026 Major 1"


@pytest.mark.asyncio
@respx.mock
async def test_rate_limit_enforced() -> None:
    respx.get(f"{BASE}/groups/x").mock(
        return_value=httpx.Response(200, json={"id": "x"})
    )
    async with BallchasingClient(api_key="x", min_interval_seconds=0.2) as client:
        t0 = time.perf_counter()
        await client.get_group("x")
        await client.get_group("x")
        await client.get_group("x")
        elapsed = time.perf_counter() - t0
    assert elapsed >= 0.4, f"expected >= 0.4s, got {elapsed:.3f}"
