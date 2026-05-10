"""
tests/test_transcriber.py
--------------------------
Unit tests for the WhisperTranscriber class.
Uses mocking to avoid real API calls during testing.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch, mock_open

import pytest

# Allow imports from the project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.models import TranscriptionResult


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_settings():
    """Minimal Settings mock."""
    settings = MagicMock()
    settings.openai_api_key = "sk-test-dummy-key"
    settings.whisper_mode = "api"
    settings.whisper_local_model = "base"
    settings.max_retries = 3
    return settings


@pytest.fixture
def sample_audio_file(tmp_path):
    """Create a dummy audio file for testing."""
    audio = tmp_path / "sample.mp3"
    audio.write_bytes(b"\x00" * 100)  # Fake audio bytes
    return audio


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestWhisperTranscriber:

    def test_invalid_mode_raises(self, mock_settings):
        """WhisperTranscriber should raise ValueError for unknown modes."""
        mock_settings.whisper_mode = "invalid_mode"
        with patch("openai.OpenAI"):
            from core.transcriber import WhisperTranscriber
            with pytest.raises(ValueError, match="whisper_mode must be"):
                WhisperTranscriber(mock_settings)

    def test_file_not_found_raises(self, mock_settings):
        """Should raise FileNotFoundError for missing audio files."""
        with patch("openai.OpenAI"):
            from core.transcriber import WhisperTranscriber
            transcriber = WhisperTranscriber(mock_settings)
            with pytest.raises(FileNotFoundError):
                transcriber.transcribe("/nonexistent/path/audio.mp3")

    def test_api_transcription_returns_result(self, mock_settings, sample_audio_file):
        """API mode should return a TranscriptionResult."""
        mock_response = MagicMock()
        mock_response.text = "Hello, this is a test transcript."
        mock_response.language = "en"
        mock_response.duration = 120.0

        mock_client = MagicMock()
        mock_client.audio.transcriptions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            from core.transcriber import WhisperTranscriber
            transcriber = WhisperTranscriber(mock_settings)
            result = transcriber.transcribe(sample_audio_file)

        assert isinstance(result, TranscriptionResult)
        assert result.text == "Hello, this is a test transcript."
        assert result.language == "en"
        import math
        assert math.isclose(result.duration_seconds, 120.0, rel_tol=1e-9)

    def test_result_contains_audio_path(self, mock_settings, sample_audio_file):
        """TranscriptionResult should include the full audio file path."""
        mock_response = MagicMock()
        mock_response.text = "Test"
        mock_response.language = "en"
        mock_response.duration = None

        mock_client = MagicMock()
        mock_client.audio.transcriptions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            from core.transcriber import WhisperTranscriber
            transcriber = WhisperTranscriber(mock_settings)
            result = transcriber.transcribe(sample_audio_file)

        assert str(sample_audio_file.resolve()) == result.audio_file

    def test_empty_transcript_handled(self, mock_settings, sample_audio_file):
        """Empty API response should produce empty text (not crash)."""
        mock_response = MagicMock()
        mock_response.text = ""
        mock_response.language = "en"
        mock_response.duration = 0.0

        mock_client = MagicMock()
        mock_client.audio.transcriptions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            from core.transcriber import WhisperTranscriber
            transcriber = WhisperTranscriber(mock_settings)
            result = transcriber.transcribe(sample_audio_file)

        assert result.text == ""
