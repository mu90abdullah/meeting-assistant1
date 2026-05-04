# 🤖 Meeting Assistant — دليل التشغيل الاحترافي

> **الإصدار:** 2.0.0 | **آخر تحديث:** مايو 2026

---

## 📋 جدول المحتويات

1. [نظرة عامة على النظام](#-نظرة-عامة-على-النظام)
2. [المتطلبات الأساسية](#-المتطلبات-الأساسية)
3. [إعداد المشروع لأول مرة](#-إعداد-المشروع-لأول-مرة)
4. [التشغيل المحلي (Local)](#-التشغيل-المحلي-local)
5. [التشغيل عبر الإنترنت (Online / Production)](#-التشغيل-عبر-الإنترنت-online--production)
6. [إعداد ملف البيئة (.env)](#-إعداد-ملف-البيئة-env)
7. [استخدام الواجهة خطوة بخطوة](#-استخدام-الواجهة-خطوة-بخطوة)
8. [أوضاع التفريغ الصوتي (Whisper)](#-أوضاع-التفريغ-الصوتي-whisper)
9. [إعداد البريد الإلكتروني (SMTP)](#-إعداد-البريد-الإلكتروني-smtp)
10. [استكشاف الأخطاء وإصلاحها](#-استكشاف-الأخطاء-وإصلاحها)
11. [بنية المجلدات](#-بنية-المجلدات)

---

## 🧠 نظرة عامة على النظام

**Meeting Assistant** هو تطبيق ذكاء اصطناعي متكامل يقوم بـ:

| الوظيفة | الوصف |
|---|---|
| 🎙️ التفريغ الصوتي | تحويل التسجيل الصوتي إلى نص باستخدام Whisper |
| 📊 التحليل الذكي | استخراج ملخص، مهام، قرارات، ومشاعر الاجتماع |
| 📧 إرسال البريد | إرسال ملخص احترافي بالعربية لجميع المشاركين |
| 📄 توليد الوثائق | حفظ ملفات `.docx` للملخص والنص الكامل |

### مكونات النظام

```
┌─────────────────────────────────────────────────────────┐
│                    المتصفح (Browser)                    │
│              http://localhost:3000                       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP Requests
┌────────────────────────▼────────────────────────────────┐
│              Next.js Frontend (Port 3000)                │
│         React 19 + TypeScript + Tailwind CSS            │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│             FastAPI Backend (Port 8000)                  │
│          Python + Uvicorn + Background Tasks            │
└──────┬──────────────────────────┬───────────────────────┘
       │                          │
┌──────▼──────┐          ┌────────▼────────┐
│   Whisper   │          │   Groq / OpenAI │
│ (تفريغ صوت) │          │  (تحليل LLM)    │
└─────────────┘          └─────────────────┘
```

---

## ✅ المتطلبات الأساسية

### البرامج المطلوبة

| البرنامج | الإصدار الأدنى | رابط التحميل |
|---|---|---|
| **Python** | 3.10+ | https://python.org/downloads |
| **Node.js** | 18.0+ | https://nodejs.org |
| **npm** | 9.0+ | يأتي مع Node.js |
| **Git** | أي إصدار | https://git-scm.com |
| **ffmpeg** | أي إصدار | https://ffmpeg.org/download.html (مطلوب للـ Whisper المحلي فقط) |

### للتحقق من التثبيت

افتح **PowerShell** وشغّل:

```powershell
python --version      # Python 3.10.x أو أحدث
node --version        # v18.x.x أو أحدث
npm --version         # 9.x.x أو أحدث
ffmpeg -version       # (اختياري — للـ Whisper المحلي فقط)
```

### مفاتيح API المطلوبة

| المزود | الاستخدام | الرابط | السعر |
|---|---|---|---|
| **Groq** | تحليل النص (LLM) | https://console.groq.com | مجاني ✅ |
| **Groq** | تفريغ الصوت (Whisper API) | https://console.groq.com | مجاني ✅ |
| **OpenAI** | بديل لـ LLM أو Whisper | https://platform.openai.com | مدفوع 💳 |
| **Google Gemini** | بديل مجاني لـ LLM | https://aistudio.google.com | مجاني ✅ |

---

## 🚀 إعداد المشروع لأول مرة

> ⚠️ **هذه الخطوات تُنفَّذ مرة واحدة فقط عند أول تشغيل للمشروع.**

### الخطوة 1 — فتح المجلد

افتح **PowerShell** وانتقل إلى مجلد المشروع:

```powershell
cd C:\Users\Admin\Desktop\haybrid\Task1\meeting-assistant
```

---

### الخطوة 2 — إنشاء البيئة الافتراضية Python

```powershell
python -m venv venv
```

ثم فعّلها:

```powershell
.\venv\Scripts\Activate.ps1
```

> ✅ ستظهر `(venv)` في بداية سطر الأوامر عند النجاح.

**ملاحظة لـ Windows:** إذا ظهر خطأ في السياسة، شغّل أولاً:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### الخطوة 3 — تثبيت مكتبات Python

```powershell
pip install -r requirements.txt
```

**للـ Whisper المحلي (اختياري):**

```powershell
pip install openai-whisper
```

---

### الخطوة 4 — تثبيت حزم Node.js

```powershell
cd frontend
npm install
cd ..
```

---

### الخطوة 5 — إعداد ملف البيئة

```powershell
copy .env.example .env
```

ثم افتح `.env` وعدّل القيم — راجع قسم [إعداد ملف البيئة](#-إعداد-ملف-البيئة-env) أدناه.

---

## 💻 التشغيل المحلي (Local)

### الطريقة الأولى (الأسهل) — ملف BAT

انقر نقراً مزدوجاً على الملف:

```
start_webapp.bat
```

سيقوم الملف تلقائياً بـ:
1. ✅ تشغيل **FastAPI Backend** على `http://localhost:8000`
2. ✅ تشغيل **Next.js Frontend** على `http://localhost:3000`
3. ✅ فتح المتصفح تلقائياً على `http://localhost:3000`

---

### الطريقة الثانية — يدوياً (للمطورين)

#### نافذة 1 — Backend

```powershell
cd C:\Users\Admin\Desktop\haybrid\Task1\meeting-assistant
.\venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

الناتج المتوقع:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

#### نافذة 2 — Frontend

```powershell
cd C:\Users\Admin\Desktop\haybrid\Task1\meeting-assistant\frontend
npm run dev
```

الناتج المتوقع:
```
▲ Next.js 16.2.4
- Local:        http://localhost:3000
- Ready in 2.1s
```

#### فتح التطبيق

افتح المتصفح واذهب إلى:

```
http://localhost:3000
```

---

### التحقق من تشغيل الـ Backend

افتح في المتصفح:

```
http://localhost:8000
```

يجب أن ترى:
```json
{
  "message": "Meeting Assistant API v2.0",
  "status": "running"
}
```

أو افتح واجهة Swagger التوثيقية:

```
http://localhost:8000/docs
```

---

### إيقاف الخوادم

- في كل نافذة PowerShell: اضغط `CTRL + C`
- أو أغلق النوافذ مباشرة

---

## 🌐 التشغيل عبر الإنترنت (Online / Production)

### الخيار أ — النشر على Vercel + Railway

#### 1. نشر Backend على Railway

1. اذهب إلى https://railway.app وسجّل دخولك
2. اضغط **New Project → Deploy from GitHub**
3. اربط مستودعك وحدد مجلد `meeting-assistant`
4. في إعدادات البيئة، أضف متغيرات `.env` مباشرة
5. حدد أمر التشغيل:
   ```
   python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
   ```
6. انتظر الـ Deploy وستحصل على رابط مثل:
   ```
   https://meeting-assistant-backend.railway.app
   ```

#### 2. تعديل الـ Frontend لاستخدام الرابط الجديد

افتح `frontend/app/page.tsx` وعدّل السطر:

```typescript
// قبل:
const API_BASE = 'http://localhost:8000';

// بعد:
const API_BASE = 'https://meeting-assistant-backend.railway.app';
```

#### 3. نشر Frontend على Vercel

1. اذهب إلى https://vercel.com وسجّل دخولك
2. اضغط **New Project → Import Git Repository**
3. حدد **Root Directory** = `meeting-assistant/frontend`
4. اضغط **Deploy**
5. ستحصل على رابط مثل:
   ```
   https://meeting-assistant.vercel.app
   ```

---

### الخيار ب — النشر على VPS (مثل DigitalOcean / AWS)

#### 1. رفع الملفات للسيرفر

```bash
scp -r ./meeting-assistant user@YOUR_SERVER_IP:/home/user/
```

#### 2. تثبيت المتطلبات على السيرفر

```bash
# Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Node.js
cd frontend && npm install && npm run build
```

#### 3. تشغيل الـ Backend مع PM2

```bash
pip install gunicorn
pm2 start "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000" --name meeting-backend
```

#### 4. تشغيل الـ Frontend

```bash
cd frontend
pm2 start "npm start" --name meeting-frontend
```

#### 5. إعداد Nginx (اختياري للدومين)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
    }
}
```

---

### إعداد CORS للإنترنت

عند النشر عبر الإنترنت، عدّل `backend/main.py`:

```python
# قبل:
allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],

# بعد:
allow_origins=[
    "http://localhost:3000",
    "https://meeting-assistant.vercel.app",  # ← رابط Vercel الخاص بك
],
```

---

## ⚙️ إعداد ملف البيئة (.env)

ملف `.env` هو المكان الذي تضع فيه جميع مفاتيح API وإعدادات النظام.

```env
# ════════════════════════════════════════════
#   Meeting Assistant — Environment Variables
# ════════════════════════════════════════════

# ── مزود الذكاء الاصطناعي للتحليل ──────────
# الخيارات: groq | openai | gemini
LLM_PROVIDER=groq

# ── Groq (مجاني — الأسرع والأنسب) ──────────
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── OpenAI (بديل مدفوع — الأدق) ─────────────
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_MODEL=gpt-4o

# ── Google Gemini (بديل مجاني) ───────────────
# GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── وضع التفريغ الصوتي ──────────────────────
# groq   = يستخدم Whisper API من Groq (سريع، مجاني)
# local  = يستخدم Whisper على جهازك (يحتاج GPU)
WHISPER_MODE=groq
WHISPER_LOCAL_MODEL=base
WHISPER_LANGUAGE=ar

# ── البريد الإلكتروني (اختياري) ─────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_USE_TLS=true
EMAIL_FROM_NAME=Meeting Assistant

# ── إعدادات عامة ────────────────────────────
LOG_LEVEL=INFO
OUTPUT_DIR=./output
```

### الحصول على مفتاح Groq

1. اذهب إلى https://console.groq.com
2. سجّل حساباً مجانياً
3. اضغط **API Keys → Create API Key**
4. انسخ المفتاح وضعه في `GROQ_API_KEY`

---

## 🖥️ استخدام الواجهة خطوة بخطوة

### الخطوة 1 — رفع التسجيل الصوتي

لديك خياران:

**أ) رفع ملف موجود:**
- اضغط على منطقة الرفع أو اسحب الملف إليها
- الصيغ المدعومة: `.mp3` `.wav` `.m4a` `.mp4` `.flac` `.ogg` `.webm` `.mkv`
- الحد الأقصى الموصى به: 25 MB

**ب) تسجيل مباشر من المتصفح:**
- اضغط زر **التسجيل** 🎙️
- اسمح للمتصفح باستخدام الميكروفون
- اضغط **إيقاف** عند الانتهاء
- سيُحفظ التسجيل تلقائياً

---

### الخطوة 2 — إدخال عنوان الاجتماع (اختياري)

اكتب عنوان الاجتماع في حقل **"عنوان الاجتماع"** ليظهر في التقرير والبريد الإلكتروني.

---

### الخطوة 3 — إضافة المشاركين (اختياري)

في حقل **البريد الإلكتروني:**
- اكتب عنوان البريد واضغط **Enter** أو **Comma (,)**
- يمكنك إضافة عدة عناوين
- سيُرسَل إليهم الملخص تلقائياً بعد المعالجة

---

### الخطوة 4 — اختيار وضع المعالجة

| الوضع | الوصف | متى تستخدمه؟ |
|---|---|---|
| **Groq** ☁️ | يرسل الصوت لخوادم Groq للتفريغ | الاستخدام العادي — سريع ومجاني |
| **Local** 🖥️ | يفرّغ الصوت على جهازك | للخصوصية التامة أو عند انقطاع الإنترنت |

---

### الخطوة 5 — بدء المعالجة

اضغط زر **Start** ▶️

ستمر العملية بالمراحل التالية:

```
 5% → رفع الملف
10% → تحميل النموذج وبدء التفريغ
20% → تفريغ الصوت إلى نص
55% → اكتمل التفريغ — بدء التحليل
65% → تحليل الاجتماع بالذكاء الاصطناعي
80% → حفظ الملفات
88% → إرسال البريد الإلكتروني
100% → اكتملت العملية ✓
```

---

### الخطوة 6 — مراجعة النتائج

بعد الانتهاء ستظهر النتائج تشمل:

- 📝 **النص الكامل** للتسجيل
- 📋 **ملخص الاجتماع**
- 🎯 **المواضيع الرئيسية**
- ✅ **المهام (Action Items)** مع المسؤول والموعد والأولوية
- ⚖️ **القرارات** المتخذة
- 😊 **مؤشر المزاج العام** للاجتماع
- 📅 **موعد الاجتماع القادم** (إن ذُكر)

---

### الخطوة 7 — العودة لاجتماع جديد

اضغط **Go Back** للعودة وبدء اجتماع جديد.

---

## 🎙️ أوضاع التفريغ الصوتي (Whisper)

### وضع Groq API (الموصى به)

```env
WHISPER_MODE=groq
GROQ_API_KEY=gsk_xxxx
```

- ✅ لا يحتاج GPU
- ✅ سريع جداً
- ✅ مجاني
- ❌ يحتاج اتصال إنترنت

---

### وضع Local Whisper

```env
WHISPER_MODE=local
WHISPER_LOCAL_MODEL=base   # tiny | base | small | medium | large-v3
WHISPER_LANGUAGE=ar
```

أولاً ثبّت المكتبة:

```powershell
pip install openai-whisper
```

وتأكد من تثبيت ffmpeg وإضافته لـ PATH:

```powershell
# بعد تثبيت ffmpeg
ffmpeg -version
```

| حجم النموذج | الدقة | السرعة | RAM المطلوب |
|---|---|---|---|
| `tiny` | منخفضة | سريع جداً | 1 GB |
| `base` | جيدة | سريع | 1 GB |
| `small` | جيدة جداً | متوسط | 2 GB |
| `medium` | عالية | بطيء | 5 GB |
| `large-v3` | الأعلى ✨ | بطيء جداً | 10 GB |

---

## 📧 إعداد البريد الإلكتروني (SMTP)

### Gmail

1. فعّل **التحقق بخطوتين** في حساب Google
2. اذهب إلى: **حساب Google → الأمان → كلمات مرور التطبيقات**
3. أنشئ كلمة مرور لتطبيق "Mail"
4. ضع البيانات في `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx   # كلمة مرور التطبيق (16 حرف)
SMTP_USE_TLS=true
```

### Outlook / Microsoft 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_USE_TLS=true
```

> ⚠️ **تحذير:** لا تستخدم كلمة مرور حسابك الرئيسية في `SMTP_PASSWORD`. استخدم دائماً **App Password** للأمان.

---

## 🔍 استكشاف الأخطاء وإصلاحها

### ❌ خطأ: `ModuleNotFoundError`

```
ModuleNotFoundError: No module named 'fastapi'
```

**الحل:**
```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

### ❌ خطأ: `Port 8000 already in use`

**الحل:**
```powershell
# إيجاد العملية التي تستخدم المنفذ
netstat -ano | findstr :8000

# إغلاقها (استبدل XXXX برقم PID)
taskkill /PID XXXX /F
```

---

### ❌ خطأ: `CORS Error` في المتصفح

تأكد أن Backend يعمل على Port 8000 وليس غيره، وأن `page.tsx` يحتوي على:

```typescript
const API_BASE = 'http://localhost:8000';
```

---

### ❌ خطأ: `GROQ_API_KEY not set`

تأكد أن ملف `.env` موجود في جذر المشروع وأن `GROQ_API_KEY` مضبوط بشكل صحيح.

---

### ❌ خطأ: `ffmpeg not found`

قم بتثبيت ffmpeg وإضافته إلى PATH:

1. حمّل من https://ffmpeg.org/download.html
2. فك الضغط إلى `C:\ffmpeg`
3. أضف `C:\ffmpeg\bin` إلى متغير `PATH`:
   - **System Properties → Environment Variables → Path → Edit → New**
4. أعد تشغيل PowerShell

---

### ❌ الصوت لا يُفرَّغ بالعربية

تأكد من الإعداد:
```env
WHISPER_LANGUAGE=ar
```

---

### ❌ البريد الإلكتروني لا يُرسَل

1. تأكد من صحة بيانات SMTP في `.env`
2. بالنسبة لـ Gmail: تأكد من استخدام **App Password** وليس كلمة المرور الرئيسية
3. تحقق من سجل الأخطاء في نافذة Backend

---

## 📁 بنية المجلدات

```
meeting-assistant/
├── 📄 .env                    ← إعدادات البيئة (لا تشاركه مع أحد!)
├── 📄 .env.example            ← قالب إعدادات البيئة
├── 📄 requirements.txt        ← مكتبات Python المطلوبة
├── 📄 start_webapp.bat        ← تشغيل التطبيق بنقرة واحدة
│
├── 📁 backend/
│   └── main.py               ← FastAPI Server + API Endpoints
│
├── 📁 core/
│   ├── transcriber.py        ← Whisper تفريغ الصوت
│   ├── analyzer.py           ← تحليل الاجتماع بالـ LLM
│   ├── email_sender.py       ← إرسال البريد الإلكتروني
│   └── models.py             ← نماذج البيانات (Pydantic)
│
├── 📁 config/
│   └── settings.py           ← تحميل وتحقق إعدادات .env
│
├── 📁 frontend/
│   ├── package.json          ← إعدادات Node.js
│   └── app/
│       ├── page.tsx          ← الصفحة الرئيسية
│       ├── layout.tsx        ← تخطيط التطبيق
│       ├── globals.css       ← الأنماط العامة
│       └── components/       ← مكونات React
│           ├── FileUpload.tsx
│           ├── AudioRecorder.tsx
│           ├── EmailInput.tsx
│           ├── ModeToggle.tsx
│           ├── ProgressBar.tsx
│           └── ResultsViewer.tsx
│
├── 📁 output/                ← ملفات الإخراج (تُنشأ تلقائياً)
│   └── uploads/              ← ملفات الصوت المرفوعة
│
├── 📁 templates/             ← قوالب HTML للبريد الإلكتروني
└── 📁 logs/                  ← سجلات النظام
```

---

## 🔗 روابط سريعة

| الرابط | الوصف |
|---|---|
| http://localhost:3000 | واجهة التطبيق |
| http://localhost:8000 | Backend API |
| http://localhost:8000/docs | توثيق API (Swagger UI) |
| https://console.groq.com | لوحة تحكم Groq API |
| https://aistudio.google.com | مفاتيح Gemini API |
| https://platform.openai.com | مفاتيح OpenAI API |

---

> 📌 **ملاحظة أمنية:** لا تشارك ملف `.env` أو تضعه في GitHub. تأكد من أنه مُضاف في `.gitignore`.

---

*Meeting Assistant v2.0.0 — Powered by Groq + Whisper + Next.js*
