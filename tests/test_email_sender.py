"""
tests/test_email_sender.py
---------------------------
Unit tests for the EmailSender class.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.models import ActionItem, Decision, EmailDeliveryResult, MeetingAnalysis


@pytest.fixture
def mock_settings():
    settings = MagicMock()
    settings.openai_api_key = "sk-test"
    settings.smtp_host = "smtp.gmail.com"
    settings.smtp_port = 587
    settings.smtp_user = "agent@example.com"
    settings.smtp_password = os.environ.get("SMTP_PASSWORD", "dummy-test-value")
    settings.smtp_use_tls = True
    settings.email_from_name = "Meeting Assistant"
    return settings


@pytest.fixture
def sample_analysis():
    return MeetingAnalysis(
        meeting_title="Q2 Planning",
        summary="The team planned the Q2 roadmap and assigned tasks.",
        key_topics=["Roadmap", "Budget"],
        action_items=[
            ActionItem(task="Prepare budget report", assignee="Alice", deadline="Next week", priority="high")
        ],
        decisions=[
            Decision(description="Adopt microservices architecture", made_by="CTO", rationale="Scalability")
        ],
        participants_mentioned=["Alice", "Bob", "CTO"],
        sentiment="positive",
        next_meeting_date="May 3rd, 2025",
    )


class TestEmailSenderDryRun:

    def test_dry_run_returns_success_for_all(self, mock_settings, sample_analysis):
        """Dry-run mode should return success for all recipients without sending."""
        from core.email_sender import EmailSender
        sender = EmailSender(mock_settings, dry_run=True)
        result = sender.send(sample_analysis, ["alice@co.com", "bob@co.com"])

        assert isinstance(result, EmailDeliveryResult)
        assert result.total_sent == 2
        assert result.total_failed == 0

    def test_dry_run_correct_subject(self, mock_settings, sample_analysis):
        """Email subject should include the meeting title."""
        from core.email_sender import EmailSender
        sender = EmailSender(mock_settings, dry_run=True)
        result = sender.send(sample_analysis, ["alice@co.com"])

        assert "Q2 Planning" in result.subject

    def test_dry_run_empty_recipients(self, mock_settings, sample_analysis):
        """Sending to empty recipients list should return empty result."""
        from core.email_sender import EmailSender
        sender = EmailSender(mock_settings, dry_run=True)
        result = sender.send(sample_analysis, [])

        assert result.total_sent == 0
        assert result.total_failed == 0

    def test_plain_text_contains_summary(self, mock_settings, sample_analysis):
        """Plain-text body should include the summary text."""
        from core.email_sender import EmailSender
        sender = EmailSender(mock_settings, dry_run=True)
        plain = sender._render_plain(sample_analysis)

        assert "Q2 Planning" in plain
        assert sample_analysis.summary in plain
        assert "Prepare budget report" in plain
        assert "Adopt microservices architecture" in plain

    def test_html_contains_title(self, mock_settings, sample_analysis):
        """HTML body should reference the meeting title."""
        from core.email_sender import EmailSender
        sender = EmailSender(mock_settings, dry_run=True)
        html = sender._render_html(sample_analysis)

        assert "Q2 Planning" in html
        assert "Alice" in html


class TestEmailDeliveryResult:

    def test_total_sent_and_failed(self):
        from core.models import RecipientResult
        result = EmailDeliveryResult(
            subject="Test",
            recipients=[
                RecipientResult(email="a@co.com", success=True),
                RecipientResult(email="b@co.com", success=False, error="Connection refused"),
                RecipientResult(email="c@co.com", success=True),
            ]
        )
        assert result.total_sent == 2
        assert result.total_failed == 1
