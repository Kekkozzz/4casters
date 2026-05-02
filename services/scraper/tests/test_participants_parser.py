"""Tests for event-page TeamCard participant parsing."""

from __future__ import annotations

from datetime import date

from scraper.liquipedia.parsers.match import parse_matches
from scraper.liquipedia.parsers.participants import (
    parse_participants,
    participant_alias_map,
)


def test_parses_team_cards_into_rosters_and_aliases() -> None:
    wikitext = """
==Participants==
{{TeamCard
|team=Karmine Corp|flag=eu
|p1=Vatira
|p2=Atow.
|p3=juicy|p3link=juicy (French Player)
}}
{{TeamCard
|team=Team Vitality|flag=eu
|p1=zen
|p2=ExoTiiK
|p3=stizzy
}}
{{Match
|opponent1={{TeamOpponent|kc|score=4}}
|opponent2={{TeamOpponent|vit|score=3}}
}}
"""

    participants = parse_participants(
        wikitext,
        event_start_date=date(2026, 2, 19),
        source_url="https://liquipedia.net/rocketleague/E",
    )
    aliases = participant_alias_map(participants)
    matches = parse_matches(wikitext, event_slug="E", team_aliases=aliases)

    assert [participant.team.id for participant in participants] == [
        "Karmine_Corp",
        "Team_Vitality",
    ]
    assert participants[0].players[2].id == "juicy_(French_Player)"
    assert participants[0].roster[0].start_date == date(2026, 2, 19)
    assert aliases["kc"] == "Karmine_Corp"
    assert aliases["vit"] == "Team_Vitality"
    assert matches[0].team_a_id == "Karmine_Corp"
    assert matches[0].team_b_id == "Team_Vitality"
