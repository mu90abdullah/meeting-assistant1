'use client';

import { useCallback, useState } from 'react';

interface FileUploadProps {
  onFile: (file: File) => void;
  file: File | null;
  disabled?: boolean;
}

const ALLOWED = ['.mp3', '.wav', '.m4a', '.mp4', '.flac', '.ogg', '.webm', '.mkv'];
const MAX_SIZE_MB = 500;

export default function FileUpload({ onFile, file, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const validate = useCallback((f: File): boolean => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setError(`نوع الملف غير مدعوم. الأنواع المدعومة: ${ALLOWED.join(', ')}`);
      return false;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`حجم الملف يتجاوز الحد الأقصى (${MAX_SIZE_MB} MB)`);
      return false;
    }
    setError('');
    return true;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f && validate(f)) onFile(f);
  }, [disabled, onFile, validate]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && validate(f)) onFile(f);
  }, [onFile, validate]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <label htmlFor="audio-file-upload" className="form-label">الملف الصوتي</label>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            (document.getElementById('audio-file-upload') as HTMLInputElement)?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          borderWidth: dragActive ? '2px' : '1px',
          borderColor: dragActive ? '#e8e8e8' : file ? 'rgba(52, 199, 89, 0.5)' : 'rgba(255, 255, 255, 0.35)',
          borderStyle: dragActive ? 'solid' : 'dashed',
          borderRadius: '8px',
          background: dragActive ? 'rgba(255, 255, 255, 0.05)' : file ? 'rgba(52, 199, 89, 0.05)' : 'var(--white)',
          position: 'relative',
          overflow: 'hidden',
          color: 'var(--deep-charcoal)',
          boxShadow: dragActive ? '#e8e8e8 0px 0px 0px 2px' : 'var(--shadow-level-1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <input
          id="audio-file-upload"
          type="file"
          accept={ALLOWED.join(',')}
          onChange={handleChange}
          disabled={disabled}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />

        {file ? (
          <div className="animate-fade-in">

            <p className="text-h4" style={{ marginBottom: '6px' }}>
              {file.name}
            </p>
            <p className="text-body" style={{ fontSize: '14px' }}>
              {formatSize(file.size)} — انقر لاستبدال الملف
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: '8px', margin: '0 auto 20px',
              background: 'rgba(50, 121, 249, 0.06)',
              border: '1px solid rgba(50, 121, 249, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--primary-color)',
            }}>
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"
                strokeLinecap="round" strokeLinejoin="round" height="26" width="26"
                xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p className="text-h4" style={{ marginBottom: '8px' }}>
              اسحب وأفلت الملف الصوتي هنا
            </p>
            <p className="text-body" style={{ fontSize: '14px', marginBottom: '20px' }}>
              أو انقر للاختيار من جهازك
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {ALLOWED.map(ext => (
                <span key={ext} className="badge">
                  {ext}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: '#e8e8e8', fontSize: '13px', marginTop: '10px',
          padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(255, 0, 0, 0.06)',
          border: '1px solid rgba(255, 0, 0, 0.2)',
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
