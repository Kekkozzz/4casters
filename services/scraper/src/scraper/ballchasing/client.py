"""Ballchasing.com REST client with API-key auth + rate limiting.

Reference: https://ballchasing.com/doc/api

The free patron tier allows 2 calls/second and 500 calls/hour. We
enforce the per-second cap via asyncio.Lock + min-interval; the hourly
cap is left to the caller (the backfill pipeline backs off on 429).
"""

from __future__ import annotations

import asyncio
import time
from types import TracebackType
from typing import Any, Self

import httpx

DEFAULT_BASE_URL = "https://ballchasing.com/api"


class BallchasingError(RuntimeError):
    """Generic failure talking to ballchasing (HTTP, transport, parsing)."""


class BallchasingNotFoundError(BallchasingError):
    """Ballchasing returned 404 (group/replay id unknown)."""


class BallchasingAuthError(BallchasingError):
    """Ballchasing returned 401 — token is missing or invalid."""


class BallchasingRateLimitError(BallchasingError):
    """Ballchasing returned 429 — hourly cap hit, caller should back off."""


class BallchasingClient:
    def __init__(
        self,
        *,
        api_key: str,
        min_interval_seconds: float = 0.5,
        base_url: str = DEFAULT_BASE_URL,
        timeout_seconds: float = 20.0,
    ) -> None:
        if not api_key or not api_key.strip():
            raise ValueError("api-key is required (set BALLCHASING_API_KEY in .env)")
        self._api_key = api_key.strip()
        self._min_interval = max(0.0, min_interval_seconds)
        self._base_url = base_url.rstrip("/")
        self._lock = asyncio.Lock()
        self._last_request_at = 0.0
        self._client = httpx.AsyncClient(
            headers={
                "Authorization": self._api_key,
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
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
        await self.aclose()

    async def aclose(self) -> None:
        await self._client.aclose()

    async def get_group(self, group_id: str) -> dict[str, Any]:
        """Fetch a group (cumulative + game-average stats) by id."""
        return await self._get(f"/groups/{group_id}")

    async def search_groups(
        self,
        *,
        name: str | None = None,
        created_after: str | None = None,
        created_before: str | None = None,
        count: int = 25,
    ) -> list[dict[str, Any]]:
        params: dict[str, str] = {"count": str(count)}
        if name:
            params["name"] = name
        if created_after:
            params["created-after"] = created_after
        if created_before:
            params["created-before"] = created_before
        payload = await self._get("/groups", params=params)
        groups = payload.get("list")
        if not isinstance(groups, list):
            raise BallchasingError("unexpected /groups response shape")
        return groups

    async def _get(
        self, path: str, *, params: dict[str, str] | None = None
    ) -> dict[str, Any]:
        async with self._lock:
            await self._respect_rate_limit()
            try:
                resp = await self._client.get(
                    self._base_url + path, params=params
                )
            except httpx.HTTPError as exc:
                raise BallchasingError(f"transport error: {exc}") from exc
            finally:
                self._last_request_at = time.perf_counter()
            if resp.status_code == 404:
                raise BallchasingNotFoundError(f"{path} not found")
            if resp.status_code == 401:
                raise BallchasingAuthError("invalid or missing API token")
            if resp.status_code == 429:
                raise BallchasingRateLimitError("hourly cap hit")
            if resp.status_code >= 400:
                raise BallchasingError(
                    f"HTTP {resp.status_code} from ballchasing: {resp.text[:200]}"
                )
            try:
                payload = resp.json()
            except ValueError as exc:
                raise BallchasingError(f"non-json response: {exc}") from exc
            if not isinstance(payload, dict):
                raise BallchasingError("ballchasing response was not a JSON object")
            return payload

    async def _respect_rate_limit(self) -> None:
        if self._min_interval <= 0 or self._last_request_at == 0:
            return
        elapsed = time.perf_counter() - self._last_request_at
        wait = self._min_interval - elapsed
        if wait > 0:
            await asyncio.sleep(wait)
