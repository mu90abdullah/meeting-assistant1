# 🤖 Meeting Assistant Agent

An autonomous, production-grade AI agent that converts meeting recordings into structured summaries and delivers them directly to participants via email — all in a single command.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎙️ Speech-to-Text | OpenAI Whisper (API or local) with auto-chunking for large files |
| 🧠 LLM Analysis | GPT-4o extracts summary, action items, decisions, topics & sentiment |
| 📧 Email Delivery | Beautiful HTML emails sent via SMTP (Gmail, Outlook, custom) |
| 🗂️ Structured Output | Validates all data with Pydantic v2 → saves timestamped JSON |
| 🔁 Retry Logic | Automatic retries with exponential backoff on transient API errors |
| 🧪 Test Suite | Full unit tests with mocked API calls |
| 🖥️ Rich CLI | Color-coded terminal output with progress indicators |
| 🔒 Dry-Run Mode | Test the full pipeline without sending emails |

---

## 🏗️ Architecture

```
Audio File (MP3/WAV/M4A)
        │
        ▼
┌─────────────────────┐
│  WhisperTranscriber │  ──→  TranscriptionResult
│  (core/transcriber) │       (text, language, duration)
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│   MeetingAnalyzer   │  ──→  MeetingAnalysis
│   (core/analyzer)   │       (summary, actions, decisions)
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│    EmailSender      │  ──→  EmailDeliveryResult
│  (core/email_sender)│       (per-recipient status)
└─────────────────────┘
        │
        ▼
   ✅ JSON saved to output/ + Email sent
```

---

## 📁 Project Structure

```
meeting-assistant/
├── agent.py                    # 🤖 Main CLI entry point
├── .env.example               # Environment variable template
├── requirements.txt
├── .gitignore
│
├── config/
│   └── settings.py             # Centralized config from env vars
│
├── core/
│   ├── models.py               # Pydantic data models
│   ├── transcriber.py          # Whisper speech-to-text
│   ├── analyzer.py             # GPT-4o meeting analysis
│   └── email_sender.py         # SMTP email delivery
│
├── templates/
│   └── email_template.html     # Jinja2 HTML email
│
├── output/                     # Auto-created — JSON results saved here
└── logs/                       # Auto-created — agent.log written here
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd meeting-assistant
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys and SMTP credentials
```

**Gmail Setup:**
1. Enable 2-Factor Authentication in your Google Account
2. Go to: Google Account → Security → App Passwords
3. Generate an App Password for "Mail" → paste into `SMTP_PASSWORD`

### 3. Run the Agent

```bash
# Full pipeline: transcribe → analyze → email
python agent.py \
  --audio meeting.mp3 \
  --participants alice@company.com bob@company.com \
  --title "Q2 Planning Session"

# Dry run (no email sent — perfect for testing)
python agent.py --audio meeting.mp3 --dry-run

# Use an existing transcript (skip Whisper step)
python agent.py \
  --transcript-file transcript.txt \
  --title "Team Sync" \
  --participants team@company.com

# Use local Whisper model (free, requires GPU/CPU + ffmpeg)
python agent.py --audio meeting.mp3 --whisper-mode local
```

---

## ⚙️ All CLI Options

```
usage: meeting-assistant [-h] [--audio FILE | --transcript-file FILE]
                         [--title TITLE] [--participants EMAIL [EMAIL ...]]
                         [--whisper-mode {api,local}]
                         [--dry-run] [--no-email] [--output-dir DIR]

Options:
  --audio, -a FILE          Meeting audio file (MP3, WAV, M4A, FLAC)
  --transcript-file, -t     Existing transcript text file (skips transcription)
  --title TITLE             Meeting title override (LLM infers if not given)
  --participants, -p EMAIL  Recipient email addresses (space-separated)
  --whisper-mode {api,local}  Transcription mode (default: from .env)
  --dry-run                 Run full pipeline, skip actual email sending
  --no-email                Skip email entirely
  --output-dir DIR          Output directory for JSON results
```

---

## 🧪 Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pip install pytest-cov
pytest tests/ -v --cov=core --cov-report=term-missing
```

---

## 📊 Output Format

Results are saved to `output/YYYYMMDD_HHMMSS_<title>.json`:

```json
{
  "audio_file": "meeting.mp3",
  "transcription": {
    "text": "...",
    "language": "en",
    "duration_seconds": 3600.0
  },
  "analysis": {
    "meeting_title": "Q2 Planning Session",
    "summary": "The team reviewed Q2 targets...",
    "key_topics": ["Budget", "Roadmap", "Hiring"],
    "action_items": [
      {
        "task": "Prepare budget report",
        "assignee": "Alice",
        "deadline": "Friday",
        "priority": "high"
      }
    ],
    "decisions": [
      {
        "description": "Adopt microservices architecture",
        "made_by": "CTO",
        "rationale": "Scalability requirements"
      }
    ],
    "participants_mentioned": ["Alice", "Bob", "CTO"],
    "sentiment": "positive",
    "next_meeting_date": "May 3rd at 10am"
  }
}
```

---

## 🔐 Security & Best Practices

- **Never commit `.env`** — it contains your API keys and SMTP credentials
- Use **App Passwords** for Gmail, not your account password
- The `.gitignore` excludes `.env`, `output/`, `logs/`, and audio files
- All secrets are loaded via environment variables — no hardcoded credentials

---

## 🚀 Suggested Enhancements (Phase 5)

| Enhancement | Tool / Library | Notes |
|---|---|---|
| Speaker Diarization | `pyannote.audio` | Identify who said what |
| Real-time Streaming | Whisper streaming + WebSockets | Process live meetings |
| Calendar Integration | Google Calendar API | Auto-create events from action items |
| Slack Notification | Slack Webhooks | Post summary to a channel |
| Web Dashboard | FastAPI + HTML | Upload audio via browser |
| Database Storage | SQLAlchemy + SQLite/PostgreSQL | Persist all meeting records |
| Multi-language | Whisper native + GPT-4o | Already supported; expose via CLI |
| Monitoring | Prometheus + Grafana | Track API latency, error rates |

---

## 📄 License

MIT License — free for personal and commercial use.
