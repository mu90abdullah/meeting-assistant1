"""
tests/test_analyzer.py
-----------------------
Unit tests for the MeetingAnalyzer class.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.models import MeetingAnalysis, TranscriptionResult


@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.openai_api_key = "sk-test-dummy"
    settings.openai_model = "gpt-4o"
    settings.max_retries = 3
    return settings


@pytest.fixture
def sample_transcription():
    return TranscriptionResult(
        text=(
            "Alice: Good morning everyone. Let's start the sprint review. "
            "Bob: We completed the login feature and the dashboard redesign. "
            "Alice: Great. Bob, can you write the unit tests by Friday? "
            "Bob: Sure, I'll do that. "
            "Alice: We've decided to push the mobile release to next quarter. "
            "Everyone agreed. Next meeting is Monday at 10am."
        ),
        language="en",
        duration_seconds=180.0,
        audio_file="sample.mp3",
    )


_VALID_RESPONSE = {
    "meeting_title": "Sprint Review",
    "summary": "The team reviewed sprint progress, discussed completed features, and planned next steps.",
    "key_topics": ["Login feature", "Dashboard redesign", "Mobile release"],
    "action_items": [
        {"task": "Write unit tests", "assignee": "Bob", "deadline": "Friday", "priority": "high"}
    ],
    "decisions": [
        {"description": "Mobile release pushed to next quarter", "made_by": "Alice", "rationale": "Not ready"}
    ],
    "participants_mentioned": ["Alice", "Bob"],
    "sentiment": "positive",
    "next_meeting_date": "Monday at 10am",
}


class TestMeetingAnalyzer:

    def _make_mock_response(self, data: dict) -> MagicMock:
        msg = MagicMock()
        msg.content = json.dumps(data)
        choice = MagicMock()
        choice.message = msg
        response = MagicMock()
        response.choices = [choice]
        return response

    def test_analyze_returns_meeting_analysis(self, mock_settings, sample_transcription):
        """analyze() should return a valid MeetingAnalysis model."""
        mock_response = self._make_mock_response(_VALID_RESPONSE)
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            from core.analyzer import MeetingAnalyzer
            analyzer = MeetingAnalyzer(mock_settings)
            result = analyzer.analyze(sample_transcription)

        assert isinstance(result, MeetingAnalysis)
        assert result.meeting_title == "Sprint Review"
        assert len(result.action_items) == 1
        assert result.action_items[0].assignee == "Bob"
        assert len(result.decisions) == 1
        assert result.sentiment == "positive"

    def test_title_override_applied(self, mock_settings, sample_transcription):
        """Meeting title override should replace the LLM-inferred title."""
        mock_response = self._make_mock_response(_VALID_RESPONSE)
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            from core.analyzer import MeetingAnalyzer
            analyzer = MeetingAnalyzer(mock_settings)
            result = analyzer.analyze(sample_transcription, meeting_title="My Custom Title")

        assert result.meeting_title == "My Custom Title"

    def test_invalid_json_raises_value_error(self, mock_settings, sample_transcription):
        """analyze() should raise ValueError if LLM returns invalid JSON."""
        msg = MagicMock()
        msg.content = "This is not JSON!!!"
        choice = MagicMock()
        choice.message = msg
        response = MagicMock()
        response.choices = [choice]
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = response

        with patch("openai.OpenAI", return_value=mock_client):
            from core.analyzer import MeetingAnalyzer
            analyzer = MeetingAnalyzer(mock_settings)
            with pytest.raises(ValueError, match="invalid JSON"):
                analyzer.analyze(sample_transcription)

    def test_empty_action_items_handled(self, mock_settings, sample_transcription):
        """Analysis with no action items should not crash."""
        data = {**_VALID_RESPONSE, "action_items": [], "decisions": []}
        mock_response = self._make_mock_response(data)
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response

        with patch("openai.OpenAI", return_value=mock_client):
            from core.analyzer import MeetingAnalyzer
            analyzer = MeetingAnalyzer(mock_settings)
            result = analyzer.analyze(sample_transcription)

        assert result.action_items == []
        assert result.decisions == []
