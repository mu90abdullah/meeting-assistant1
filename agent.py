#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
agent.py
--------
Meeting Assistant Agent -- Main Orchestrator

This is the single entry point for the autonomous meeting processing pipeline.

Pipeline:
  1. Accept CLI arguments (audio file, participants, title, options)
  2. Transcribe audio -> TranscriptionResult
  3. Analyze transcript -> MeetingAnalysis
  4. Send email to participants -> EmailDeliveryResult
  5. Save full results as JSON to output/

Usage examples:
  # Full run (transcribe -> analyze -> email)
  python agent.py --audio meeting.mp3 --participants alice@co.com bob@co.com --title "Sprint Review"

  # Dry run (no email sent, results printed)
  python agent.py --audio meeting.mp3 --dry-run

  # Use local Whisper instead of API
  python agent.py --audio meeting.mp3 --whisper-mode local

  # Load transcript from text file (skip transcription)
  python agent.py --transcript-file transcript.txt --title "Q2 Planning"
"""
from __future__ import annotations

import argparse
import io
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from docx import Document
    from docx.shared import Pt
except ImportError:
    Document = None


# ── Windows UTF-8 compatibility (must come before Rich imports) ───────────────
# Ensures emoji and Unicode characters don't crash on Windows CP1252 terminals.
if hasattr(sys.stdout, "buffer") and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "buffer") and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from rich.console import Console
from rich.logging import RichHandler
from rich.panel import Panel
from rich.table import Table

# ── Local imports ─────────────────────────────────────────────────────────────
from config.settings import Settings
from core.analyzer import MeetingAnalyzer
from core.email_sender import EmailSender
from core.models import MeetingAnalysis, PipelineResult, TranscriptionResult
from core.transcriber import WhisperTranscriber

console = Console()


# ─────────────────────────────────────────────────────────────────────────────
# Logging setup
# ─────────────────────────────────────────────────────────────────────────────

def setup_logging(level: str) -> None:
    """Configure Rich-enhanced structured logging."""
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(message)s",
        datefmt="[%X]",
        handlers=[
            RichHandler(rich_tracebacks=True, markup=True, show_path=False),
            logging.FileHandler(logs_dir / "agent.log", encoding="utf-8"),
        ],
    )


# ─────────────────────────────────────────────────────────────────────────────
# CLI argument parser
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="meeting-assistant",
        description="Meeting Assistant Agent -- Transcribe, Analyze, and Email meeting summaries",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # Input source (mutually exclusive)
    input_group = parser.add_mutually_exclusive_group()
    input_group.add_argument(
        "--audio", "-a",
        metavar="FILE",
        help="Path to meeting audio file (MP3, WAV, M4A, FLAC, …)",
    )
    input_group.add_argument(
        "--transcript-file", "-t",
        metavar="FILE",
        help="Path to an existing plain-text transcript (skips transcription step)",
    )

    # Meeting metadata
    parser.add_argument(
        "--title",
        metavar="TITLE",
        default=None,
        help="Meeting title (optional; LLM will infer from transcript if not provided)",
    )
    parser.add_argument(
        "--participants", "-p",
        metavar="EMAIL",
        nargs="*",
        default=[],
        help="Email addresses of meeting participants to send summary to",
    )

    # Transcription options
    parser.add_argument(
        "--whisper-mode",
        choices=["api", "local", "groq"],
        default=None,  # Falls back to WHISPER_MODE env var, then "api"
        help="Whisper mode: 'api' (OpenAI API), 'local' (local model), or 'groq' (Groq Whisper API)",
    )

    # Run modes
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the full pipeline but do NOT send emails. Prints results to console.",
    )
    parser.add_argument(
        "--no-email",
        action="store_true",
        help="Skip the email step entirely (still saves JSON output).",
    )
    parser.add_argument(
        "--output-dir",
        metavar="DIR",
        default=None,
        help="Directory to save JSON results (default: ./output/)",
    )

    return parser.parse_args()


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline steps
# ─────────────────────────────────────────────────────────────────────────────

def step_transcribe(args: argparse.Namespace, settings: Settings) -> TranscriptionResult:
    """Step 1 — Convert audio to text."""
    logger = logging.getLogger(__name__)

    if args.transcript_file:
        # Load from existing text file (skip Whisper)
        transcript_path = Path(args.transcript_file)
        if not transcript_path.exists():
            console.print(f"[red]✗ Transcript file not found: {transcript_path}[/red]")
            sys.exit(1)
        logger.info("Loading transcript from file: %s", transcript_path)
        text = transcript_path.read_text(encoding="utf-8").strip()
        return TranscriptionResult(
            text=text,
            language="en",
            audio_file=str(transcript_path),
        )

    if not args.audio:
        console.print("[red]✗ You must provide either --audio or --transcript-file.[/red]")
        sys.exit(1)

    # Override whisper_mode from CLI if provided
    if args.whisper_mode:
        settings.whisper_mode = args.whisper_mode

    with console.status("[bold blue]Step 1/3 — Transcribing audio with Whisper…[/bold blue]"):
        transcriber = WhisperTranscriber(settings)
        result = transcriber.transcribe(args.audio)

    console.print(
        f"[green]✓[/green] Transcription complete — "
        f"{len(result.text):,} characters | language: {result.language} | "
        f"duration: {result.duration_seconds or 'N/A'}s"
    )
    return result


def step_analyze(
    transcription: TranscriptionResult,
    meeting_title: str | None,
    settings: Settings,
) -> MeetingAnalysis:
    """Step 2 — Analyze transcript with LLM."""
    with console.status("[bold blue]Step 2/3 — Analyzing meeting with GPT-4o…[/bold blue]"):
        analyzer = MeetingAnalyzer(settings)
        analysis = analyzer.analyze(transcription, meeting_title=meeting_title)

    console.print(
        f"[green]✓[/green] Analysis complete — "
        f"'{analysis.meeting_title}' | "
        f"{len(analysis.action_items)} action items | "
        f"{len(analysis.decisions)} decisions"
    )
    return analysis


def step_send_email(
    analysis: MeetingAnalysis,
    participants: list[str],
    settings: Settings,
    dry_run: bool,
    attachments: list[Path] | None = None,
) -> None:
    attachments = attachments or []
    """Step 3 — Send email to participants."""
    if not participants:
        console.print("[yellow]⚠ No participants specified — skipping email step.[/yellow]")
        return

    mode_label = "[DRY RUN] " if dry_run else ""
    with console.status(
        f"[bold blue]{mode_label}Step 3/3 — Sending email to {len(participants)} recipient(s)…[/bold blue]"
    ):
        sender = EmailSender(settings, dry_run=dry_run)
        delivery = sender.send(analysis, participants, attachments=attachments)

    if delivery.total_failed > 0:
        console.print(
            f"[yellow]⚠ Email: {delivery.total_sent} sent, {delivery.total_failed} failed.[/yellow]"
        )
        for r in delivery.recipients:
            if not r.success:
                console.print(f"  [red]✗ {r.email}: {r.error}[/red]")
    else:
        console.print(f"[green]✓[/green] Email sent to all {delivery.total_sent} recipient(s).")


# ─────────────────────────────────────────────────────────────────────────────
# Output & display
# ─────────────────────────────────────────────────────────────────────────────

def save_json_output(result: PipelineResult, output_dir: Path) -> Path:
    """Save the full pipeline result as a timestamped JSON file."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_title = "".join(
        c if c.isalnum() or c in "-_ " else "_"
        for c in result.analysis.meeting_title
    ).strip().replace(" ", "_")[:40]
    filename = f"{timestamp}_{safe_title}.json"
    output_path = output_dir / filename

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result.model_dump(mode="json"), f, indent=2, ensure_ascii=False)

    return output_path


