"""Shared helpers for Liquipedia wikitext parsers."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Final

_WIKILINK_RE: Final = re.compile(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]")
_HTML_COMMENT_RE: Final = re.compile(r"<!--.*?-->", re.DOTALL)
_TBD_VALUES: Final = frozenset({"", "tbd", "tba", "n/a", "?", "unknown"})
_DATE_FORMATS: Final = ("%Y-%m-%d", "%Y/%m/%d", "%B %d, %Y", "%d %B %Y")


def clean_value(value: str) -> str:
    value = _WIKILINK_RE.sub(lambda m: m.group(1), value)
    value = _HTML_COMMENT_RE.sub("", value)
    return value.strip()


def parse_optional_date(raw: str) -> date | None:
    cleaned = clean_value(raw)
    if cleaned.lower() in _TBD_VALUES:
        return None
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"could not parse date {raw!r}")


def extract_infobox_body(wikitext: str, template_name: str) -> str | None:
    """Return the inner body of a {{<template_name> ... }} block, or None."""
    pattern = re.compile(
        r"\{\{\s*" + re.escape(template_name) + r"\s*\n(?P<body>.*?)\n\}\}",
        re.IGNORECASE | re.DOTALL,
    )
    match = pattern.search(wikitext)
    return match.group("body") if match else None


def split_infobox_fields(body: str) -> dict[str, str]:
    """Split an Infobox body into a lowercase-keyed {field: value} dict."""
    fields: dict[str, str] = {}
    current_key: str | None = None
    buffer: list[str] = []

    def flush() -> None:
        if current_key is not None:
            fields[current_key] = "\n".join(buffer).strip()

    for raw_line in body.splitlines():
        line = raw_line.rstrip()
        if line.startswith("|") and "=" in line:
            flush()
            key, _, value = line[1:].partition("=")
            current_key = key.strip().lower()
            buffer = [value.strip()]
        else:
            buffer.append(line.strip())
    flush()
    return fields


def parse_template_params(template_body: str) -> dict[str, str]:
    """Parse `key=value|key=value|...` params from a single-template body.

    Accepts the body between `{{Name` and `}}` (with or without the
    trailing pipe on the name). Positional args are skipped.
    """
    params: dict[str, str] = {}
    for part in template_body.split("|"):
        if "=" not in part:
            continue
        key, _, value = part.partition("=")
        params[key.strip().lower()] = value.strip()
    return params


def iter_templates(text: str, template_name: str) -> list[str]:
    """Return bodies of every `{{<template_name>...}}` occurrence (flat only).

    Handles the common SquadPlayer/SquadActivePlayer case where the
    template is a single-line pipe-separated record with no nesting.
    """
    pattern = re.compile(
        r"\{\{\s*" + re.escape(template_name) + r"\b([^{}]*)\}\}",
        re.IGNORECASE,
    )
    return [m.group(1) for m in pattern.finditer(text)]
