"""YAML-backed config loader with sensible defaults."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from ml.optimizer import OptimizerConfig


def _load_dotenv() -> None:
    """Load ``backend/.env`` when present. Shell env vars take precedence."""
    if os.environ.get("SLEEPSYNC_SKIP_DOTENV") == "1":
        return
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.is_file():
        load_dotenv(env_path, override=False)


_load_dotenv()


@dataclass
class RiskConfig:
    grid_size: int = 32
    cold_start_threshold: int = 3


@dataclass
class VersionsConfig:
    risk_model: str = "risk-0.1.0"
    optimizer: str = "opt-0.1.0"


@dataclass
class CorsConfig:
    """Browser dev (Expo web). Native iOS/Android does not use CORS."""

    allow_all: bool = False
    allow_origin_regex: str = (
        r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?"
    )


_DEFAULT_GH_SCOPES = (
    "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
    "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
)


@dataclass
class GoogleHealthConfig:
    """Google Health API OAuth and REST settings.

    Secrets are read from the environment, never config.yaml. Connect and sync
    require a configured OAuth client. See backend/README.md.
    """

    client_id: str = ""
    client_secret: str = ""
    # Google OAuth redirect (https) — register this exact URI on the Web server client.
    redirect_uri: str = "http://127.0.0.1:8000/v1/google-health/oauth/callback"
    # Where to send the user after the backend finishes the code exchange.
    app_return_uri: str = "sleepsync://google-health/callback"
    token_encryption_key: str = ""
    authorize_url: str = "https://accounts.google.com/o/oauth2/v2/auth"
    token_url: str = "https://oauth2.googleapis.com/token"
    revoke_url: str = "https://oauth2.googleapis.com/revoke"
    api_base: str = "https://health.googleapis.com/v4"
    scopes: list[str] = field(default_factory=lambda: list(_DEFAULT_GH_SCOPES))

    @property
    def configured(self) -> bool:
        """True when a real OAuth client is available for token exchange."""
        return bool(self.client_id and self.client_secret)


@dataclass
class AppConfig:
    risk: RiskConfig
    optimizer: OptimizerConfig
    versions: VersionsConfig
    cors: CorsConfig
    google_health: GoogleHealthConfig

    @property
    def model_version(self) -> str:
        return f"{self.versions.risk_model}-{self.versions.optimizer}"


def _load_yaml() -> dict[str, Any]:
    path = Path(__file__).parent.parent / "config.yaml"
    if not path.exists():
        return {}
    with path.open() as f:
        return yaml.safe_load(f) or {}


@lru_cache(maxsize=1)
def get_config() -> AppConfig:
    raw = _load_yaml()
    risk_raw = raw.get("risk", {})
    opt_raw = raw.get("optimizer", {})
    ver_raw = raw.get("versions", {})
    cors_raw = raw.get("cors", {})
    gh_raw = raw.get("google_health", {})
    return AppConfig(
        risk=RiskConfig(
            grid_size=int(risk_raw.get("grid_size", 32)),
            cold_start_threshold=int(risk_raw.get("cold_start_threshold", 3)),
        ),
        optimizer=OptimizerConfig(
            dose_max=float(opt_raw.get("dose_max", 1.0)),
            dose_min=float(opt_raw.get("dose_min", 0.0)),
            max_dose_per_interval=float(opt_raw.get("max_dose_per_interval", 0.15)),
            min_delay_t=float(opt_raw.get("min_delay_t", 0.10)),
            taper_start_t_max=float(opt_raw.get("taper_start_t_max", 0.85)),
            smoothness_lambda=float(opt_raw.get("smoothness_lambda", 0.20)),
            taper_to_zero_at_wake=bool(opt_raw.get("taper_to_zero_at_wake", True)),
        ),
        versions=VersionsConfig(
            risk_model=str(ver_raw.get("risk_model", "risk-0.1.0")),
            optimizer=str(ver_raw.get("optimizer", "opt-0.1.0")),
        ),
        cors=CorsConfig(
            allow_all=bool(cors_raw.get("allow_all", False)),
            allow_origin_regex=str(
                cors_raw.get(
                    "allow_origin_regex",
                    CorsConfig().allow_origin_regex,
                )
            ),
        ),
        google_health=GoogleHealthConfig(
            # Secrets: env only.
            client_id=os.environ.get("GOOGLE_OAUTH_CLIENT_ID", ""),
            client_secret=os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET", ""),
            token_encryption_key=os.environ.get("TOKEN_ENCRYPTION_KEY", ""),
            # Redirect: env wins, else config.yaml, else dataclass default.
            redirect_uri=os.environ.get(
                "GOOGLE_HEALTH_REDIRECT_URI",
                str(gh_raw.get("redirect_uri", GoogleHealthConfig().redirect_uri)),
            ),
            app_return_uri=os.environ.get(
                "GOOGLE_HEALTH_APP_RETURN_URI",
                str(gh_raw.get("app_return_uri", GoogleHealthConfig().app_return_uri)),
            ),
            # Non-secret endpoints / scopes from config.yaml.
            authorize_url=str(gh_raw.get("authorize_url", GoogleHealthConfig().authorize_url)),
            token_url=str(gh_raw.get("token_url", GoogleHealthConfig().token_url)),
            revoke_url=str(gh_raw.get("revoke_url", GoogleHealthConfig().revoke_url)),
            api_base=str(gh_raw.get("api_base", GoogleHealthConfig().api_base)),
            scopes=[str(s) for s in gh_raw.get("scopes", list(_DEFAULT_GH_SCOPES))],
        ),
    )