def save_markdown_output(analysis: MeetingAnalysis, output_dir: Path, json_filename: str) -> Path:
    """Save the meeting analysis as a beautifully formatted Markdown file."""
    md_filename = json_filename.replace(".json", ".md")
    output_path = output_dir / md_filename

    lines = [
        f"# 📋 {analysis.meeting_title}",
        "",
        "## 📝 الملخص (Summary)",
        analysis.summary,
        ""
    ]

    if analysis.key_topics:
        lines.extend(["## 🔑 المواضيع الرئيسية (Key Topics)"])
        for t in analysis.key_topics:
            lines.append(f"- {t}")
        lines.append("")

    if analysis.action_items:
        lines.extend([
            "## 🎯 المهام (Action Items)",
            "| # | المهمة (Task) | المسؤول (Assignee) | الموعد النهائي (Deadline) | الأولوية (Priority) |",
            "|---|---|---|---|---|"
        ])
        for i, item in enumerate(analysis.action_items, 1):
            task = item.task.replace("\n", " ")
            assignee = item.assignee or "—"
            deadline = item.deadline or "—"
            priority = item.priority or "—"
            lines.append(f"| {i} | {task} | {assignee} | {deadline} | {priority} |")
        lines.append("")

    if analysis.decisions:
        lines.extend(["## ⚖️ القرارات (Decisions)"])
        for i, dec in enumerate(analysis.decisions, 1):
            lines.append(f"{i}. **{dec.description.strip()}**")
            if dec.rationale:
                lines.append(f"   - *السبب:* {dec.rationale.strip()}")
        lines.append("")

    if analysis.next_meeting_date:
        lines.extend([
            "## 📅 الاجتماع القادم (Next Meeting)",
            analysis.next_meeting_date,
            ""
        ])

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    return output_path


