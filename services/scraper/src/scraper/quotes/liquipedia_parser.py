"""Extract quotes from a Liquipedia player page wikitext.

Looks for both the community-used forms:
  (a) `{{Quote|text=...|author=...|source=...}}` template
  (b) Inline lines starting with `"..." — speaker, context`

Only content inside an `==Quotes==` section heading is considered,
EXCEPT for `{{Quote}}` templates which we accept anywhere on the page
(some pages nest them under `==Media==` or a subsection).

Each returned ParsedQuote carries the player's liquipedia page URL
+ `#Quotes` anchor as source_url. Liquipedia doesn't timestamp
individual quotes, so source_timestamp is always None.
"""

from __future__ import annotations

import re
from typing import Final

from scraper.liquipedia.parsers._common import iter_templates, parse_template_params

from .types import ParsedQuote, QuoteSource

_QUOTES_SECTION_RE: Final = re.compile(
    r"==\s*Quotes\s*==\s*\n(?P<body>.*?)(?=\n==\s*[^=]|\Z)",
    re.IGNORECASE | re.DOTALL,
)
_INLINE_QUOTE_RE: Final = re.compile(
    # em-dash (U+2014), en-dash (U+2013), hyphen-minus all accepted
    # as attribution separators (community prose varies).
    r'"(?P<text>[^"\n]{4,})"\s*[—–-]\s*[^\n]+',
)


class QuotesParseError(ValueError):
    """Raised when the parser receives invalid inputs."""


def _source_url(liquipedia_url: str) -> str:
    return liquipedia_url.rstrip("/") + "#Quotes"


def parse_quotes_from_player(
    wikitext: str, *, speaker_id: str, liquipedia_url: str
) -> list[ParsedQuote]:
    if not speaker_id or not speaker_id.strip():
        raise QuotesParseError("speaker_id is required to parse quotes")
    if not liquipedia_url:
        raise QuotesParseError("liquipedia_url is required to parse quotes")

    source = _source_url(liquipedia_url)
    seen_hashes: set[str] = set()
    results: list[ParsedQuote] = []

    # (a) {{Quote}} templates anywhere on the page.
    for tpl_body in iter_templates(wikitext, "Quote"):
        params = parse_template_params(tpl_body)
        text = params.get("text", "").strip()
        if not text:
            continue
        q = ParsedQuote(
            speaker_id=speaker_id,
            text=text,
            source_url=source,
            source_type=QuoteSource.LIQUIPEDIA,
        )
        if q.hash in seen_hashes:
            continue
        seen_hashes.add(q.hash)
        results.append(q)

    # (b) Inline quotes only inside the ==Quotes== section (reduces noise).
    section = _QUOTES_SECTION_RE.search(wikitext)
    if section is not None:
        body = section.group("body")
        for match in _INLINE_QUOTE_RE.finditer(body):
            text = match.group("text").strip()
            if not text:
                continue
            q = ParsedQuote(
                speaker_id=speaker_id,
                text=text,
                source_url=source,
                source_type=QuoteSource.LIQUIPEDIA,
            )
            if q.hash in seen_hashes:
                continue
            seen_hashes.add(q.hash)
            results.append(q)

    return results
