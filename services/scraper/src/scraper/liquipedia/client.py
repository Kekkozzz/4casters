"""Liquipedia MediaWiki API client with strict UA + rate limiting.

Liquipedia's API terms require a descriptive User-Agent that identifies the
app and a contact address, plus respect for a minimum interval between
requests. We serialize requests through an asyncio.Lock so concurrent
callers cannot bypass the limit.

Reference: https://liquipedia.net/api-terms-of-use
"""

from __future__ import annotations

import asyncio
import time
from types import TracebackType
from typing import Any, Self

import httpx

DEFAULT_BASE_URL = "https://liquipedia.net/rocketleague/api.php"


class LiquipediaError(RuntimeError):
    """Generic failure talking to Liquipedia (HTTP, transport, parsing)."""


class LiquipediaNotFoundError(LiquipediaError):
    """Liquipedia reported the page does not exist (missingtitle)."""


class LiquipediaClient:
    """Async client for Liquipedia's MediaWiki API.

    Wikitext is fetched through `action=query&prop=revisions`, because
    Liquipedia applies a much stricter limit to expensive `action=parse`
    requests. Rendered HTML still uses `action=parse` and has its own throttle.
    """

    def __init__(
        self,
        *,
        user_agent: str,
        min_interval_seconds: float = 2.0,
        parse_min_interval_seconds: float = 30.0,
        base_url: str = DEFAULT_BASE_URL,
        timeout_seconds: float = 20.0,
    ) -> None:
        if not user_agent or not user_agent.strip():
            raise ValueError("user-agent is required by Liquipedia API terms")
        if "@" not in user_agent and "http" not in user_agent:
            raise ValueError(
                "user-agent must include a contact email or URL per Liquipedia terms"
            )
        self._user_agent = user_agent.strip()
        self._min_interval = max(0.0, min_interval_seconds)
        self._parse_min_interval = max(0.0, parse_min_interval_seconds)
        self._base_url = base_url
        self._lock = asyncio.Lock()
        self._last_request_at: float = 0.0
        self._last_parse_request_at: float = 0.0
        self._client = httpx.AsyncClient(
            headers={
                "User-Agent": self._user_agent,
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

    async def get_wikitext(self, page: str) -> str:
        """Fetch raw wikitext for a page."""
        data = await self._query_revision(page)
        wikitext = _extract_revision_content(data)
        if not isinstance(wikitext, str):
            raise LiquipediaError(f"missing wikitext in response for page={page!r}")
        return wikitext

    async def get_html(self, page: str) -> str:
        """Fetch rendered HTML for a page (action=parse, prop=text)."""
        data = await self._parse(page, prop="text")
        html = data.get("text", {}).get("*")
        if not isinstance(html, str):
            raise LiquipediaError(f"missing html in response for page={page!r}")
        return html

    async def _query_revision(self, page: str) -> dict[str, Any]:
        params = {
            "action": "query",
            "format": "json",
            "formatversion": "2",
            "titles": page,
            "prop": "revisions",
            "rvprop": "content",
            "rvslots": "main",
            "redirects": "1",
        }
        payload = await self._request(params)
        if "error" in payload:
            err = payload["error"]
            code = err.get("code", "")
            info = err.get("info", "")
            if code == "missingtitle":
                raise LiquipediaNotFoundError(f"page not found: {page!r}")
            raise LiquipediaError(f"liquipedia error {code}: {info}")
        query = payload.get("query")
        if not isinstance(query, dict):
            raise LiquipediaError(f"unexpected response shape for page={page!r}")
        pages = query.get("pages")
        if not isinstance(pages, list) or not pages:
            raise LiquipediaError(f"missing page data for page={page!r}")
        page_data = pages[0]
        if not isinstance(page_data, dict):
            raise LiquipediaError(f"unexpected page data for page={page!r}")
        if page_data.get("missing") is True:
            raise LiquipediaNotFoundError(f"page not found: {page!r}")
        return page_data

    async def _parse(self, page: str, *, prop: str) -> dict[str, Any]:
        params = {
            "action": "parse",
            "format": "json",
            "page": page,
            "prop": prop,
            "redirects": "1",
        }
        payload = await self._request(params, parse_limited=True)
        if "error" in payload:
            err = payload["error"]
            code = err.get("code", "")
            info = err.get("info", "")
            if code == "missingtitle":
                raise LiquipediaNotFoundError(f"page not found: {page!r}")
            raise LiquipediaError(f"liquipedia error {code}: {info}")
        parse = payload.get("parse")
        if not isinstance(parse, dict):
            raise LiquipediaError(f"unexpected response shape for page={page!r}")
        return parse

    async def _request(
        self, params: dict[str, str], *, parse_limited: bool = False
    ) -> dict[str, Any]:
        # Retry transient 429s with exponential backoff; respect Retry-After
        # header when the server provides one. Max 4 attempts total.
        backoffs = [5.0, 15.0, 45.0]
        async with self._lock:
            for backoff in [*backoffs, None]:
                await self._respect_rate_limit(
                    last_request_at=self._last_request_at,
                    min_interval=self._min_interval,
                )
                if parse_limited:
                    await self._respect_rate_limit(
                        last_request_at=self._last_parse_request_at,
                        min_interval=self._parse_min_interval,
                    )
                try:
                    resp = await self._client.get(self._base_url, params=params)
                except httpx.HTTPError as exc:
                    raise LiquipediaError(f"transport error: {exc}") from exc
                finally:
                    now = time.perf_counter()
                    self._last_request_at = now
                    if parse_limited:
                        self._last_parse_request_at = now

                if resp.status_code == 429 and backoff is not None:
                    retry_after = resp.headers.get("retry-after")
                    wait_s = _parse_retry_after(retry_after) or backoff
                    await asyncio.sleep(wait_s)
                    continue

                if resp.status_code >= 400:
                    raise LiquipediaError(
                        f"HTTP {resp.status_code} from liquipedia: {resp.text[:200]}"
                    )
                try:
                    payload = resp.json()
                except ValueError as exc:
                    raise LiquipediaError(f"non-json response: {exc}") from exc
                if not isinstance(payload, dict):
                    raise LiquipediaError("liquipedia response was not a JSON object")
                return payload
            # Shouldn't get here — the loop either returns or raises.
            raise LiquipediaError("exhausted retries")

    @staticmethod
    async def _respect_rate_limit(
        *, last_request_at: float, min_interval: float
    ) -> None:
        if min_interval <= 0 or last_request_at == 0:
            return
        elapsed = time.perf_counter() - last_request_at
        wait = min_interval - elapsed
        if wait > 0:
            await asyncio.sleep(wait)


def _extract_revision_content(page_data: dict[str, Any]) -> str | None:
    revisions = page_data.get("revisions")
    if not isinstance(revisions, list) or not revisions:
        return None
    revision = revisions[0]
    if not isinstance(revision, dict):
        return None

    slots = revision.get("slots")
    if isinstance(slots, dict):
        main = slots.get("main")
        if isinstance(main, dict):
            content = main.get("content") or main.get("*")
            if isinstance(content, str):
                return content

    content = revision.get("content") or revision.get("*")
    if isinstance(content, str):
        return content
    return None


def _parse_retry_after(value: str | None) -> float | None:
    """Parse Retry-After header. Supports integer seconds form only."""
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        return None
