# pip install faster-whisper
"""
core/transcriber.py
--------------------
Speech-to-text component of the Meeting Assistant pipeline.

Supports two modes controlled by the 'whisper_mode' setting:
  - "api"   : Sends audio to OpenAI's Whisper API (fast, paid, no local GPU needed)
  - "local" : Runs openai-whisper locally (free, requires ffmpeg + more RAM/GPU)

For audio files larger than 25 MB (the OpenAI API limit), the file is split
into overlapping chunks before transcription and the results are merged.
"""

from __future__ import annotations

import logging
import math
import os
from pathlib import Path
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
from core.models import TranscriptionResult

logger = logging.getLogger(__name__)

# OpenAI Whisper API file-size limit (bytes)
_WHISPER_API_MAX_BYTES = 25 * 1024 * 1024  # 25 MB


class WhisperTranscriber:
    """
    Handles audio-to-text transcription via Whisper.

    Usage:
        transcriber = WhisperTranscriber(settings)
        result = transcriber.transcribe("meeting.mp3")
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._mode = settings.whisper_mode.lower()

        if self._mode not in ("api", "local", "groq"):
            raise ValueError(f"whisper_mode must be 'api', 'local', or 'groq', got '{self._mode}'")

        if self._mode == "api":
            openai.api_key = settings.openai_api_key
            self._client = openai.OpenAI(api_key=settings.openai_api_key)
        elif self._mode == "groq":
            if not settings.groq_api_key:
                raise EnvironmentError("WHISPER_MODE is 'groq' but GROQ_API_KEY is missing.")
            self._client = openai.OpenAI(
                api_key=settings.groq_api_key,
                base_url="https://api.groq.com/openai/v1",
            )
        elif self._mode == "local":
            self._load_local_model()

    # ── Local model ───────────────────────────────────────────────────────────

    def _load_local_model(self) -> None:
        """Lazy-load the local Whisper model (downloads on first use)."""
        try:
            from faster_whisper import WhisperModel
            model_name = self._settings.whisper_local_model
            logger.info("Loading local Whisper model '%s' …", model_name)
            self._local_model = WhisperModel(model_name, device="cpu", compute_type="int8")
            logger.info("Local Whisper model loaded successfully.")
        except ImportError:
            raise ImportError(
                "Local Whisper requires 'faster-whisper'. "
                "Install it with: pip install faster-whisper\n"
                "You also need ffmpeg installed on your system."
            )

    # ── Public API ────────────────────────────────────────────────────────────

    def transcribe(self, audio_path: str | Path) -> TranscriptionResult:
        """
        Transcribe an audio file.

        Args:
            audio_path: Path to the audio file (MP3, WAV, M4A, FLAC, …).

        Returns:
            TranscriptionResult with the full transcript text and metadata.
        """
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        logger.info("Starting transcription [mode=%s] for: %s", self._mode, audio_path.name)

        if self._mode in ("api", "groq"):
            text, language, duration = self._transcribe_api(audio_path)
        else:
            text, language, duration = self._transcribe_local(audio_path)

        logger.info(
            "Transcription complete — %d characters, language=%s, duration=%.1fs",
            len(text),
            language,
            duration or 0,
        )

        return TranscriptionResult(
            text=text,
            language=language,
            duration_seconds=duration,
            audio_file=str(audio_path.resolve()),
        )

    # ── API mode ──────────────────────────────────────────────────────────────

    def _transcribe_api(self, audio_path: Path) -> tuple[str, str, Optional[float]]:
        """Transcribe using the OpenAI Whisper API, chunking if the file is > 25 MB."""
        file_size = audio_path.stat().st_size

        if file_size <= _WHISPER_API_MAX_BYTES:
            return self._call_whisper_api(audio_path)

        # File is too large — split and transcribe in chunks
        logger.warning(
            "File size %.1f MB exceeds API limit (25 MB). Splitting into chunks …",
            file_size / 1024 / 1024,
        )
        return self._transcribe_chunked_api(audio_path)

    @retry(
        retry=retry_if_exception_type(openai.RateLimitError),
        wait=wait_exponential(multiplier=2, min=4, max=60),
        stop=stop_after_attempt(5),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    def _call_whisper_api(self, audio_path: Path) -> tuple[str, str, Optional[float]]:
        """Single API call to Whisper with retry on rate-limit."""
        logger.debug("Calling Whisper API for: %s", audio_path.name)
        with open(audio_path, "rb") as f:
            kwargs = {
                "model": "whisper-large-v3" if self._mode == "groq" else "whisper-1",
                "file": f,
                "response_format": "verbose_json",
            }
            if self._settings.whisper_language:
                kwargs["language"] = self._settings.whisper_language

            response = self._client.audio.transcriptions.create(**kwargs)

        text = response.text.strip()
        language = getattr(response, "language", "en") or "en"
        duration = getattr(response, "duration", None)
        return text, language, duration

    def _transcribe_chunked_api(self, audio_path: Path) -> tuple[str, str, Optional[float]]:
        """
        Split audio into 20-minute chunks with 30-second overlap and merge transcripts.
        Requires pydub + ffmpeg.
        """
        try:
            from pydub import AudioSegment  # type: ignore
        except ImportError:
            raise ImportError(
                "Large-file chunking requires pydub. "
                "Install with: pip install pydub\n"
                "(ffmpeg must also be installed and in PATH)"
            )

        audio = AudioSegment.from_file(str(audio_path))
        duration_ms = len(audio)
        chunk_ms = 20 * 60 * 1000      # 20 minutes per chunk
        overlap_ms = 30 * 1000          # 30-second overlap

        chunks_dir = audio_path.parent / f"_chunks_{audio_path.stem}"
        chunks_dir.mkdir(exist_ok=True)

        texts: list[str] = []
        language = "en"
        start = 0
        chunk_index = 0

        while start < duration_ms:
            end = min(start + chunk_ms, duration_ms)
            chunk = audio[start:end]
            chunk_path = chunks_dir / f"chunk_{chunk_index:03d}.mp3"
            chunk.export(str(chunk_path), format="mp3")

            chunk_text, lang, _ = self._call_whisper_api(chunk_path)
            texts.append(chunk_text)
            language = lang
            logger.info("  Chunk %d/%d transcribed.", chunk_index + 1,
                        math.ceil(duration_ms / chunk_ms))

            chunk_index += 1
            start = end - overlap_ms if end < duration_ms else duration_ms

        # Clean up temporary chunk files
        for f in chunks_dir.iterdir():
            f.unlink()
        chunks_dir.rmdir()

        full_text = " ".join(texts)
        return full_text, language, duration_ms / 1000.0

    # ── Local mode ────────────────────────────────────────────────────────────

    def _transcribe_local(self, audio_path: Path) -> tuple[str, str, Optional[float]]:
        """Transcribe using the locally installed Whisper model."""
        logger.info("Running local Whisper inference …")
        kwargs = {
            "vad_filter": True,
            "language": "ar",
            "beam_size": 3,
        }
            
        segments_gen, info = self._local_model.transcribe(str(audio_path), **kwargs)
        segments = list(segments_gen)
        
        text = " ".join([segment.text.strip() for segment in segments]).strip()
        language = info.language
        # Estimate duration from segments if available
        duration = segments[-1].end if segments else None
        return text, language, duration
