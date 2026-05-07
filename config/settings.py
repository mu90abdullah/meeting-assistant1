"""
config/settings.py
------------------
Centralized configuration loaded from environment variables.
Validates all required secrets at startup and fails fast with
a helpful error message if anything is missing.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")


def _require(key: str) -> str:
    """Read an environment variable and raise if it is not set."""
    value = os.getenv(key, "").strip()
    if not value:
        raise EnvironmentError(
            f"[Config] Required environment variable '{key}' is not set.\n"
            f"  → Copy '.env.example' to '.env' and fill in the missing value."
        )
    return value


def _optional(key: str, default: str = "") -> str:
    value = os.getenv(key, default)
    return value.strip() if value else default


@dataclass
class Settings:
    # ── OpenAI ────────────────────────────────────────────────────────────────
    openai_api_key: str = field(default_factory=lambda: _optional("OPENAI_API_KEY", ""))
    openai_model: str = field(default_factory=lambda: _optional("OPENAI_MODEL", "gpt-4o"))
    whisper_mode: str = field(default_factory=lambda: _optional("WHISPER_MODE", "api"))
    # Used only when whisper_mode == "local"
    whisper_local_model: str = field(default_factory=lambda: _optional("WHISPER_LOCAL_MODEL", "large"))
    whisper_language: str = field(default_factory=lambda: _optional("WHISPER_LANGUAGE", "ar"))

    # ── LLM Provider selection ─────────────────────────────────────────────────
    # Set LLM_PROVIDER to: openai | groq | gemini
    llm_provider: str = field(default_factory=lambda: _optional("LLM_PROVIDER", "openai"))
    # Groq free API key (https://console.groq.com)
    groq_api_key: str = field(default_factory=lambda: _optional("GROQ_API_KEY", ""))
    # Google Gemini free API key (https://aistudio.google.com/app/apikey)
    gemini_api_key: str = field(default_factory=lambda: _optional("GEMINI_API_KEY", ""))

    # ── Email / SMTP (optional at load time — validated lazily when sending) ──
    # This allows --dry-run and --no-email modes to work without SMTP config.
    smtp_host: str = field(default_factory=lambda: _optional("SMTP_HOST", ""))
    smtp_port: int = field(default_factory=lambda: int(_optional("SMTP_PORT", "587")))
    smtp_user: str = field(default_factory=lambda: _optional("SMTP_USER", ""))
    smtp_password: str = field(default_factory=lambda: _optional("SMTP_PASSWORD", ""))
    smtp_use_tls: bool = field(default_factory=lambda: _optional("SMTP_USE_TLS", "true").lower() == "true")
    email_from_name: str = field(default_factory=lambda: _optional("EMAIL_FROM_NAME", "Meeting Assistant"))

    # ── Agent behaviour ────────────────────────────────────────────────────────
    max_retries: int = field(default_factory=lambda: int(_optional("MAX_RETRIES", "3")))
    log_level: str = field(default_factory=lambda: _optional("LOG_LEVEL", "INFO"))
    output_dir: Path = field(
        default_factory=lambda: Path(_optional("OUTPUT_DIR", str(_ROOT / "output")))
    )

    def __post_init__(self) -> None:
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def validate_smtp(self) -> None:
        """
        Validate SMTP credentials. Call this only when email is about to be sent.
        Raises EnvironmentError with a helpful message if any field is missing.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Debug: Check environment keys presence (not values)
        import os
        all_env_keys = os.environ.keys()
        smtp_keys = [k for k in all_env_keys if k.startswith("SMTP_")]
        logger.info(f"[Config] ALL SMTP-related keys found in environment: {smtp_keys}")
        
        keys_to_check = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_USE_TLS"]
        present_keys = [k for k in keys_to_check if os.getenv(k)]
        logger.info(f"[Config] Expected SMTP keys that have values: {present_keys}")

        missing = [
            key for key, val in [
                ("SMTP_HOST", self.smtp_host),
                ("SMTP_USER", self.smtp_user),
                ("SMTP_PASSWORD", self.smtp_password),
            ]
            if not val
        ]
        if missing:
            raise EnvironmentError(
                f"[Config] Missing SMTP credentials: {', '.join(missing)}\n"
                f"  → Set these in your Railway Variables or .env file."
            )

    @classmethod
    def load(cls) -> "Settings":
        """Factory — call this to get a validated Settings instance."""
        return cls()
