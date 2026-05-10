'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onFile: (file: File) => void;
  file?: File | null;
  disabled?: boolean;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function AudioRecorder({ onFile, file, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File(
          [blob],
          `recording-${new Date().toISOString().replaceAll(':', '-')}.webm`,
          { type: 'audio/webm' }
        );

        onFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('تعذر الوصول إلى الميكروفون. يرجى التحقق من الأذونات وإعطاء صلاحية الميكروفون للمتصفح.');
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: file ? 'rgba(52, 199, 89, 0.05)' : 'var(--white)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '40px 24px',
        borderWidth: '1px',
        borderColor: file ? 'rgba(52, 199, 89, 0.5)' : 'rgba(255, 255, 255, 0.35)',
        borderStyle: 'dashed',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-level-1)',
      }}
    >
      {/* Record button */}
      <button
        onClick={isRecording ? handleStop : handleStart}
        disabled={disabled && !isRecording}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: isRecording ? 'rgba(255, 255, 255, 0.08)' : 'var(--white)',
          border: `2px solid ${isRecording ? 'rgba(255, 255, 255, 0.3)' : '#e8e8e8'}`,
          color: isRecording ? '#ff3b30' : '#e8e8e8',
          cursor: disabled && !isRecording ? 'not-allowed' : 'pointer',
          opacity: disabled && !isRecording ? 0.55 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isRecording
            ? '0 0 0 6px rgba(255, 255, 255, 0.12), var(--shadow-level-1)'
            : 'var(--shadow-level-1)',
          transform: isRecording ? 'scale(0.95)' : 'scale(1)',
          outline: 'none',
        }}
        title={isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </button>

      {/* Status text */}
      <div style={{ textAlign: 'center', marginTop: '20px', minHeight: '52px' }}>
        {isRecording ? (
          <>
            <p style={{
              color: '#ff3b30',
              fontWeight: 600,
              fontSize: '24px',
              fontFamily: 'var(--font-code)',
              letterSpacing: '2px',
            }}>
              {formatTime(duration)}
            </p>
            <p className="animate-fade-in" style={{
              color: 'var(--taupe-secondary)',
              fontSize: '12px',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'var(--red-alert)',
                display: 'inline-block',
                animation: 'pulse-dot 1.2s ease-in-out infinite',
              }} />{' '}
              جاري التسجيل...  اضغط لايقاف التسجيل
            </p>
          </>
        ) : file ? (
          <div className="animate-fade-in">

            <p className="text-h4" style={{ marginBottom: '6px' }}>
              {file.name}
            </p>
            <p className="text-body" style={{ fontSize: '14px' }}>
              {formatSize(file.size)} — تم التسجيل بنجاح
            </p>
          </div>
        ) : (
          <>
            <p className="text-h4" style={{ marginBottom: '4px' }}>
              تسجيل مباشر
            </p>
            <p className="text-body" style={{ fontSize: '13px' }}>
              انقر لبدء التسجيل من الميكروفون
            </p>
          </>
        )}
      </div>
    </div>
  );
}
