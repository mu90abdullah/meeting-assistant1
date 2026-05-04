"""
core/email_sender.py
---------------------
Email delivery component of the Meeting Assistant pipeline.

Renders a professional HTML email using Jinja2 templates and sends it
to all meeting participants via SMTP (supports Gmail, Outlook, custom servers).

Features:
  - HTML + plain-text multipart email
  - Per-recipient error tracking
  - TLS support
  - Dry-run mode (logs email without sending)
"""

from __future__ import annotations

import logging
import smtplib
from datetime import datetime, timezone, timedelta
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from config.settings import Settings
from core.models import EmailDeliveryResult, MeetingAnalysis, RecipientResult

logger = logging.getLogger(__name__)

# Template directory is two levels up from this file: project_root/templates/
_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


class EmailSender:
    """
    Sends meeting summary emails to a list of participants.

    Usage:
        sender = EmailSender(settings)
        result = sender.send(analysis, recipients=["alice@co.com", "bob@co.com"])
    """

    def __init__(self, settings: Settings, dry_run: bool = False) -> None:
        self._settings = settings
        self._dry_run = dry_run

        # Set up Jinja2 template environment
        self._jinja = Environment(
            loader=FileSystemLoader(str(_TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
        )

    # ── Public API ────────────────────────────────────────────────────────────

    def send(
        self,
        analysis: MeetingAnalysis,
        recipients: List[str],
        attachments: Optional[List[Path]] = None,
    ) -> EmailDeliveryResult:
        """
        Render and send the meeting summary email.

        Args:
            analysis: Structured meeting analysis from the LLM step.
            recipients: List of recipient email addresses.
            attachments: Optional list of file paths to attach to the email.

        Returns:
            EmailDeliveryResult with per-recipient success/failure status.
        """
        subject = f"Meeting Summary: {analysis.meeting_title}"
        html_body = self._render_html(analysis)
        plain_body = self._render_plain(analysis)

        if self._dry_run:
            logger.info("[DRY RUN] Would send email to: %s", recipients)
            logger.info("[DRY RUN] Subject: %s", subject)
            logger.info("[DRY RUN] Plain body preview:\n%s", plain_body[:800])
            return EmailDeliveryResult(
                recipients=[RecipientResult(email=r, success=True) for r in recipients],
                subject=subject,
            )

        results: List[RecipientResult] = []
        with self._smtp_connection() as server:
            for recipient in recipients:
                result = self._send_to_one(
                    server=server,
                    recipient=recipient,
                    subject=subject,
                    html_body=html_body,
                    plain_body=plain_body,
                    attachments=attachments,
                )
                results.append(result)

        delivery = EmailDeliveryResult(recipients=results, subject=subject)
        logger.info(
            "Email delivery complete — %d sent, %d failed.",
            delivery.total_sent,
            delivery.total_failed,
        )
        return delivery

    # ── SMTP ──────────────────────────────────────────────────────────────────

    def _smtp_connection(self) -> smtplib.SMTP:
        """Create and authenticate an SMTP connection."""
        s = self._settings
        # Validate SMTP credentials before attempting connection
        s.validate_smtp()
        logger.debug("Connecting to SMTP %s:%d …", s.smtp_host, s.smtp_port)

        server = smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=30)
        server.ehlo()

        if s.smtp_use_tls:
            server.starttls()
            server.ehlo()

        server.login(s.smtp_user, s.smtp_password)
        logger.debug("SMTP login successful.")
        return server

    def _send_to_one(
        self,
        server: smtplib.SMTP,
        recipient: str,
        subject: str,
        html_body: str,
        plain_body: str,
        attachments: Optional[List[Path]] = None,
    ) -> RecipientResult:
        """Send to a single recipient and return its result."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self._settings.email_from_name} <{self._settings.smtp_user}>"
            msg["To"] = recipient

            msg.attach(MIMEText(plain_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            if attachments:
                for filepath in attachments:
                    if not filepath.exists():
                        continue
                    with open(filepath, "rb") as f:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename={filepath.name}",
                    )
                    msg.attach(part)

            server.sendmail(self._settings.smtp_user, recipient, msg.as_string())
            logger.info("  ✓ Sent to %s", recipient)
            return RecipientResult(email=recipient, success=True)

        except Exception as exc:
            logger.error("  ✗ Failed to send to %s: %s", recipient, exc)
            return RecipientResult(email=recipient, success=False, error=str(exc))

    # ── Template rendering ────────────────────────────────────────────────────

    def _render_html(self, analysis: MeetingAnalysis) -> str:
        """Render the Jinja2 HTML email template."""
        template = self._jinja.get_template("email_template.html")
        timestamp = datetime.now(tz=timezone(timedelta(hours=3))).strftime("%Y-%m-%d %H:%M")
        return template.render(
            analysis=analysis,
            generated_at=f"{timestamp} (توقيت العراق)",
        )

    def _render_plain(self, analysis: MeetingAnalysis) -> str:
        """Generate a plain-text fallback from the analysis data."""
        lines = [
            f"MEETING SUMMARY: {analysis.meeting_title}",
            "=" * 60,
            "",
            "SUMMARY",
            "-" * 40,
            analysis.summary,
            "",
        ]

        if analysis.key_topics:
            lines += ["KEY TOPICS", "-" * 40]
            lines += [f"  • {t}" for t in analysis.key_topics]
            lines.append("")

        if analysis.action_items:
            lines += ["ACTION ITEMS", "-" * 40]
            for i, item in enumerate(analysis.action_items, 1):
                assignee = f" [{item.assignee}]" if item.assignee else ""
                deadline = f" — Due: {item.deadline}" if item.deadline else ""
                priority = f" ({item.priority})" if item.priority else ""
                lines.append(f"  {i}.{assignee}{priority} {item.task}{deadline}")
            lines.append("")

        if analysis.decisions:
            lines += ["KEY DECISIONS", "-" * 40]
            for i, dec in enumerate(analysis.decisions, 1):
                lines.append(f"  {i}. {dec.description}")
                if dec.rationale:
                    lines.append(f"     Rationale: {dec.rationale}")
            lines.append("")

        if analysis.next_meeting_date:
            lines += [f"NEXT MEETING: {analysis.next_meeting_date}", ""]

        lines += [
            "-" * 60,
            "Generated by Meeting Assistant Agent",
        ]
        return "\n".join(lines)
