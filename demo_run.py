#!/usr/bin/env python3
"""
demo_run.py
-----------
End-to-end pipeline demonstration with mocked OpenAI calls.
Run this to see exactly what the agent produces — no real API key needed.

Usage: python demo_run.py
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# ── Windows UTF-8 compatibility ───────────────────────────────────────────────
if hasattr(sys.stdout, "buffer") and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "buffer") and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── Add project root to path ──────────────────────────────────────────────────
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from rich.console import Console
from rich.panel import Panel

console = Console()

# ── Mocked GPT-4o response ────────────────────────────────────────────────────
MOCK_ANALYSIS = {
    "meeting_title": "Sprint 14 Review — Engineering Team",
    "summary": (
        "The engineering team held Sprint 14 review covering significant backend and frontend "
        "milestones. The backend team completed the OAuth 2.0 authentication refactor and deployed "
        "a new notification microservice. The frontend team shipped a full dashboard redesign with "
        "dark mode support. A decision was made to delay the mobile app release from May 1st to "
        "May 15th due to unstable offline sync functionality. The team also adopted Playwright as "
        "the new end-to-end testing framework, replacing Cypress."
    ),
    "key_topics": [
        "OAuth 2.0 authentication refactor",
        "Notification microservice deployment",
        "Dashboard redesign & dark mode",
        "Mobile app release delay",
        "Playwright E2E testing adoption",
    ],
    "action_items": [
        {
            "task": "Integrate rate-limiting middleware into notification service",
            "assignee": "Bob",
            "deadline": "This Thursday",
            "priority": "high",
        },
        {
            "task": "Write integration tests for OAuth 2.0 flow",
            "assignee": "Bob",
            "deadline": "Friday",
            "priority": "high",
        },
        {
            "task": "Fix chart tooltip z-index CSS issue in dashboard",
            "assignee": "Carol",
            "deadline": "Today",
            "priority": "medium",
        },
        {
            "task": "Update release schedule in Confluence and notify stakeholders",
            "assignee": "Alice",
            "deadline": "EOD today (5pm)",
            "priority": "high",
        },
        {
            "task": "Write Playwright migration guide and share with team",
            "assignee": "David",
            "deadline": "Next Wednesday",
            "priority": "medium",
        },
        {
            "task": "Set up Playwright project scaffold",
            "assignee": "David",
            "deadline": "This week",
            "priority": "medium",
        },
    ],
    "decisions": [
        {
            "description": "Mobile app release delayed from May 1st to May 15th",
            "made_by": "Whole team",
            "rationale": "Offline sync feature is not stable enough for production",
        },
        {
            "description": "Adopt Playwright for all new end-to-end tests, replacing Cypress",
            "made_by": "David (after evaluation)",
            "rationale": "Evaluation results showed Playwright outperforms Cypress for the team's needs",
        },
    ],
    "participants_mentioned": ["Alice", "Bob", "Carol", "David", "Eve"],
    "sentiment": "positive",
    "next_meeting_date": "Monday, April 28th at 10am (Sprint Planning)",
}


def make_mock_openai_client() -> MagicMock:
    """Create a mock OpenAI client returning our pre-defined analysis."""
    msg = MagicMock()
    msg.content = json.dumps(MOCK_ANALYSIS)
    choice = MagicMock()
    choice.message = msg
    completion = MagicMock()
    completion.choices = [choice]

    client = MagicMock()
    client.chat.completions.create.return_value = completion
    return client


def main() -> None:
    console.print(Panel(
        "[bold blue]Meeting Assistant Agent — Demo Run[/bold blue]\n"
        "[dim]Full pipeline with mocked OpenAI | No API key required[/dim]",
        border_style="blue",
    ))

    transcript_path = ROOT / "sample_transcript.txt"
    if not transcript_path.exists():
        console.print("[red]sample_transcript.txt not found.[/red]")
        sys.exit(1)

    # ── Step 1: Load transcript (skip Whisper for demo) ───────────────────────
    console.print("\n[bold cyan]Step 1/3 — Loading transcript...[/bold cyan]")
    transcript_text = transcript_path.read_text(encoding="utf-8").strip()
    console.print(f"[green]✓[/green] Transcript loaded — {len(transcript_text):,} characters")

    from core.models import TranscriptionResult
    transcription = TranscriptionResult(
        text=transcript_text,
        language="en",
        duration_seconds=1847.0,  # ~30 minutes
        audio_file="sample_transcript.txt",
    )

    # ── Step 2: Analyze with mocked GPT-4o ───────────────────────────────────
    console.print("\n[bold cyan]Step 2/3 — Analyzing meeting (GPT-4o mocked)...[/bold cyan]")

    mock_client = make_mock_openai_client()
    with patch("openai.OpenAI", return_value=mock_client):
        # Settings with a dummy key so it doesn't raise EnvironmentError
        import os
        os.environ.setdefault("OPENAI_API_KEY", "sk-demo-key")
        from config.settings import Settings
        settings = Settings(
            openai_api_key="sk-demo-key",
            openai_model="gpt-4o",
        )
        from core.analyzer import MeetingAnalyzer
        analyzer = MeetingAnalyzer(settings)
        analysis = analyzer.analyze(transcription, meeting_title="Sprint 14 Review")

    console.print(
        f"[green]✓[/green] Analysis complete — "
        f"[bold]{analysis.meeting_title}[/bold] | "
        f"{len(analysis.action_items)} action items | "
        f"{len(analysis.decisions)} decisions | "
        f"sentiment: {analysis.sentiment}"
    )

    # ── Step 3: Email dry-run ─────────────────────────────────────────────────
    console.print("\n[bold cyan]Step 3/3 — Email delivery (dry run)...[/bold cyan]")
    from core.email_sender import EmailSender
    sender = EmailSender(settings, dry_run=True)
    participants = ["alice@engineering.com", "bob@engineering.com", "carol@engineering.com",
                    "david@engineering.com", "eve@product.com"]
    delivery = sender.send(analysis, participants)
    console.print(
        f"[green]✓[/green] [DRY RUN] Would send to {delivery.total_sent} participants"
    )

    # ── Print full results ────────────────────────────────────────────────────
    from agent import print_summary
    print_summary(analysis)

    # ── Save JSON output ──────────────────────────────────────────────────────
    from agent import save_json_output
    from core.models import PipelineResult
    result = PipelineResult(
        audio_file="sample_transcript.txt",
        transcription=transcription,
        analysis=analysis,
        email_delivery=delivery,
    )
    output_dir = ROOT / "output"
    output_dir.mkdir(exist_ok=True)
    json_path = save_json_output(result, output_dir)
    console.print(f"\n[green]✓[/green] JSON output saved: [bold]{json_path}[/bold]")

    # ── Show JSON preview ─────────────────────────────────────────────────────
    console.print("\n[bold]JSON Output Preview (analysis section):[/bold]")
    preview = {
        "meeting_title": analysis.meeting_title,
        "summary": analysis.summary[:200] + "...",
        "action_items_count": len(analysis.action_items),
        "decisions_count": len(analysis.decisions),
        "sentiment": analysis.sentiment,
        "next_meeting_date": analysis.next_meeting_date,
    }
    console.print_json(json.dumps(preview, indent=2))

    console.print("\n[bold green]Demo complete! The full pipeline works end-to-end.[/bold green]")
    console.print(
        "\n[dim]To use with a real audio file, set your OPENAI_API_KEY in .env "
        "and run:\n  python agent.py --audio your_meeting.mp3 --no-email[/dim]\n"
    )


if __name__ == "__main__":
    main()
