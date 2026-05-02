"""Parse event-page TeamCard participants into teams and event rosters."""

from __future__ import annotations

import re
from datetime import date
from typing import Final

from pydantic import BaseModel

from scraper.liquipedia.parsers.player import ParsedPlayer
from scraper.liquipedia.parsers.team import ParsedRosterEntry, ParsedTeam

from ._common import clean_value, parse_template_params

_PLAYER_SLOT_RE: Final = re.compile(r"^p(?P<num>\d+)$")
_NON_INITIAL_WORDS: Final = frozenset({"and", "esports", "gaming", "in", "team"})


class ParsedParticipant(BaseModel):
    team: ParsedTeam
    players: list[ParsedPlayer]
    roster: list[ParsedRosterEntry]
    aliases: set[str]


def slug_from_title(value: str) -> str:
    return clean_value(value).replace(" ", "_")


def alias_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", clean_value(value).lower())


def parse_participants(
    wikitext: str,
    *,
    event_start_date: date,
    source_url: str,
) -> list[ParsedParticipant]:
    participants: list[ParsedParticipant] = []
    for body in _iter_balanced_templates(wikitext, "TeamCard"):
        params = parse_template_params(body)
        team_name = clean_value(params.get("team", ""))
        if not team_name:
            continue
        team_slug = slug_from_title(team_name)
        team = ParsedTeam(
            id=team_slug,
            name=team_name,
            short=None,
            region=(clean_value(params.get("flag", "")) or None),
            liquipedia_url=source_url,
        )

        players: list[ParsedPlayer] = []
        roster: list[ParsedRosterEntry] = []
        for key, value in sorted(params.items(), key=_player_slot_sort_key):
            match = _PLAYER_SLOT_RE.match(key)
            if match is None:
                continue
            display_name = clean_value(value)
            if not display_name:
                continue
            player_slug = slug_from_title(
                params.get(f"{key}link", "") or display_name
            )
            players.append(
                ParsedPlayer(
                    id=player_slug,
                    name=display_name,
                    nationality=None,
                    current_team_id=team_slug,
                    liquipedia_url=source_url,
                )
            )
            roster.append(
                ParsedRosterEntry(
                    player_id=player_slug,
                    team_id=team_slug,
                    role="player",
                    start_date=event_start_date,
                    end_date=None,
                    source_url=source_url,
                )
            )

        participants.append(
            ParsedParticipant(
                team=team,
                players=players,
                roster=roster,
                aliases=_team_aliases(team_name, team_slug),
            )
        )
    return participants


def participant_alias_map(participants: list[ParsedParticipant]) -> dict[str, str]:
    team_ids = {p.team.id for p in participants}
    aliases: dict[str, str] = {}
    for participant in participants:
        for alias in participant.aliases | _known_aliases(participant.team.id, team_ids):
            aliases[alias] = participant.team.id
    return aliases


def _player_slot_sort_key(item: tuple[str, str]) -> tuple[int, str]:
    match = _PLAYER_SLOT_RE.match(item[0])
    if match is None:
        return (999, item[0])
    return (int(match.group("num")), item[0])


def _team_aliases(team_name: str, team_slug: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", clean_value(team_name).lower())
    significant = [w for w in words if w not in _NON_INITIAL_WORDS]
    aliases = {
        alias_key(team_name),
        alias_key(team_slug),
        alias_key(team_slug.replace("_", " ")),
    }
    if significant:
        aliases.add("".join(word[0] for word in significant))
        aliases.add(significant[-1])
        aliases.add(significant[-1][:3])
    return {alias for alias in aliases if alias}


def _known_aliases(team_slug: str, team_ids: set[str]) -> set[str]:
    known = {
        "Karmine_Corp": {"kc"},
        "Team_Vitality": {"vit", "vitality"},
        "Ninjas_in_Pyjamas": {"nip"},
        "Shopify_Rebellion": {"sr"},
        "Geekay_Esports": {"gk"},
        "Virtus.pro": {"vp"},
        "Team_Falcons": {"falcons", "flcn"},
        "Five_Fears": {"5f"},
        "Gentle_Mates": {"m8"},
        "NRG": {"nrg", "nrgesports"},
    }
    return known.get(team_slug, set()) if team_slug in team_ids else set()


def _iter_balanced_templates(text: str, name: str) -> list[str]:
    pattern = re.compile(r"\{\{\s*" + re.escape(name) + r"\b", re.IGNORECASE)
    results: list[str] = []
    for match in pattern.finditer(text):
        start = match.start()
        depth = 0
        index = start
        while index < len(text):
            pair = text[index : index + 2]
            if pair == "{{":
                depth += 1
                index += 2
                continue
            if pair == "}}":
                depth -= 1
                index += 2
                if depth == 0:
                    body = text[match.end() : index - 2]
                    if body.startswith("|"):
                        body = body[1:]
                    if body.startswith("\n"):
                        body = body[1:]
                    results.append(body)
                    break
                continue
            index += 1
    return results
