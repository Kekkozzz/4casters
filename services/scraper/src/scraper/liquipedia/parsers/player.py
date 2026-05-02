"""Parse {{Infobox player}} into a typed player record."""

from __future__ import annotations

from pydantic import BaseModel, Field

from ._common import (
    clean_value,
    extract_infobox_body,
    split_infobox_fields,
)

_RETIRED_TEAM_MARKERS = frozenset(
    {"retired", "inactive", "none", "free agent", "unsigned", "n/a"}
)


class PlayerParseError(ValueError):
    """Raised when the player wikitext does not conform to the expected shape."""


class ParsedPlayer(BaseModel):
    id: str
    name: str
    nationality: str | None = None
    current_team_id: str | None = None
    liquipedia_url: str = Field(..., min_length=1)


def _team_name_to_slug(value: str) -> str:
    return value.replace(" ", "_")


def parse_player(
    wikitext: str, *, slug: str, liquipedia_url: str
) -> ParsedPlayer:
    body = extract_infobox_body(wikitext, "Infobox player")
    if body is None:
        raise PlayerParseError("no {{Infobox player}} template found in wikitext")
    fields = split_infobox_fields(body)

    name = clean_value(fields.get("name", "")) or clean_value(fields.get("id", "")) or slug

    nationality = clean_value(fields.get("nationality", "")) or None

    current_team_id: str | None = None
    team_link = clean_value(fields.get("team_link", ""))
    team_name = clean_value(fields.get("team", ""))
    if team_link:
        current_team_id = team_link
    elif team_name and team_name.lower() not in _RETIRED_TEAM_MARKERS:
        current_team_id = _team_name_to_slug(team_name)

    return ParsedPlayer(
        id=slug,
        name=name,
        nationality=nationality,
        current_team_id=current_team_id,
        liquipedia_url=liquipedia_url,
    )
