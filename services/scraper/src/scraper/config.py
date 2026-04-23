"""Environment configuration loaded from the repo-root .env or process env."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root is 2 levels up from services/scraper/.
REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """Runtime configuration.

    Reads from the repo-root .env file by default; values already present
    in the environment always win over .env.
    """

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = ""
    liquipedia_user_agent: str = (
        "4casters/0.3 (https://github.com/Kekkozzz/4casters; contact@4casters.app)"
    )
    liquipedia_min_interval_seconds: float = 2.0
    ballchasing_api_key: str = ""
    ballchasing_min_interval_seconds: float = 0.5  # 2 req/s free tier
    gemini_api_key: str = ""
    # text-embedding-004 -> 768 dimensions, matches our schema vector(768).
    gemini_embedding_model: str = "text-embedding-004"
    embedding_batch_size: int = 100
    embedding_min_interval_seconds: float = 0.05


@lru_cache
def get_settings() -> Settings:
    """Cached singleton so config is loaded once per process."""
    return Settings()
