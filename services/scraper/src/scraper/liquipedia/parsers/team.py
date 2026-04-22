"""Parse {{Infobox team}} + SquadPlayer templates into team + roster history."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from ._common import (
    clean_value,
    extract_infobox_body,
    iter_templates,
    parse_optional_date,
    parse_template_params,
    split_infobox_fields,
)


class TeamParseError(ValueError):
    """Raised when the team wikitext does not conform to the expected shape."""


class ParsedTeam(BaseModel):
    id: str
    name: str
    short: str | None = None
    region: str | None = None
    liquipedia_url: str = Field(..., min_length=1)


class ParsedRosterEntry(BaseModel):
    player_id: str
    team_id: str
    role: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    source_url: str


class ParsedTeamWithRoster(BaseModel):
    team: ParsedTeam
    roster: list[ParsedRosterEntry]


def parse_team(
    wikitext: str, *, slug: str, liquipedia_url: str
) -> ParsedTeamWithRoster:
    body = extract_infobox_body(wikitext, "Infobox team")
    if body is None:
        raise TeamParseError("no {{Infobox team}} template found in wikitext")
    fields = split_infobox_fields(body)

    name = clean_value(fields.get("name", ""))
    if not name:
        raise TeamParseError("Infobox team is missing required 'name' field")

    team = ParsedTeam(
        id=slug,
        name=name,
        short=(clean_value(fields.get("shortname", "")) or None),
        region=(clean_value(fields.get("region", "")) or None),
        liquipedia_url=liquipedia_url,
    )

    roster: list[ParsedRosterEntry] = []
    for tpl_body in iter_templates(wikitext, "SquadPlayer"):
        params = parse_template_params(tpl_body)
        player_id = clean_value(params.get("id", ""))
        if not player_id:
            continue
        try:
            start = (
                parse_optional_date(params["join"]) if params.get("join") else None
            )
            end = parse_optional_date(params["leave"]) if params.get("leave") else None
        except ValueError as exc:
            raise TeamParseError(
                f"invalid date in SquadPlayer for id={player_id!r}: {exc}"
            ) from exc
        roster.append(
            ParsedRosterEntry(
                player_id=player_id,
                team_id=slug,
                role=(clean_value(params.get("role", "")) or None),
                start_date=start,
                end_date=end,
                source_url=liquipedia_url,
            )
        )

    return ParsedTeamWithRoster(team=team, roster=roster)
