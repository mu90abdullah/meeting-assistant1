"""
core/analyzer.py
----------------
LLM-powered analysis component of the Meeting Assistant pipeline.

Supports multiple LLM providers — switch with LLM_PROVIDER in .env:
  - "openai"  -> GPT-4o (paid)
  - "groq"    -> Llama 3 via Groq API (FREE tier available)
  - "gemini"  -> Google Gemini (FREE tier available)

Output is validated against Pydantic models for type safety.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import openai
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from config.settings import Settings
from core.models import ActionItem, Decision, MeetingAnalysis, TranscriptionResult

logger = logging.getLogger(__name__)

# ── System prompt ──────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are an expert meeting analyst and executive assistant.
Your job is to analyze meeting transcripts and extract structured information.

You MUST respond with a single valid JSON object -- no markdown, no code fences, no extra text.

The JSON must exactly follow this schema:
{
  "meeting_title": "string -- inferred from context",
  "summary": "string -- 3-5 sentence executive summary",
  "key_topics": ["string", ...],
  "action_items": [
    {
      "task": "string",
      "assignee": "string or null",
      "deadline": "string or null",
      "priority": "high | medium | low or null"
    }
  ],
  "decisions": [
    {
      "description": "string",
      "made_by": "string or null",
      "rationale": "string or null"
    }
  ],
  "participants_mentioned": ["string", ...],
  "sentiment": "positive | neutral | negative or null",
  "next_meeting_date": "string or null"
}

Guidelines:
- ALWAYS write the output values (e.g. summary, tasks, descriptions, rationales) in Arabic (اللغة العربية).
- Be concise but complete. Do not fabricate information not present in the transcript.
- Infer a meeting title from the content (e.g. "Q2 Product Roadmap Review").
- For action items, only extract explicit commitments or tasks assigned to people.
- For decisions, extract clear conclusions reached during the meeting.
- Sentiment should reflect the overall tone: positive (productive/collaborative),
  neutral (factual/routine), negative (conflictual/problematic).
"""

# ── Provider default models ────────────────────────────────────────────────────
_PROVIDER_DEFAULTS = {
    "openai": "gpt-4o",
    "groq":   "llama-3.3-70b-versatile",
    "gemini": "gemini-1.5-flash",
}


