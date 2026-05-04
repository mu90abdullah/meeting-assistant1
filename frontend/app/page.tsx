'use client';

import { useState, useCallback, useRef } from 'react';
import FileUpload from './components/FileUpload';
import AudioRecorder from './components/AudioRecorder';
import EmailInput from './components/EmailInput';
import ModeToggle from './components/ModeToggle';
import ProgressBar from './components/ProgressBar';
import ResultsViewer from './components/ResultsViewer';

const API_BASE = 'http://localhost:8000';
const POLL_INTERVAL_MS = 1500;

type JobStatus = 'idle' | 'queued' | 'running' | 'done' | 'error';

interface JobState {
  jobId: string;
  status: JobStatus;
  progress: number;
  stage: string;
  error: string | null;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [mode, setMode] = useState<'local' | 'groq'>('groq');
  const [job, setJob] = useState<JobState | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isProcessing = job?.status === 'queued' || job?.status === 'running';

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchResult = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/result/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      console.error('Failed to fetch result', e);
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();

        setJob(prev => prev ? {
          ...prev,
          status: data.status,
          progress: data.progress,
          stage: data.stage,
          error: data.error ?? null,
        } : null);

        if (data.status === 'done') {
          stopPolling();
          await fetchResult(jobId);
        } else if (data.status === 'error') {
          stopPolling();
        }
      } catch (e) {
        console.error('Polling error', e);
      }
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

      const res = await fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'فشل إرسال الطلب');
      }

      const { job_id } = await res.json();
      setJob({ jobId: job_id, status: 'queued', progress: 5, stage: 'تم استلام الطلب، جاري البدء...', error: null });
      startPolling(job_id);

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع';
      setJob(prev => prev ? { ...prev, status: 'error', stage: msg, error: msg } : null);
    }
  }, [file, emails, meetingTitle, mode, startPolling]);

  const handleReset = useCallback(() => {
    stopPolling();
    setFile(null);
    setEmails([]);
    setMeetingTitle('');
    setMode('groq');
    setJob(null);
    setResult(null);
  }, [stopPolling]);

  return (
    <main style={{ minHeight: '100vh', padding: '32px 20px 80px', maxWidth: '900px', margin: '0 auto' }}>

      {/* ── Hero Banner ── */}
      <div className="animate-fade-in-up" style={{ marginBottom: '48px' }}>
        <div style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0d3d2e 0%, #0f5540 40%, #10a37f 100%)',
          boxShadow: '0 8px 32px rgba(16, 163, 127, 0.25), 0 2px 8px rgba(0,0,0,0.12)',
          padding: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: '220px', height: '220px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: '-80px', left: '-40px',
            width: '280px', height: '280px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Logo only — centered */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              width: '160px', height: '160px', borderRadius: '28px',
              background: 'rgba(255,255,255,0.96)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '18px',
            }}>
              <img
                src="/logo.png"
                alt="Meeting Assistant Logo"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  filter: 'contrast(1.1)',
                }}
              />
            </div>
            {/* Glow ring */}
            <div style={{
              position: 'absolute', inset: '-7px', borderRadius: '35px',
              border: '2px solid rgba(255,255,255,0.22)',
              pointerEvents: 'none',
            }} />
          </div>
        </div>
      </div>

      {/* ── Input Form ── */}
      {!isProcessing && !result && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="glass-card" style={{
            padding: '32px 36px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 8px 24px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.1)',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              <span style={{
                width: '28px', height: '28px', borderRadius: '8px', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                background: 'var(--accent-orange)', color: '#fff',
              }}>1</span>
              إعداد الاجتماع
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* File upload or Recording */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <FileUpload onFile={setFile} file={file} disabled={isProcessing} />
                {!file && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>أو</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }}></div>
                    </div>
                    <AudioRecorder onFile={setFile} disabled={isProcessing} />
                  </>
                )}
                {file && (
                  <div className="animate-fade-in" style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button
                      onClick={async () => {
                        if (confirm('هل أنت متأكد من أنك تريد حذف الملف المرفوع/المسجل؟')) {
                          if (file && file.name.startsWith('recording-')) {
                            try {
                              await fetch(`${API_BASE}/api/delete-audio/${file.name}`, { method: 'DELETE' });
                            } catch (err) {
                              console.error('Failed to delete auto-saved recording', err);
                            }
                          }
                          setFile(null);
                        }
                      }}
                      disabled={isProcessing}
                      style={{
                        padding: '10px 20px', borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
                        cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                        display: 'inline-flex', alignItems: 'center', gap: '8px'
                      }}
                      onMouseOver={(e) => { if (!isProcessing) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                      onMouseOut={(e) => { if (!isProcessing) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                    >
                      🗑️ حذف
                    </button>
                  </div>
                )}
              </div>

              {/* Optional title */}
              <div>
                <label className="block mb-3" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
                  عنوان الاجتماع (اختياري)
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                  disabled={isProcessing}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '8px',
                    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)', fontSize: '15px', outline: 'none',
                    fontFamily: 'inherit', direction: 'rtl', transition: 'all 0.2s ease',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--border-active)'; e.target.style.boxShadow = '0 0 0 1px var(--border-active)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Email input */}
              <EmailInput emails={emails} onChange={setEmails} disabled={isProcessing} />

              {/* Mode toggle */}
              <ModeToggle mode={mode} onChange={setMode} disabled={isProcessing} />

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!file || isProcessing}
                className="btn-gradient"
                style={{
                  width: '100%', padding: '16px', borderRadius: '8px',
                  fontSize: '16px', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: '8px',
                }}
              >
                <span style={{ fontSize: '20px' }}></span>
                Start
              </button>

              {!file && (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '-12px' }}>
                  يرجى رفع التسجيل الصوتي أولاً
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Progress ── */}
      {job && (job.status !== 'idle') && (
        <div style={{ marginBottom: '16px' }}>
          <ProgressBar
            progress={job.progress}
            stage={job.stage}
            status={job.status === 'idle' ? 'queued' : job.status}
          />

          {/* Error details */}
          {job.status === 'error' && job.error && (
            <div className="glass-card" style={{
              padding: '20px', marginTop: '12px',
              border: '1px solid var(--accent-orange-dim)',
              background: 'var(--accent-orange-dim)',
            }}>
              <p style={{ color: 'var(--accent-red)', fontWeight: 700, marginBottom: '8px' }}>خطأ في المعالجة:</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'monospace' }}>{job.error}</p>
              <button
                onClick={handleReset}
                style={{
                  marginTop: '16px', padding: '10px 20px', borderRadius: '10px',
                  background: 'var(--accent-orange-dim)', border: '1px solid var(--accent-orange-border)',
                  color: 'var(--accent-orange)', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit',
                }}
              >
                🔄 المحاولة مجدداً
              </button>
            </div>
          )}

          {/* Processing info */}
          {isProcessing && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                ☕ جاري المعالجة... يمكنك الانتظار هنا أو إبقاء الصفحة مفتوحة.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <>
          <ResultsViewer result={result} />
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              onClick={handleReset}
              className="btn-gradient"
              style={{
                padding: '14px 36px', borderRadius: '14px',
                fontSize: '15px', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <span></span> Go Back
            </button>
          </div>
        </>
      )}

    </main>
  );
}