def save_docx_summary_output(analysis: MeetingAnalysis, output_dir: Path, json_filename: str) -> Path:
    """Save the meeting analysis summary as a Word Document (.docx)."""
    if Document is None:
        return output_dir / "[docx_missing].txt"
        
    docx_filename = json_filename.replace(".json", "_Summary.docx")
    output_path = output_dir / docx_filename

    doc = Document()
    doc.add_heading(f"{analysis.meeting_title}", level=0)
    
    doc.add_heading("الملخص (Summary)", level=1)
    doc.add_paragraph(analysis.summary)
    
    if analysis.key_topics:
        doc.add_heading("المواضيع الرئيسية (Key Topics)", level=1)
        for t in analysis.key_topics:
            doc.add_paragraph(t, style='List Bullet')
            
    if analysis.action_items:
        doc.add_heading("المهام (Action Items)", level=1)
        table = doc.add_table(rows=1, cols=5)
        table.style = 'Table Grid'
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = "#"
        hdr_cells[1].text = "المهمة (Task)"
        hdr_cells[2].text = "المسؤول (Assignee)"
        hdr_cells[3].text = "الموعد (Deadline)"
        hdr_cells[4].text = "الأولوية (Priority)"
        
        for i, item in enumerate(analysis.action_items, 1):
            row_cells = table.add_row().cells
            row_cells[0].text = str(i)
            row_cells[1].text = item.task.replace("\n", " ")
            row_cells[2].text = item.assignee or "—"
            row_cells[3].text = item.deadline or "—"
            row_cells[4].text = item.priority or "—"

    if analysis.decisions:
        doc.add_heading("القرارات (Decisions)", level=1)
        for i, dec in enumerate(analysis.decisions, 1):
            p = doc.add_paragraph(f"{i}. {dec.description.strip()}")
            if dec.rationale:
                doc.add_paragraph(f"السبب: {dec.rationale.strip()}", style='List Bullet')
                
    if analysis.next_meeting_date:
        doc.add_heading("الاجتماع القادم (Next Meeting)", level=1)
        doc.add_paragraph(analysis.next_meeting_date)

    doc.save(str(output_path))
    return output_path


def save_docx_transcript_output(transcription: TranscriptionResult, analysis: MeetingAnalysis, output_dir: Path, json_filename: str) -> Path:
    """Save the full raw text transcript as a separate Word Document (.docx)."""
    if Document is None:
        return output_dir / "[docx_missing].txt"

    docx_filename = json_filename.replace(".json", "_Full_Transcript.docx")
    output_path = output_dir / docx_filename

    doc = Document()
    doc.add_heading(f"التفريغ النصي الكامل - {analysis.meeting_title}", level=0)
    
    doc.add_paragraph(f"الملف الصوتي: {transcription.audio_file}")
    doc.add_paragraph(f"اللغة المستنتجة: {transcription.language}")
    doc.add_paragraph("---")
    
    # Split text by newlines and add as paragraphs
    for line in transcription.text.split("\n"):
        if line.strip():
            doc.add_paragraph(line.strip())

    doc.save(str(output_path))
    return output_path


