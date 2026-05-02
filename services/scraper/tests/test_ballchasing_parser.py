"""Tests for the ballchasing group-stats parser."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scraper.ballchasing.parsers import StatsParseError, parse_group_stats

FIXTURES = Path(__file__).parent / "fixtures"


def _load() -> dict:
    return json.loads(
        (FIXTURES / "ballchasing_group_rlcs_major_1.json").read_text()
    )


def test_parses_player_stats_from_game_average() -> None:
    payload = _load()
    player_map = {"itachi": "itachi", "Vatira": "Vatira"}
    team_map = {"Halcyon Esports": "Halcyon_Esports"}

    result = parse_group_stats(
        payload,
        event_slug="RLCS_2026/Major_1",
        player_name_to_slug=player_map,
        team_name_to_slug=team_map,
    )

    itachi_stat = next(s for s in result.player_stats if s.player_id == "itachi")
    assert itachi_stat.event_id == "RLCS_2026/Major_1"
    assert itachi_stat.games_played == 12
    assert itachi_stat.goals_per_game == pytest.approx(1.0)
    assert itachi_stat.shooting_pct == pytest.approx(26.67)
    assert itachi_stat.demos_per_game == pytest.approx(1.25)
    assert itachi_stat.boost_per_min == pytest.approx(450)
    assert itachi_stat.source_group_id == "rlcs-2026-major-1-eu"


def test_parses_team_stats_with_wins_losses() -> None:
    payload = _load()
    result = parse_group_stats(
        payload,
        event_slug="RLCS_2026/Major_1",
        player_name_to_slug={"itachi": "itachi", "Vatira": "Vatira"},
        team_name_to_slug={"Halcyon Esports": "Halcyon_Esports"},
    )
    team = result.team_stats[0]
    assert team.team_id == "Halcyon_Esports"
    assert team.games_played == 12
    assert team.wins == 8
    assert team.losses == 4
    assert team.goals_for == 34
    assert team.goals_against == 28
    assert team.source_group_id == "rlcs-2026-major-1-eu"


def test_skips_players_missing_from_slug_map() -> None:
    payload = _load()
    # Only map itachi
    result = parse_group_stats(
        payload,
        event_slug="RLCS_2026/Major_1",
        player_name_to_slug={"itachi": "itachi"},
        team_name_to_slug={"Halcyon Esports": "Halcyon_Esports"},
    )
    assert [s.player_id for s in result.player_stats] == ["itachi"]
    assert result.unmapped_players == ["Vatira"]


def test_skips_teams_missing_from_slug_map() -> None:
    payload = _load()
    result = parse_group_stats(
        payload,
        event_slug="RLCS_2026/Major_1",
        player_name_to_slug={"itachi": "itachi", "Vatira": "Vatira"},
        team_name_to_slug={},
    )
    assert result.team_stats == []
    assert result.unmapped_teams == ["Halcyon Esports"]


def test_normalizes_ballchasing_player_and_team_names() -> None:
    payload = {
        "id": "normalization",
        "players": [
            {"name": "Atow", "cumulative": {"games": 1}, "game_average": {}},
            {"name": "yANXNZ^^", "cumulative": {"games": 1}, "game_average": {}},
        ],
        "teams": [
            {"name": "TEAM VITALITY", "cumulative": {"games": 1, "wins": 1, "losses": 0}},
            {"name": "REBELLION", "cumulative": {"games": 1, "wins": 0, "losses": 1}},
        ],
    }

    result = parse_group_stats(
        payload,
        event_slug="E",
        player_name_to_slug={"Atow.": "Atow.", "yANXNZ": "yANXNZ"},
        team_name_to_slug={
            "Team Vitality": "Team_Vitality",
            "REBELLION": "Shopify_Rebellion",
        },
    )

    assert [stat.player_id for stat in result.player_stats] == ["Atow.", "yANXNZ"]
    assert [stat.team_id for stat in result.team_stats] == [
        "Team_Vitality",
        "Shopify_Rebellion",
    ]
    assert result.unmapped_players == []
    assert result.unmapped_teams == []


def test_derives_team_losses_when_ballchasing_only_returns_wins() -> None:
    payload = {
        "id": "wins-only",
        "players": [],
        "teams": [
            {
                "name": "TSM",
                "cumulative": {
                    "games": 9,
                    "wins": 3,
                    "core": {"goals": 12, "goals_against": 20},
                },
            },
        ],
    }

    result = parse_group_stats(
        payload,
        event_slug="E",
        player_name_to_slug={},
        team_name_to_slug={"TSM": "TSM"},
    )

    assert result.team_stats[0].wins == 3
    assert result.team_stats[0].losses == 6


def test_derives_player_save_percentage_from_saves_and_goals_against() -> None:
    payload = {
        "id": "save-pct",
        "players": [
            {
                "name": "Daniel",
                "cumulative": {
                    "games": 5,
                    "core": {
                        "saves": 18,
                        "goals_against": 12,
                    },
                },
                "game_average": {"core": {"saves": 3.6}},
            },
        ],
        "teams": [],
    }

    result = parse_group_stats(
        payload,
        event_slug="E",
        player_name_to_slug={"Daniel": "Daniel"},
        team_name_to_slug={},
    )

    assert result.player_stats[0].save_pct == pytest.approx(60.0)


def test_missing_id_in_payload_raises() -> None:
    with pytest.raises(StatsParseError, match="group id"):
        parse_group_stats(
            {"players": [], "teams": []},
            event_slug="X",
            player_name_to_slug={},
            team_name_to_slug={},
        )


def test_handles_missing_optional_stat_fields_as_null() -> None:
    payload = {
        "id": "sparse",
        "name": "Sparse Group",
        "players": [
            {
                "name": "itachi",
                "team": "Halcyon Esports",
                "cumulative": {"games": 5, "wins": 3, "losses": 2},
                "game_average": {"core": {"goals": 1.2}},
            }
        ],
        "teams": [],
    }
    result = parse_group_stats(
        payload,
        event_slug="E",
        player_name_to_slug={"itachi": "itachi"},
        team_name_to_slug={},
    )
    stat = result.player_stats[0]
    assert stat.games_played == 5
    assert stat.goals_per_game == pytest.approx(1.2)
    assert stat.saves_per_game is None
    assert stat.demos_per_game is None
    assert stat.boost_per_min is None