def _build_client(settings: Settings) -> tuple:
    """
    Build the appropriate LLM client based on LLM_PROVIDER setting.
    Returns: (client, model_name, provider_name)
    """
    provider = settings.llm_provider.lower()

    if provider == "groq":
        # Groq is fully OpenAI-compatible -- just swap the base URL and key
        if not settings.groq_api_key:
            raise EnvironmentError(
                "[Config] GROQ_API_KEY is not set.\n"
                "  -> Get a FREE key at: https://console.groq.com\n"
                "  -> Then add to .env:  GROQ_API_KEY=gsk_your_key_here"
            )
        client = openai.OpenAI(
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        model = _PROVIDER_DEFAULTS["groq"]
        return client, model, "groq"

    elif provider == "gemini":
        if not settings.gemini_api_key:
            raise EnvironmentError(
                "[Config] GEMINI_API_KEY is not set.\n"
                "  -> Get a FREE key at: https://aistudio.google.com/app/apikey\n"
                "  -> Then add to .env:  GEMINI_API_KEY=AIza_your_key_here"
            )
        # Gemini also exposes an OpenAI-compatible endpoint
        client = openai.OpenAI(
            api_key=settings.gemini_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )
        model = _PROVIDER_DEFAULTS["gemini"]
        return client, model, "gemini"

    else:
        # Default: OpenAI
        if not settings.openai_api_key or settings.openai_api_key.startswith("sk-demo"):
            raise EnvironmentError(
                "[Config] OPENAI_API_KEY is missing or is still the demo placeholder.\n"
                "  -> Add a real key to .env:  OPENAI_API_KEY=sk-your-real-key\n"
                "  -> Or switch to a FREE provider:\n"
                "       LLM_PROVIDER=groq   (get key: https://console.groq.com)\n"
                "       LLM_PROVIDER=gemini (get key: https://aistudio.google.com)"
            )
        client = openai.OpenAI(api_key=settings.openai_api_key)
        model = settings.openai_model
        return client, model, "openai"


class MeetingAnalyzer:
    """
    Analyzes a meeting transcript using a configurable LLM provider.

    Supported providers (set LLM_PROVIDER in .env):
      openai  -> GPT-4o                      (paid, most accurate)
      groq    -> Llama 3.3 70B via Groq       (FREE, very fast)
      gemini  -> Google Gemini 1.5 Flash      (FREE, generous quota)

    Usage:
        analyzer = MeetingAnalyzer(settings)
        analysis = analyzer.analyze(transcription_result, meeting_title="Sprint Planning")
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client, self._model, self._provider = _build_client(settings)
        logger.info("LLM provider: %s | model: %s", self._provider, self._model)

    def analyze(
        self,
        transcription: TranscriptionResult,
        meeting_title: Optional[str] = None,
    ) -> MeetingAnalysis:
        """
        Analyze a transcript and return structured meeting data.
        """
        logger.info("Starting LLM analysis [%s / %s] ...", self._provider, self._model)

        user_message = self._build_user_message(transcription, meeting_title)
        raw_json = self._call_llm(user_message)
        analysis = self._parse_response(raw_json, meeting_title)

        logger.info(
            "Analysis complete -- %d action items, %d decisions.",
            len(analysis.action_items),
            len(analysis.decisions),
        )
        return analysis

    # ── Private helpers ────────────────────────────────────────────────────────

    def _build_user_message(
        self,
        transcription: TranscriptionResult,
        meeting_title: Optional[str],
    ) -> str:
        title_hint = (
            f"Meeting title (provided by organizer): {meeting_title}\n\n"
            if meeting_title else ""
        )
        return (
            f"{title_hint}"
            f"Audio file: {transcription.audio_file}\n"
            f"Language: {transcription.language}\n"
            f"Duration: {transcription.duration_seconds or 'unknown'} seconds\n\n"
            f"TRANSCRIPT:\n{transcription.text}"
        )

    @retry(
        retry=retry_if_exception_type((openai.RateLimitError, openai.APIError)),
        wait=wait_exponential(multiplier=2, min=4, max=30),
        stop=stop_after_attempt(3),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    def _call_llm(self, user_message: str) -> str:
        """Call the configured LLM and return the raw JSON string."""
        logger.debug("Calling %s / %s ...", self._provider, self._model)

        kwargs: dict = dict(
            model=self._model,
            temperature=0.0,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_message},
            ],
        )
        # Only OpenAI reliably supports response_format=json_object
        if self._provider == "openai":
            kwargs["response_format"] = {"type": "json_object"}

        response = self._client.chat.completions.create(**kwargs)
        raw = response.choices[0].message.content or "{}"

        # Strip markdown code fences if the model wrapped JSON in ```json ... ```
        raw = raw.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        logger.debug("LLM raw response (%d chars): %s...", len(raw), raw[:200])
        return raw

    def _parse_response(
        self, raw_json: str, meeting_title_override: Optional[str]
    ) -> MeetingAnalysis:
        """Parse and validate the LLM JSON response into a MeetingAnalysis model."""
        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"LLM returned invalid JSON: {exc}\nRaw output:\n{raw_json[:500]}"
            ) from exc

        if meeting_title_override:
            data["meeting_title"] = meeting_title_override

        data["action_items"] = [
            ActionItem(**item) if isinstance(item, dict) else ActionItem(task=str(item))
            for item in data.get("action_items", [])
        ]
        data["decisions"] = [
            Decision(**item) if isinstance(item, dict) else Decision(description=str(item))
            for item in data.get("decisions", [])
        ]

        return MeetingAnalysis(**data)
