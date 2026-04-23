"""YouTube channel whitelist for quote ingestion.

Keeping this as a module-level constant (not a DB table) for the MVP
— small, rarely changes, and version-controlled alongside the parser
logic that references the aliases. Move to DB if/when casters request
the ability to edit the whitelist themselves.

Channel IDs: get these from any video on the channel by inspecting
the page source (ytInitialData -> channelId) or via the rss endpoint.
"""

from __future__ import annotations

from .youtube import ChannelConfig

# Placeholder whitelist for MVP. Real channel IDs to be filled in by
# the operator before running the pipeline — the CLI will pick them
# up from here automatically.
DEFAULT_CHANNELS: list[ChannelConfig] = [
    # Personal channels: every quote attributed to the host.
    # ChannelConfig(
    #     channel_id="UC_liefx_placeholder",
    #     strategy="channel",
    #     default_speaker_id="Liefx",
    # ),
    # ChannelConfig(
    #     channel_id="UC_shoe_placeholder",
    #     strategy="channel",
    #     default_speaker_id="Shoe",
    # ),
    # Multi-guest: attribute by title alias.
    # ChannelConfig(
    #     channel_id="UC_rlcs_placeholder",
    #     strategy="title",
    #     aliases={
    #         "itachi": "itachi",
    #         "vatira": "Vatira",
    #         "seikoo": "Seikoo",
    #     },
    # ),
]
