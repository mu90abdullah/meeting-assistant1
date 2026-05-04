"""
backend/main.py
---------------
FastAPI backend server for the Meeting Assistant Web Application.

Endpoints:
  POST /api/process          - Upload audio, start background job
  GET  /api/status/{job_id}  - SSE stream of job progress
  GET  /api/result/{job_id}  - Fetch final results when done
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add the parent directory to path so we can import core modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from config.settings import Settings
from core.models import MeetingAnalysis, TranscriptionResult
from core.transcriber import WhisperTranscriber
from core.analyzer import MeetingAnalyzer
from core.email_sender import EmailSender

try:
    from docx import Document
    from docx.shared import Pt
except ImportError:
    Document = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Meeting Assistant API",
    description="Transcribe, analyze, and email meeting summaries",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory job store ────────────────────────────────────────────────────────
# Structure: { job_id: { status, progress, stage, result, error } }
JOBS: dict[str, dict] = {}

# Upload temp directory
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "output" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _update_job(job_id: str, **kwargs):
    """Thread-safe update to the job store."""
    if job_id in JOBS:
        JOBS[job_id].update(kwargs)


def _save_docx_summary(analysis: MeetingAnalysis, output_dir: Path, base_name: str) -> Optional[Path]:
    if Document is None:
        return None
    path = output_dir / f"{base_name}_Summary.docx"
    doc = Document()
    doc.add_heading(analysis.meeting_title, level=0)
    doc.add_heading("الملخص (Summary)", level=1)
    doc.add_paragraph(analysis.summary)
    if analysis.key_topics:
        doc.add_heading("المواضيع الرئيسية", level=1)
        for t in analysis.key_topics:
            doc.add_paragraph(t, style="List Bullet")
    if analysis.action_items:
        doc.add_heading("المهام (Action Items)", level=1)
        table = doc.add_table(rows=1, cols=5)
        table.style = "Table Grid"
        hdr = table.rows[0].cells
        hdr[0].text = "#"
        hdr[1].text = "المهمة"
        hdr[2].text = "المسؤول"
        hdr[3].text = "الموعد"
        hdr[4].text = "الأولوية"
        for i, item in enumerate(analysis.action_items, 1):
            row = table.add_row().cells
            row[0].text = str(i)
            row[1].text = item.task.replace("\n", " ")
            row[2].text = item.assignee or "—"
            row[3].text = item.deadline or "—"
            row[4].text = item.priority or "—"
    if analysis.decisions:
        doc.add_heading("القرارات (Decisions)", level=1)
        for i, dec in enumerate(analysis.decisions, 1):
            doc.add_paragraph(f"{i}. {dec.description.strip()}")
    if analysis.next_meeting_date:
        doc.add_heading("الاجتماع القادم", level=1)
        doc.add_paragraph(analysis.next_meeting_date)
    doc.save(str(path))
    return path


def _save_docx_transcript(transcription: TranscriptionResult, analysis: MeetingAnalysis, output_dir: Path, base_name: str) -> Optional[Path]:
    if Document is None:
        return None
    path = output_dir / f"{base_name}_Transcript.docx"
    doc = Document()
    doc.add_heading(f"التفريغ النصي الكامل - {analysis.meeting_title}", level=0)
    doc.add_paragraph(f"الملف الصوتي: {transcription.audio_file}")
    doc.add_paragraph(f"اللغة: {transcription.language}")
    doc.add_paragraph("---")
    for line in transcription.text.split("\n"):
        if line.strip():
            doc.add_paragraph(line.strip())
    doc.save(str(path))
    return path


# ── Background pipeline ────────────────────────────────────────────────────────

def run_pipeline(
    job_id: str,
    audio_path: Path,
    participants: list[str],
    meeting_title: Optional[str],
    mode: str,  # "local" or "groq"
):
    """
    Full processing pipeline run in a background thread.
    mode="local"  -> Whisper local model + Groq LLM
    mode="groq"   -> Whisper Groq API  + Groq LLM
    """
    try:
        settings = Settings.load()

        # ── Configure mode ─────────────────────────────────────────────────────
        if mode == "local":
            settings.whisper_mode = "local"
        else:
            settings.whisper_mode = "groq"

        # Always use Groq for LLM analysis
        settings.llm_provider = "groq"

        # ── Step 1: Transcription ──────────────────────────────────────────────
        _update_job(job_id,
                    status="running",
                    progress=10,
                    stage="جاري تحميل النموذج وبدء التفريغ النصي...")
        logger.info("[%s] Starting transcription (mode=%s)", job_id, mode)

        transcriber = WhisperTranscriber(settings)

        _update_job(job_id, progress=20, stage="جاري تفريغ الصوت إلى نص...")
        transcription: TranscriptionResult = transcriber.transcribe(str(audio_path))

        _update_job(job_id,
                    progress=55,
                    stage=f"اكتمل التفريغ النصي ({len(transcription.text):,} حرف) — جاري تحليل المحتوى...")
        logger.info("[%s] Transcription done. Chars: %d", job_id, len(transcription.text))

        # ── Step 2: Analysis ───────────────────────────────────────────────────
        analyzer = MeetingAnalyzer(settings)

        _update_job(job_id, progress=65, stage="جاري تحليل الاجتماع بالذكاء الاصطناعي...")
        analysis: MeetingAnalysis = analyzer.analyze(transcription, meeting_title=meeting_title)

        _update_job(job_id,
                    progress=80,
                    stage=f"اكتمل التحليل ({len(analysis.action_items)} مهام, {len(analysis.decisions)} قرارات) — جاري حفظ الملفات...")
        logger.info("[%s] Analysis done.", job_id)

        # ── Step 3: Save output files ──────────────────────────────────────────
        output_dir = settings.output_dir
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        base_name = f"{timestamp}_{job_id[:8]}"

        attachments = []
        summary_docx = _save_docx_summary(analysis, output_dir, base_name)
        transcript_docx = _save_docx_transcript(transcription, analysis, output_dir, base_name)
        if summary_docx:
            attachments.append(summary_docx)
        if transcript_docx:
            attachments.append(transcript_docx)

        # ── Step 4: Email ──────────────────────────────────────────────────────
        email_sent = False
        email_error = None
        if participants:
            try:
                _update_job(job_id, progress=88, stage="جاري إرسال البريد الإلكتروني...")
                sender = EmailSender(settings, dry_run=False)
                sender.send(analysis, participants, attachments=attachments)
                email_sent = True
                logger.info("[%s] Email sent to %d recipients.", job_id, len(participants))
            except Exception as e:
                email_error = str(e)
                logger.warning("[%s] Email failed: %s", job_id, e)

        # ── Done ───────────────────────────────────────────────────────────────
        _update_job(
            job_id,
            status="done",
            progress=100,
            stage="اكتملت العملية بنجاح ✓",
            result={
                "transcript": transcription.text,
                "language": transcription.language,
                "duration_seconds": transcription.duration_seconds,
                "meeting_title": analysis.meeting_title,
                "summary": analysis.summary,
                "key_topics": analysis.key_topics,
                "action_items": [
                    {
                        "task": item.task,
                        "assignee": item.assignee,
                        "deadline": item.deadline,
                        "priority": item.priority,
                    }
                    for item in analysis.action_items
                ],
                "decisions": [
                    {
                        "description": dec.description,
                        "made_by": dec.made_by,
                        "rationale": dec.rationale,
                    }
                    for dec in analysis.decisions
                ],
                "participants_mentioned": analysis.participants_mentioned,
                "sentiment": analysis.sentiment,
                "next_meeting_date": analysis.next_meeting_date,
                "email_sent": email_sent,
                "email_error": email_error,
                "email_recipients": participants,
            },
            error=None,
        )
        logger.info("[%s] Pipeline completed.", job_id)

    except Exception as exc:
        logger.exception("[%s] Pipeline error: %s", job_id, exc)
        _update_job(
            job_id,
            status="error",
            progress=0,
            stage="حدث خطأ أثناء المعالجة",
            error=str(exc),
        )
    finally:
        # We are keeping the audio file as an archive, so we no longer unlink it.
        pass


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Meeting Assistant API v2.0", "status": "running"}

@app.post("/api/save-audio")
async def save_audio(audio: UploadFile = File(...)):
    """
    Saves an audio file directly to the uploads directory.
    Used for automatically archiving recordings immediately after they are stopped.
    """
    upload_dir = Path(__file__).resolve().parent.parent / "output" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / audio.filename
    content = await audio.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    return {"message": "تم حفظ التسجيل بنجاح", "path": str(file_path)}

@app.delete("/api/delete-audio/{filename}")
async def delete_audio(filename: str):
    """
    Deletes an audio file from the uploads directory.
    """
    upload_dir = Path(__file__).resolve().parent.parent / "output" / "uploads"
    file_path = upload_dir / filename
    
    # Simple security check to prevent directory traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    if file_path.exists():
        try:
            file_path.unlink()
            return {"message": "تم حذف الملف بنجاح"}
        except Exception as e:
            logger.error(f"Failed to delete file {filename}: {e}")
            raise HTTPException(status_code=500, detail="فشل حذف الملف")
    else:
        return {"message": "الملف غير موجود، ربما تم حذفه مسبقاً"}


@app.post("/api/process")
async def process_meeting(
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    participants: str = Form(""),        # comma-separated emails
    meeting_title: Optional[str] = Form(None),
    mode: str = Form("groq"),            # "local" or "groq"
):
    """
    Upload an audio file and start the processing pipeline.
    Returns a job_id for status polling.
    """
    # Validate file type
    allowed = {".mp3", ".wav", ".m4a", ".mp4", ".flac", ".ogg", ".webm", ".mkv"}
    suffix = Path(audio.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"نوع الملف غير مدعوم: {suffix}. الأنواع المدعومة: {', '.join(allowed)}"
        )

    # Validate mode
    if mode not in ("local", "groq"):
        raise HTTPException(status_code=400, detail="وضع المعالجة يجب أن يكون 'local' أو 'groq'")

    # Save uploaded file
    job_id = str(uuid.uuid4())
    audio_path = UPLOAD_DIR / f"{job_id}{suffix}"

    content = await audio.read()
    with open(audio_path, "wb") as f:
        f.write(content)

    # Clean up the auto-saved duplicate to prevent having two identical copies
    auto_saved_path = UPLOAD_DIR / audio.filename
    if auto_saved_path.exists() and auto_saved_path.name != audio_path.name:
        try:
            auto_saved_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to remove duplicate auto-saved file: {e}")

    # Parse participants
    emails = [e.strip() for e in participants.split(",") if e.strip()]

    # Initialize job
    JOBS[job_id] = {
        "status": "queued",
        "progress": 0,
        "stage": "في قائمة الانتظار...",
        "result": None,
        "error": None,
        "created_at": datetime.utcnow().isoformat(),
        "mode": mode,
        "filename": audio.filename,
    }

    # Start background task
    background_tasks.add_task(
        run_pipeline,
        job_id=job_id,
        audio_path=audio_path,
        participants=emails,
        meeting_title=meeting_title or None,
        mode=mode,
    )

    logger.info("Job %s created. File: %s, Mode: %s, Recipients: %s",
                job_id, audio.filename, mode, emails)

    return {"job_id": job_id, "status": "queued"}


@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    """
    Get current status/progress for a job.
    Returns JSON with: status, progress (0-100), stage, error
    """
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")

    job = JOBS[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],      # queued | running | done | error
        "progress": job["progress"],  # 0-100
        "stage": job["stage"],        # human-readable stage description
        "error": job.get("error"),
    }


@app.get("/api/result/{job_id}")
async def get_result(job_id: str):
    """
    Fetch the full result for a completed job.
    """
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")

    job = JOBS[job_id]
    if job["status"] == "error":
        raise HTTPException(status_code=500, detail=job.get("error", "حدث خطأ غير معروف"))
    if job["status"] != "done":
        raise HTTPException(status_code=202, detail="لم تكتمل المعالجة بعد")

    return job["result"]


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Remove a job from memory."""
    JOBS.pop(job_id, None)
    return {"message": "تم حذف المهمة"}
