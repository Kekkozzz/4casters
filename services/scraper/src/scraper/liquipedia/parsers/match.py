"""Parse MatchList/Match templates from an event wikitext page.

Scope: scheduled matches with opponents + optional score + optional date.
We extract into ParsedMatch records the DB can UPSERT. Nested templates
make this slightly harder than the other parsers, so we walk the text
by scanning balanced `{{ }}` blocks instead of relying on regex alone.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Final

from pydantic import BaseModel

from ._common import clean_value, parse_template_params

_TZ_MAP: Final = {
    "UTC": UTC,
    "CET": UTC,  # Naive mapping — MVP accepts ± 1h drift vs true CET.
    "CEST": UTC,
    "EST": UTC,
    "EDT": UTC,
    "PST": UTC,
    "PDT": UTC,
}

_DATE_FORMATS: Final = ("%Y-%m-%d %H:%M", "%Y-%m-%d")
_BESTOF_RE: Final = re.compile(r"bestof\s*=\s*(\d+)", re.IGNORECASE)


class MatchParseError(ValueError):
    """Raised when a match block cannot be parsed."""


class ParsedMatch(BaseModel):
    id: str
    event_id: str
    team_a_id: str
    team_b_id: str
    scheduled_at: datetime | None = None
    stage: str | None = None
    format: str | None = None
    score_a: int | None = None
    score_b: int | None = None
    liquipedia_url: str | None = None


def _team_name_to_slug(value: str) -> str:
    return clean_value(value).replace(" ", "_")


def _iter_balanced_templates(text: str, name: str) -> list[str]:
    """Yield the full body (between `{{name` and matching `}}`) for each occurrence."""
    needle = "{{" + name
    results: list[str] = []
    i = 0
    while True:
        start = text.find(needle, i)
        if start == -1:
            return results
        depth = 0
        j = start
        while j < len(text):
            if text[j : j + 2] == "{{":
                depth += 1
                j += 2
            elif text[j : j + 2] == "}}":
                depth -= 1
                j += 2
                if depth == 0:
                    body = text[start + 2 + len(name) : j - 2]
                    if body.startswith("|"):
                        body = body[1:]
                    results.append(body)
                    break
            else:
                j += 1
        else:
            return results
        i = j


def _parse_date(raw: str) -> datetime | None:
    cleaned = clean_value(raw)
    if not cleaned or cleaned.lower() in {"tbd", "tba", "?"}:
        return None
    parts = cleaned.rsplit(" ", 1)
    tz_name = ""
    body = cleaned
    if len(parts) == 2 and parts[1].isalpha() and parts[1].upper() in _TZ_MAP:
        body, tz_name = parts[0], parts[1].upper()
    for fmt in _DATE_FORMATS:
        try:
            naive = datetime.strptime(body, fmt)
            tz = _TZ_MAP.get(tz_name, UTC)
            return naive.replace(tzinfo=tz)
        except ValueError:
            continue
    raise MatchParseError(f"could not parse match date {raw!r}")


def _parse_team_opponent(body: str) -> tuple[str, int | None]:
    parts = body.split("|")
    if not parts:
        raise MatchParseError("empty TeamOpponent body")
    team_name = parts[0].strip()
    if not team_name:
        raise MatchParseError("TeamOpponent is missing team name")
    score: int | None = None
    for part in parts[1:]:
        if "=" not in part:
            continue
        key, _, value = part.partition("=")
        if key.strip().lower() == "score":
            value = clean_value(value)
            if value.isdigit():
                score = int(value)
    return _team_name_to_slug(team_name), score


def _split_match_fields(body: str) -> dict[str, str]:
    """Split a balanced Match body preserving nested `{{ }}` in values."""
    fields: dict[str, str] = {}
    current_key: str | None = None
    buffer: list[str] = []
    depth = 0
    i = 0
    while i < len(body):
        ch = body[i]
        pair = body[i : i + 2]
        if pair == "{{":
            depth += 1
            buffer.append(pair)
            i += 2
            continue
        if pair == "}}":
            depth -= 1
            buffer.append(pair)
            i += 2
            continue
        if ch == "|" and depth == 0:
            if current_key is not None:
                fields[current_key] = "".join(buffer).strip()
            current_key = None
            buffer = []
            i += 1
            # read key up to '='
            key_buf: list[str] = []
            while i < len(body) and body[i] != "=" and body[i] != "|":
                key_buf.append(body[i])
                i += 1
            if i < len(body) and body[i] == "=":
                current_key = "".join(key_buf).strip().lower()
                i += 1
            continue
        buffer.append(ch)
        i += 1
    if current_key is not None:
        fields[current_key] = "".join(buffer).strip()
    return fields


def parse_matches(wikitext: str, *, event_slug: str) -> list[ParsedMatch]:
    matches: list[ParsedMatch] = []
    for list_body in _iter_balanced_templates(wikitext, "MatchList"):
        header_line = list_body.split("\n", 1)[0]
        header_params = parse_template_params(header_line)
        stage = clean_value(header_params.get("title", "")) or None
        bestof_match = _BESTOF_RE.search(list_body)
        format_value = f"Bo{bestof_match.group(1)}" if bestof_match else None

        for match_body in _iter_balanced_templates(list_body, "Match"):
            fields = _split_match_fields(match_body)
            opp1 = fields.get("opponent1", "")
            opp2 = fields.get("opponent2", "")
            if not opp1 or not opp2:
                continue
            team_opp1 = _iter_balanced_templates(opp1, "TeamOpponent")
            team_opp2 = _iter_balanced_templates(opp2, "TeamOpponent")
            if not team_opp1 or not team_opp2:
                continue
            team_a_id, score_a = _parse_team_opponent(team_opp1[0])
            team_b_id, score_b = _parse_team_opponent(team_opp2[0])
            scheduled_at = _parse_date(fields.get("date", ""))

            stage_for_id = stage or "match"
            match_id = (
                f"{event_slug}:{stage_for_id}:{team_a_id}-vs-{team_b_id}"
            )
            # Ensure uniqueness if the same two teams meet twice in a stage.
            if any(m.id == match_id for m in matches):
                suffix = 2
                while any(m.id == f"{match_id}#{suffix}" for m in matches):
                    suffix += 1
                match_id = f"{match_id}#{suffix}"

            matches.append(
                ParsedMatch(
                    id=match_id,
                    event_id=event_slug,
                    team_a_id=team_a_id,
                    team_b_id=team_b_id,
                    scheduled_at=scheduled_at,
                    stage=stage,
                    format=format_value,
                    score_a=score_a,
                    score_b=score_b,
                )
            )
    return matches
