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
      <label style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, marginBottom: '12px', display: 'block' }}>
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`glass-card ${dragActive ? 'drag-active' : ''}`}
        style={{
          padding: '36px 24px',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.55 : 1,
          borderStyle: dragActive ? 'solid' : 'dashed',
          borderWidth: '2px',
          borderColor: dragActive ? 'var(--border-active)' : 'var(--border-default)',
          background: dragActive ? 'rgba(16,163,127,0.04)' : 'var(--bg-input)',
          boxShadow: 'none',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
        }}
      >


        <input
          type="file"
          accept={ALLOWED.join(',')}
          onChange={handleChange}
          disabled={disabled}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />

        {file ? (
          <div className="animate-fade-in">
            <div style={{
              width: 48, height: 48, borderRadius: '12px', margin: '0 auto 16px',
              background: 'var(--accent-teal-dim)',
              border: '1px solid var(--accent-orange-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>✅</div>
            <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '5px', color: 'var(--text-primary)' }}>
              {file.name}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {formatSize(file.size)} — انقر لاستبدال الملف
            </p>
          </div>
        ) : (
          <div>
            <div style={{
              width: 48, height: 48, borderRadius: '12px', margin: '0 auto 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
              color: 'var(--text-muted)',
            }}>
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p style={{ fontWeight: 500, fontSize: '15px', marginBottom: '6px', color: 'var(--text-primary)' }}>
              اسحب وأفلت الملف الصوتي هنا
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              أو انقر للاختيار من جهازك
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
              {ALLOWED.map(ext => (
                <span key={ext} style={{
                  padding: '2px 8px', borderRadius: '4px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace',
                }}>
                  {ext}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p style={{ color: 'var(--accent-red)', fontSize: '13px', marginTop: '8px' }}>⚠️ {error}</p>
      )}
    </div>
  );
}
