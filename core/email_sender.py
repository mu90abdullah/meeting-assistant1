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
  - In-memory attachment support (Vercel/serverless compatible)
"""

from __future__ import annotations

import io
import logging
import smtplib
from datetime import datetime, timezone, timedelta
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional, Tuple, Union

from jinja2 import Environment, FileSystemLoader, select_autoescape

from config.settings import Settings
from core.models import EmailDeliveryResult, MeetingAnalysis, RecipientResult

logger = logging.getLogger(__name__)

# Type alias: attachment can be a Path (legacy) or (filename, bytes) tuple (in-memory)
Attachment = Union[Path, Tuple[str, bytes]]

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
        attachments: Optional[List[Attachment]] = None,
    ) -> EmailDeliveryResult:
        """
        Render and send the meeting summary email.

        Args:
            analysis: Structured meeting analysis from the LLM step.
            recipients: List of recipient email addresses.
            attachments: Optional list of attachments. Each item can be:
                         - A Path object (legacy, reads file from disk)
                         - A (filename, bytes) tuple (in-memory, Vercel-safe)

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

        # Normalize attachments to (filename, bytes) tuples
        normalized = self._normalize_attachments(attachments)
        logger.info("Prepared %d attachment(s) for sending.", len(normalized))

        # ── Resend HTTP API Route ──
        if getattr(self._settings, "resend_api_key", ""):
            return self._send_via_resend(
                recipients=recipients,
                subject=subject,
                html_body=html_body,
                plain_body=plain_body,
                attachments=normalized,
            )

        # ── Standard SMTP Route ──
        results: List[RecipientResult] = []
        with self._smtp_connection() as server:
            for recipient in recipients:
                result = self._send_to_one(
                    server=server,
                    recipient=recipient,
                    subject=subject,
                    html_body=html_body,
                    plain_body=plain_body,
                    attachments=normalized,
                )
                results.append(result)

        delivery = EmailDeliveryResult(recipients=results, subject=subject)
        logger.info(
            "Email delivery complete — %d sent, %d failed.",
            delivery.total_sent,
            delivery.total_failed,
        )
        return delivery

    def _normalize_attachments(
        self, attachments: Optional[List[Attachment]]
    ) -> List[Tuple[str, bytes]]:
        """
        Convert any mix of Path objects and (name, bytes) tuples
        into a unified list of (filename, bytes) tuples.
        Works on Vercel and any serverless environment.
        """
        result: List[Tuple[str, bytes]] = []
        if not attachments:
            return result
        for att in attachments:
            try:
                if isinstance(att, tuple):
                    # Already in-memory: (filename, bytes)
                    filename, data = att
                    if data:
                        result.append((filename, data))
                        logger.debug("Attachment ready (in-memory): %s (%d bytes)", filename, len(data))
                    else:
                        logger.warning("Skipping empty in-memory attachment: %s", filename)
                elif isinstance(att, Path):
                    # Legacy file-path attachment
                    if att.exists():
                        data = att.read_bytes()
                        result.append((att.name, data))
                        logger.debug("Attachment ready (file): %s (%d bytes)", att.name, len(data))
                    else:
                        logger.warning("Attachment file not found, skipping: %s", att)
                else:
                    logger.warning("Unknown attachment type: %s", type(att))
            except Exception as e:
                logger.error("Failed to prepare attachment: %s", e)
        return result

    # ── SMTP ──────────────────────────────────────────────────────────────────

    def _smtp_connection(self) -> smtplib.SMTP:
        """Create and authenticate an SMTP connection."""
        s = self._settings
        # Validate SMTP credentials before attempting connection
        s.validate_smtp()
        logger.debug("Connecting to SMTP %s:%d …", s.smtp_host, s.smtp_port)

        if s.smtp_port == 465:
            # Port 465 requires implicit SSL/TLS from the start
            server = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=30)
            server.ehlo()
        else:
            # Ports like 587 use explicit TLS
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
        attachments: Optional[List[Tuple[str, bytes]]] = None,
    ) -> RecipientResult:
        """Send to a single recipient and return its result."""
        try:
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = f"{self._settings.email_from_name} <{self._settings.smtp_user}>"
            msg["To"] = recipient

            # Attach HTML and plain text parts
            body_part = MIMEMultipart("alternative")
            body_part.attach(MIMEText(plain_body, "plain", "utf-8"))
            body_part.attach(MIMEText(html_body, "html", "utf-8"))
            msg.attach(body_part)

            # Attach files from in-memory bytes (Vercel-safe)
            if attachments:
                for filename, data in attachments:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(data)
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f'attachment; filename="{filename}"',
                    )
                    msg.attach(part)

            server.sendmail(self._settings.smtp_user, recipient, msg.as_string())
            logger.info("  ✓ Sent to %s", recipient)
            return RecipientResult(email=recipient, success=True)

        except Exception as exc:
            logger.error("  ✗ Failed to send to %s: %s", recipient, exc)
            return RecipientResult(email=recipient, success=False, error=str(exc))

    def _send_via_resend(
        self,
        recipients: List[str],
        subject: str,
        html_body: str,
        plain_body: str,
        attachments: Optional[List[Tuple[str, bytes]]] = None,
    ) -> EmailDeliveryResult:
        """Send emails using the Resend HTTP API (in-memory, Vercel-safe)."""
        import urllib.request
        import urllib.error
        import json
        import base64

        logger.info("Sending email via Resend API (HTTP)...")
        url = "https://api.resend.com/emails"
        
        # Resend requires a verified domain or onboarding@resend.dev
        from_email = self._settings.smtp_user if self._settings.smtp_user else "onboarding@resend.dev"
        from_header = f"{self._settings.email_from_name} <{from_email}>"

        # Build attachment list from in-memory (filename, bytes) tuples — no disk I/O needed
        attachment_list = []
        if attachments:
            for filename, data in attachments:
                content = base64.b64encode(data).decode("utf-8")
                attachment_list.append({
                    "filename": filename,
                    "content": content
                })
                logger.debug("Resend attachment: %s (%d bytes encoded)", filename, len(content))

        payload = {
            "from": from_header,
            "to": recipients,
            "subject": subject,
            "html": html_body,
            "text": plain_body,
        }
        if attachment_list:
            payload["attachments"] = attachment_list

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Authorization", f"Bearer {self._settings.resend_api_key}")
        req.add_header("Content-Type", "application/json")
        req.add_header("User-Agent", "Mozilla/5.0 (compatible; MeetingAssistant/2.0)")

        results = []
        try:
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                logger.info("  ✓ Sent via Resend successfully. ID: %s", res_data.get("id"))
                for r in recipients:
                    results.append(RecipientResult(email=r, success=True))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            logger.error("  ✗ Failed to send via Resend: HTTP %s - %s", e.code, error_body)
            for r in recipients:
                results.append(RecipientResult(email=r, success=False, error=error_body))
        except Exception as e:
            logger.error("  ✗ Failed to send via Resend: %s", e)
            for r in recipients:
                results.append(RecipientResult(email=r, success=False, error=str(e)))

        delivery = EmailDeliveryResult(recipients=results, subject=subject)
        logger.info(
            "Resend delivery complete — %d sent, %d failed.",
            delivery.total_sent,
            delivery.total_failed,
        )
        return delivery

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
