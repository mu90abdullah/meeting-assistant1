'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onFile, disabled }: AudioRecorderProps) {
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
        const file = new File([blob], `recording-${new Date().toISOString().replace(/:/g, '-')}.webm`, { type: 'audio/webm' });

        // Save the audio to the backend immediately
        try {
          const formData = new FormData();
          formData.append('audio', file);
          await fetch('http://localhost:8000/api/save-audio', {
            method: 'POST',
            body: formData,
          });
        } catch (err) {
          console.error('Error saving audio automatically:', err);
        }

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
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      background: 'var(--bg-input)',
      borderRadius: '12px',
      border: '2px dashed var(--border-default)',
      transition: 'all 0.2s ease',
    }}>
      <button
        onClick={isRecording ? handleStop : handleStart}
        disabled={disabled && !isRecording}
        className={isRecording ? "animate-pulse-glow" : ""}
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: isRecording ? 'rgba(239, 68, 68, 0.12)' : '#fff',
          border: `2px solid ${isRecording ? '#ef4444' : 'rgba(239, 68, 68, 0.5)'}`,
          color: '#ef4444',
          cursor: disabled && !isRecording ? 'not-allowed' : 'pointer',
          opacity: disabled && !isRecording ? 0.55 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isRecording
            ? 'inset 0 4px 12px rgba(0,0,0,0.15), 0 0 12px rgba(239,68,68,0.2)'
            : '0 4px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
          transform: isRecording ? 'scale(0.92) translateY(4px)' : 'scale(1) translateY(0)',
          outline: 'none',
        }}
        title={isRecording ? "إيقاف التسجيل" : "بدء التسجيل"}
      >
        {isRecording ? (
          <div style={{ width: '22px', height: '22px', backgroundColor: '#ef4444', borderRadius: '4px' }} />
        ) : (
          "🎙️"
        )}
      </button>

      <div style={{ textAlign: 'center', marginTop: '16px', minHeight: '44px' }}>
        {isRecording ? (
          <>
            <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '20px', fontFamily: 'monospace', letterSpacing: '1px' }}>
              {formatTime(duration)}
            </p>
            <p className="animate-fade-in" style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px' }}>
              جاري التسجيل... انقر على المربع للإيقاف
            </p>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
            تسجيل مباشر
          </p>
        )}
      </div>
    </div>
  );
}
