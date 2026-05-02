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
from .participants import alias_key

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
    """Yield bodies of `{{<name>...}}` at any depth.

    Case-insensitive; word-boundary after the name so `{{Match}}` does
    NOT collide with `{{MatchList}}` or `{{MatchSection}}`. Returns
    bodies with the leading `|` (and optional newline) stripped.
    """
    pattern = re.compile(
        r"\{\{\s*" + re.escape(name) + r"\b",
        re.IGNORECASE,
    )
    results: list[str] = []
    for m in pattern.finditer(text):
        start = m.start()
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
                    body = text[m.end() : j - 2]
                    if body.startswith("|"):
                        body = body[1:]
                    if body.startswith("\n"):
                        body = body[1:]
                    results.append(body)
                    break
            else:
                j += 1
    return results


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


def _parse_team_opponent(
    body: str, *, team_aliases: dict[str, str] | None = None
) -> tuple[str, int | None]:
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
    team_id = _team_name_to_slug(team_name)
    if team_aliases:
        team_id = team_aliases.get(alias_key(team_name), team_id)
    return team_id, score


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


def parse_matches(
    wikitext: str,
    *,
    event_slug: str,
    team_aliases: dict[str, str] | None = None,
) -> list[ParsedMatch]:
    """Extract match rows from an event wikitext page.

    Real RLCS pages mix three match-bearing layouts — MatchList wrappers
    (mostly group stages), Bracket wrappers (playoffs), and bare top-level
    `{{Match}}` templates. We walk every `{{Match}}` in the wikitext
    and carry stage/format context from the nearest wrapping wrapper if
    one is visible on the page.
    """
    # Build a "context" lookup: for each byte range of a wrapper template,
    # remember the stage+format so inner Match blocks inherit them.
    contexts = _collect_match_contexts(wikitext)

    # Iterate every {{Match}} regardless of nesting.
    match_ranges = _find_template_ranges(wikitext, "Match")

    matches: list[ParsedMatch] = []
    for start, end, body in match_ranges:
        fields = _split_match_fields(body)
        opp1 = fields.get("opponent1", "")
        opp2 = fields.get("opponent2", "")
        if not opp1 or not opp2:
            continue
        team_opp1 = _iter_balanced_templates(opp1, "TeamOpponent")
        team_opp2 = _iter_balanced_templates(opp2, "TeamOpponent")
        if not team_opp1 or not team_opp2:
            continue
        try:
            team_a_id, score_a = _parse_team_opponent(
                team_opp1[0], team_aliases=team_aliases
            )
            team_b_id, score_b = _parse_team_opponent(
                team_opp2[0], team_aliases=team_aliases
            )
        except MatchParseError:
            # Upcoming event pages often contain bracket placeholders with
            # empty/TBD TeamOpponent templates. They are not ingestible matches yet.
            continue
        try:
            scheduled_at = _parse_date(fields.get("date", ""))
        except MatchParseError:
            # Real pages sometimes embed {{Abbr/EST}} or other unexpected
            # formats. Skip the date rather than kill the whole backfill.
            scheduled_at = None

        stage, format_value = _context_for_range(contexts, start, end)
        stage_for_id = stage or "match"
        match_id = f"{event_slug}:{stage_for_id}:{team_a_id}-vs-{team_b_id}"
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


def _find_template_ranges(
    text: str, name: str
) -> list[tuple[int, int, str]]:
    """Return (abs_start, abs_end_exclusive, body) for every {{<name>...}}."""
    pattern = re.compile(
        r"\{\{\s*" + re.escape(name) + r"\b",
        re.IGNORECASE,
    )
    out: list[tuple[int, int, str]] = []
    for m in pattern.finditer(text):
        start = m.start()
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
                    body = text[m.end() : j - 2]
                    if body.startswith("|"):
                        body = body[1:]
                    if body.startswith("\n"):
                        body = body[1:]
                    out.append((start, j, body))
                    break
            else:
                j += 1
    return out


def _collect_match_contexts(
    wikitext: str,
) -> list[tuple[int, int, str | None, str | None]]:
    """Return (start, end, stage, format) for each wrapper template.

    A wrapper is any template whose body contains `{{Match` blocks —
    matchlist, bracket, matchsection, etc. stage is taken from `title=`
    in the header line; format from `bestof=` anywhere in the body.
    """
    ctxs: list[tuple[int, int, str | None, str | None]] = []
    for wrapper in ("MatchList", "Matchlist", "Bracket", "MatchSection"):
        for start, end, body in _find_template_ranges(wikitext, wrapper):
            header_line = body.split("\n", 1)[0]
            header_params = parse_template_params(header_line)
            stage = clean_value(header_params.get("title", "")) or None
            bestof_match = _BESTOF_RE.search(body)
            format_value = f"Bo{bestof_match.group(1)}" if bestof_match else None
            ctxs.append((start, end, stage, format_value))
    return ctxs


def _context_for_range(
    contexts: list[tuple[int, int, str | None, str | None]],
    start: int,
    end: int,
) -> tuple[str | None, str | None]:
    """Smallest wrapper span that fully contains [start, end)."""
    best: tuple[int, str | None, str | None] | None = None
    for c_start, c_end, stage, fmt in contexts:
        if c_start <= start and end <= c_end:
            span = c_end - c_start
            if best is None or span < best[0]:
                best = (span, stage, fmt)
    if best is None:
        return None, None
    return best[1], best[2]
