"""
core/models.py
--------------
Pydantic v2 data models that define the shape of every object
flowing through the Meeting Assistant pipeline.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Transcription
# ─────────────────────────────────────────────────────────────────────────────

class TranscriptionResult(BaseModel):
    """Output of the speech-to-text step."""
    text: str = Field(..., description="Full transcript of the meeting audio")
    language: str = Field(default="en", description="Detected language code (e.g. 'en', 'ar')")
    duration_seconds: Optional[float] = Field(None, description="Audio duration in seconds")
    audio_file: str = Field(..., description="Path to the source audio file")
    transcribed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─────────────────────────────────────────────────────────────────────────────
# LLM Analysis
# ─────────────────────────────────────────────────────────────────────────────

class ActionItem(BaseModel):
    """A single action item extracted from the meeting."""
    task: str = Field(..., description="The task or action to be completed")
    assignee: Optional[str] = Field(None, description="Person responsible (if mentioned)")
    deadline: Optional[str] = Field(None, description="Due date or timeframe (if mentioned)")
    priority: Optional[str] = Field(None, description="Priority level: high | medium | low")


class Decision(BaseModel):
    """A key decision made during the meeting."""
    description: str = Field(..., description="What was decided")
    made_by: Optional[str] = Field(None, description="Who made or drove the decision")
    rationale: Optional[str] = Field(None, description="Why this decision was made")


class MeetingAnalysis(BaseModel):
    """Structured output produced by the LLM analysis step."""
    meeting_title: str = Field(..., description="Title / topic of the meeting")
    summary: str = Field(..., description="Concise paragraph summarizing the meeting")
    key_topics: List[str] = Field(default_factory=list, description="Main topics discussed")
    action_items: List[ActionItem] = Field(default_factory=list)
    decisions: List[Decision] = Field(default_factory=list)
    participants_mentioned: List[str] = Field(
        default_factory=list, description="Names mentioned in the transcript"
    )
    sentiment: Optional[str] = Field(
        None, description="Overall meeting tone: positive | neutral | negative"
    )
    next_meeting_date: Optional[str] = Field(
        None, description="Next meeting date/time if mentioned"
    )
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─────────────────────────────────────────────────────────────────────────────
# Email Delivery
# ─────────────────────────────────────────────────────────────────────────────

class RecipientResult(BaseModel):
    """Delivery status for a single email recipient."""
    email: str
    success: bool
    error: Optional[str] = None


class EmailDeliveryResult(BaseModel):
    """Aggregate result of the email delivery step."""
    recipients: List[RecipientResult]
    subject: str
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def total_sent(self) -> int:
        return sum(1 for r in self.recipients if r.success)

    @property
    def total_failed(self) -> int:
        return sum(1 for r in self.recipients if not r.success)


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline Result (full end-to-end)
# ─────────────────────────────────────────────────────────────────────────────

class PipelineResult(BaseModel):
    """Complete output of a single agent run."""
    audio_file: str
    transcription: TranscriptionResult
    analysis: MeetingAnalysis
    email_delivery: Optional[EmailDeliveryResult] = None
    output_json_path: Optional[str] = None
    success: bool = True
    error: Optional[str] = None
