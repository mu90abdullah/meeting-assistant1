'use client';

import { useState, useCallback, useRef } from 'react';
import FileUpload from './components/FileUpload';
import AudioRecorder from './components/AudioRecorder';
import EmailInput from './components/EmailInput';
import ModeToggle from './components/ModeToggle';
import ProgressBar from './components/ProgressBar';
import ResultsViewer from './components/ResultsViewer';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = 1500;

type JobStatus = 'idle' | 'queued' | 'running' | 'done' | 'error';

interface JobState {
  jobId: string;
  status: JobStatus;
  progress: number;
  stage: string;
  error: string | null;
}



const steps = [
  { step: '1', title: ' التسجيل الصوتي', desc: 'اسحب الملف الصوتي أو سجّل مباشرة  .' },
  { step: '2', title: 'المعالجة', desc: 'يتم تفريغ الصوت وتلخيصه تلقائياً .' },
  { step: '3', title: 'ارسال النتائج', desc: ' يتم ارسال الملخص بريدياً للمشاركين.' },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<'upload' | 'record' | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [mode, setMode] = useState<'local' | 'groq'>('groq');
  const [job, setJob] = useState<JobState | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isProcessing = job?.status === 'queued' || job?.status === 'running';

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const fetchResult = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/result/${jobId}`);
      if (res.ok) { const data = await res.json(); setResult(data); }
    } catch (e) { console.error('Failed to fetch result', e); }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status/${jobId}?t=${Date.now()}`);
        if (!res.ok) {
          if (res.status === 404) {
            setJob(prev => prev ? { ...prev, status: 'error', error: 'فُقدت المهمة (ربما أعيد تشغيل الخادم). يرجى المحاولة مرة أخرى.' } : null);
            stopPolling();
          }
          return;
        }
        const data = await res.json();
        setJob(prev => prev ? { ...prev, status: data.status, progress: data.progress, stage: data.stage, error: data.error ?? null } : null);
        if (data.status === 'done') { stopPolling(); await fetchResult(jobId); }
        else if (data.status === 'error') { stopPolling(); }
      } catch (e) { console.error('Polling error', e); }
    }, POLL_INTERVAL_MS);
  }, [stopPolling, fetchResult]);

  const handleSubmit = useCallback(async () => {
    if (!file) return;
    setResult(null);
    setJob({ jobId: '', status: 'queued', progress: 0, stage: 'جاري رفع الملف...', error: null });
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('participants', emails.join(','));
      formData.append('meeting_title', meetingTitle.trim());
      formData.append('mode', mode);
      const res = await fetch(`${API_BASE}/api/process`, { method: 'POST', body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'فشل إرسال الطلب'); }
      const { job_id } = await res.json();
      setJob({ jobId: job_id, status: 'queued', progress: 5, stage: 'تم استلام الطلب، جاري البدء...', error: null });
      startPolling(job_id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      setJob(prev => prev ? { ...prev, status: 'error', stage: msg, error: msg } : null);
    }
  }, [file, emails, meetingTitle, mode, startPolling]);

  const handleReset = useCallback(() => {
    stopPolling(); setFile(null); setEmails([]); setMeetingTitle(''); setMode('groq'); setJob(null); setResult(null);
  }, [stopPolling]);

  return (
    <main style={{ minHeight: '100vh', position: 'relative' }}>

      {/* ═══════════════════════════════════════════════
          Hero Section — Open Design
      ═══════════════════════════════════════════════ */}
      <section style={{ padding: '80px 20px 60px', textAlign: 'center', position: 'relative' }}>
        <div className="container animate-fade-in-up">


          <div className="shimmer-pill-wrapper">
            <h1
              className="text-display shimmer-pill-content"
              style={{
                display: 'inline-block',
                padding: '16px 48px',
                borderRadius: '100px',
                border: 'none',
                boxShadow: 'none',
                fontSize: 'clamp(24px, 4vw, 52px)',
                margin: '0',
                whiteSpace: 'nowrap',
                letterSpacing: '-1px'
              }}
            >
              Meetings management
            </h1>
          </div>

          <p className="text-body" style={{
            color: 'var(--deep-charcoal)', maxWidth: '560px',
            margin: '0 auto 40px',
          }}>
            ارفع التسجيل الصوتي واحصل على تفريغ نصي كامل، ملخص ذكي،
            وإرسال بريدي تلقائي
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#upload" className="btn-primary" style={{ minWidth: '180px' }}>ابدأ الآن ←</a>
          </div>
        </div>
      </section>



      {/* ═══════════════════════════════════════════════
          How It Works — Steps — Open Design
      ═══════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: '80px 20px', textAlign: 'center', position: 'relative' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px', maxWidth: '900px', margin: '0 auto' }}>
            {steps.map((s, i) => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: i === 1 ? '#e8e8e8' : 'var(--white)',
                  border: i === 1 ? 'none' : '1px solid var(--charcoal-trans)',
                  color: i === 1 ? 'var(--white)' : 'var(--deep-charcoal)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-primary)', fontSize: '22px', fontWeight: 700,
                  marginBottom: '24px',
                  boxShadow: i === 1 ? 'var(--shadow-btn-glow)' : 'var(--shadow-level-1)',
                }}>
                  {s.step}
                </div>
                <h3 className="text-h4" style={{ marginBottom: '12px' }}>{s.title}</h3>
                <p className="text-body">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          Upload/Registration Section — Open Design
      ═══════════════════════════════════════════════ */}
      <section id="upload" style={{ padding: '80px 20px', position: 'relative' }}>
        <div className="container" style={{ maxWidth: '1000px' }}>

          {!isProcessing && !result && (
            <div className="animate-fade-in-up">
              <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                <p className="text-body" style={{ marginTop: '16px' }}>
                  اختر طريقة إدخال الصوت، ثم حدد إعدادات المعالجة المناسبة لك
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* ── Unified Input Selection Banner ── */}
                <div className="card" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>


                  {/* Split Selection Area */}
                  <div style={{ display: 'flex', position: 'relative', padding: '0', flexDirection: 'row-reverse' }}>

                    {/* Right: File Upload */}
                    <div
                      onClick={() => !file && setInputType('upload')}
                      onKeyDown={(e) => {
                        if (!file && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setInputType('upload');
                        }
                      }}
                      role="button"
                      tabIndex={file ? -1 : 0}
                      aria-label="اختيار رفع ملف صوتي"
                      aria-pressed={inputType === 'upload'}
                      style={{
                        flex: 1, padding: '40px', cursor: file ? 'not-allowed' : 'pointer',
                        textAlign: 'center', transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: inputType === 'upload' ? 'var(--white)' : 'transparent',
                        position: 'relative',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        margin: '12px',
                        borderRadius: '16px',
                        boxShadow: inputType === 'upload' ? '0 0 0 2px #e8e8e8' : 'none',
                      }}
                    >

                      <div style={{
                        width: '56px', height: '56px', margin: '0 auto 16px', borderRadius: '8px',
                        background: inputType === 'upload' ? '#e8e8e8' : 'var(--white)',
                        color: inputType === 'upload' ? '#15140F' : 'var(--deep-charcoal)',
                        border: inputType === 'upload' ? 'none' : '1px solid rgba(255, 255, 255, 0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                        boxShadow: inputType === 'upload' ? '0 4px 14px 0 rgba(255, 255, 255, 0.1)' : 'var(--shadow-level-1)',
                        transition: 'all 0.3s ease'
                      }}>📁</div>
                      <h3 className="text-h4" style={{ margin: 0, color: inputType === 'upload' ? '#e8e8e8' : 'var(--deep-charcoal)' }}>رفع ملف</h3>
                      <p className="text-body" style={{ fontSize: '14px', marginTop: '8px' }}>ارفع ملفات صوتية جاهزة من جهازك</p>
                    </div>





                    {/* Left: Live Record */}
                    <div
                      onClick={() => !file && setInputType('record')}
                      onKeyDown={(e) => {
                        if (!file && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setInputType('record');
                        }
                      }}
                      role="button"
                      tabIndex={file ? -1 : 0}
                      aria-label="اختيار تسجيل مباشر"
                      aria-pressed={inputType === 'record'}
                      style={{
                        flex: 1, padding: '40px', cursor: file ? 'not-allowed' : 'pointer',
                        textAlign: 'center', transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: inputType === 'record' ? 'var(--white)' : 'transparent',
                        opacity: inputType === 'upload' ? 0.4 : 1,
                        position: 'relative',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        margin: '12px',
                        borderRadius: '16px',
                        boxShadow: inputType === 'record' ? '0 0 0 2px #e8e8e8' : 'none',
                      }}
                    >

                      <div style={{
                        width: '56px', height: '56px', margin: '0 auto 16px', borderRadius: '8px',
                        background: inputType === 'record' ? '#e8e8e8' : 'var(--white)',
                        color: inputType === 'record' ? '#15140F' : 'var(--deep-charcoal)',
                        border: inputType === 'record' ? 'none' : '1px solid rgba(255, 255, 255, 0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                        boxShadow: inputType === 'record' ? '0 4px 14px 0 rgba(255, 255, 255, 0.1)' : 'var(--shadow-level-1)',
                        transition: 'all 0.3s ease'
                      }}>🎙️</div>
                      <h3 className="text-h4" style={{ margin: 0, color: inputType === 'record' ? '#e8e8e8' : 'var(--deep-charcoal)' }}>تسجيل مباشر</h3>
                      <p className="text-body" style={{ fontSize: '14px', marginTop: '8px' }}>تحدث مباشرة باستخدام ميكروفون جهازك</p>
                    </div>

                  </div>

                  {/* Drawer Content */}
                  <div style={{
                    maxHeight: inputType ? '800px' : '0',
                    opacity: inputType ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.55s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease',
                    borderTop: inputType ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                    background: 'var(--white)',
                  }}>
                    <div style={{ padding: '32px' }}>
                      {inputType === 'upload' && (
                        <div className="animate-fade-in-up">
                          <FileUpload onFile={setFile} file={file} disabled={isProcessing} />
                        </div>
                      )}
                      {inputType === 'record' && (
                        <div className="animate-fade-in-up">
                          <AudioRecorder onFile={setFile} file={file} disabled={isProcessing} />
                        </div>
                      )}
                      {file && (
                        <div className="animate-fade-in" style={{ marginTop: '24px', textAlign: 'center' }}>
                          <button
                            onClick={async () => {
                              if (confirm('هل أنت متأكد من حذف الملف؟')) {
                                if (file.name.startsWith('recording-')) {
                                  try { await fetch(`${API_BASE}/api/delete-audio/${file.name}`, { method: 'DELETE' }); } catch (err) { }
                                }
                                setFile(null);
                                setInputType(null);
                              }
                            }}
                            disabled={isProcessing}
                            className="btn-tertiary"
                          >
                            🗑️ حذف الملف
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Banner 3: Settings ── */}
                <div className="card">
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label htmlFor="meeting-title-input" className="form-label">عنوان الاجتماع (اختياري)</label>
                      <input
                        id="meeting-title-input"
                        type="text" value={meetingTitle}
                        onChange={e => setMeetingTitle(e.target.value)}
                        disabled={isProcessing} className="form-input"
                        placeholder="مثال: اجتماع الفريق الأسبوعي"
                      />
                    </div>
                    <EmailInput emails={emails} onChange={setEmails} disabled={isProcessing} />
                    <ModeToggle mode={mode} onChange={setMode} disabled={isProcessing} />
                  </div>
                </div>

                {/* ── Action Banner ── */}
                <div style={{ textAlign: 'center', marginTop: '24px', padding: '0 20px' }}>
                  <button onClick={handleSubmit} disabled={!file || isProcessing}
                    className="btn-primary"
                    style={{ width: '100%', maxWidth: '480px', fontSize: '25px', fontWeight: 600, padding: '16px' }}
                  >
                    {isProcessing ? '⏳ جاري المعالجة...' : ' ابدأ ←'}
                  </button>
                  {!file && (
                    <p className="text-caption" style={{ textAlign: 'center', marginTop: '16px' }}>
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ── Progress ── */}
          {job && (job.status !== 'idle') && (
            <div style={{ marginBottom: '16px' }}>
              <ProgressBar progress={job.progress} stage={job.stage} status={job.status} />

              {job.status === 'error' && job.error && (
                <div style={{
                  padding: '24px', marginTop: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                  background: 'transparent',
                }}>
                  <p style={{ color: '#e8e8e8', fontWeight: 700, marginBottom: '8px', fontSize: '16px', fontFamily: 'var(--font-primary)' }}>
                    ❌ خطأ في المعالجة:
                  </p>
                  <p style={{ color: 'var(--deep-charcoal)', fontSize: '14px', fontFamily: 'var(--font-code)' }}>
                    {job.error}
                  </p>
                  <button onClick={handleReset} className="btn-secondary" style={{ marginTop: '16px' }}>
                    🔄 المحاولة مجدداً
                  </button>
                </div>
              )}

              {isProcessing && (
                <div style={{
                  textAlign: 'center', marginTop: '24px', padding: '16px',
                  background: 'var(--white)', borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: 'var(--shadow-level-1)'
                }}>
                  <p className="text-caption" style={{ fontSize: '13px' }}>
                    جاري المعالجة... يمكنك الانتظار هنا أو إبقاء الصفحة مفتوحة.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Results ── */}
          {result && (
            <>
              <ResultsViewer result={result} />
              <div style={{ textAlign: 'center', marginTop: '48px' }}>
                <button onClick={handleReset} className="btn-primary" style={{ minWidth: '200px' }}>
                  ← العودة للبداية
                </button>
              </div>
            </>
          )}

        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          Footer — Open Design
      ═══════════════════════════════════════════════ */}
      <footer style={{ background: 'var(--cream-light)', borderTop: '1px solid var(--charcoal-trans)', padding: '40px 20px', textAlign: 'center' }}>
        <div className="container">
          <p className="text-body" style={{ fontSize: '14px' }}>
            © {new Date().getFullYear()}  — جميع الحقوق محفوظة
          </p>
          <p className="text-caption" style={{ marginTop: '8px' }}>
            • Whisper • Groq • Next.js
          </p>
        </div>
      </footer>
    </main>
  );
}