def print_summary(analysis: MeetingAnalysis) -> None:
    """Pretty-print the analysis summary to the console."""
    console.print()
    console.print(Panel(
        f"[bold white]{analysis.meeting_title}[/bold white]",
        title="[bold blue]📋 Meeting Summary[/bold blue]",
        border_style="blue",
    ))

    console.print(f"\n[bold]Summary:[/bold]\n{analysis.summary}\n")

    if analysis.key_topics:
        console.print("[bold]Key Topics:[/bold]")
        for t in analysis.key_topics:
            console.print(f"  • {t}")
        console.print()

    if analysis.action_items:
        table = Table(title="Action Items", show_header=True, header_style="bold cyan")
        table.add_column("#", style="dim", width=4)
        table.add_column("Task", min_width=30)
        table.add_column("Assignee", style="cyan")
        table.add_column("Deadline", style="yellow")
        table.add_column("Priority", style="magenta")

        for i, item in enumerate(analysis.action_items, 1):
            priority_colors = {"high": "red", "medium": "yellow", "low": "green"}
            prio = item.priority or ""
            prio_styled = (
                f"[{priority_colors.get(prio, 'white')}]{prio}[/]" if prio else "—"
            )
            table.add_row(
                str(i),
                item.task,
                item.assignee or "—",
                item.deadline or "—",
                prio_styled,
            )
        console.print(table)
        console.print()

    if analysis.decisions:
        console.print("[bold]Key Decisions:[/bold]")
        for i, dec in enumerate(analysis.decisions, 1):
            console.print(f"  {i}. {dec.description}")
            if dec.rationale:
                console.print(f"     [dim]↳ {dec.rationale}[/dim]")
        console.print()

    if analysis.next_meeting_date:
        console.print(f"[bold]Next Meeting:[/bold] {analysis.next_meeting_date}\n")


# ─────────────────────────────────────────────────────────────────────────────
# Main agent entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    """Run the Meeting Assistant Agent pipeline."""
    args = parse_args()

    # ── Load settings ─────────────────────────────────────────────────────────
    try:
        settings = Settings.load()
    except EnvironmentError as e:
        console.print(f"[red bold]Configuration error:[/red bold] {e}")
        return 1

    setup_logging(settings.log_level)
    logger = logging.getLogger(__name__)

    if args.output_dir:
        settings.output_dir = Path(args.output_dir)
        settings.output_dir.mkdir(parents=True, exist_ok=True)

    # ── Banner ────────────────────────────────────────────────────────────────
    console.print(Panel(
        "[bold blue]🤖 Meeting Assistant Agent[/bold blue]\n"
        "[dim]Transcribe · Analyze · Email[/dim]",
        border_style="blue",
    ))

    # ── Step 1: Transcription ─────────────────────────────────────────────────
    try:
        transcription = step_transcribe(args, settings)
    except Exception as exc:
        logger.exception("Transcription failed")
        console.print(f"[red bold]✗ Transcription failed:[/red bold] {exc}")
        return 1

    # ── Step 2: Analysis ──────────────────────────────────────────────────────
    try:
        analysis = step_analyze(transcription, args.title, settings)
    except Exception as exc:
        logger.exception("Analysis failed")
        console.print(f"[red bold]✗ Analysis failed:[/red bold] {exc}")
        return 1

    # ── Print results ─────────────────────────────────────────────────────────
    print_summary(analysis)

    # ── Save JSON and DOCX outputs ────────────────────────────────────────────
    result = PipelineResult(
        audio_file=str(args.audio or args.transcript_file or ""),
        transcription=transcription,
        analysis=analysis,
    )
    
    attachments = []
    try:
        json_path = save_json_output(result, settings.output_dir)
        md_path = save_markdown_output(analysis, settings.output_dir, json_path.name)
        
        console.print(f"\n[green]✓[/green] JSON Results saved to: [bold]{json_path}[/bold]")
        console.print(f"[green]✓[/green] Markdown Results saved to: [bold]{md_path}[/bold]")
        
        if Document is not None:
            sum_docx = save_docx_summary_output(analysis, settings.output_dir, json_path.name)
            trans_docx = save_docx_transcript_output(transcription, analysis, settings.output_dir, json_path.name)
            attachments.extend([sum_docx, trans_docx])
            console.print(f"[green]✓[/green] Word Summary saved to: [bold]{sum_docx}[/bold]")
            console.print(f"[green]✓[/green] Word Transcript saved to: [bold]{trans_docx}[/bold]")
            
        result.output_json_path = str(json_path)
    except Exception as exc:
        logger.warning("Failed to save output files: %s", exc)

    # ── Step 3: Email ─────────────────────────────────────────────────────────
    if not args.no_email:
        try:
            step_send_email(analysis, args.participants, settings, dry_run=args.dry_run, attachments=attachments)
        except Exception as exc:
            logger.exception("Email failed")
            console.print(f"[red bold]✗ Email failed:[/red bold] {exc}")
            # Don't abort — results are still saved

    console.print("\n[bold green]✅ Meeting Assistant completed successfully.[/bold green]\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
