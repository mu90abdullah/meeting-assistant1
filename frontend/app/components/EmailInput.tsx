'use client';

import { useState, useCallback, KeyboardEvent } from 'react';

interface EmailInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function EmailInput({ emails, onChange, disabled }: EmailInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const addEmail = useCallback((raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      setError(`"${email}" ليس بريداً إلكترونياً صحيحاً`);
      return;
    }
    if (emails.includes(email)) {
      setError('هذا البريد الإلكتروني مضاف مسبقاً');
      return;
    }
    setError('');
    onChange([...emails, email]);
    setInput('');
  }, [emails, onChange]);

  const removeEmail = useCallback((index: number) => {
    onChange(emails.filter((_, i) => i !== index));
  }, [emails, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addEmail(input);
    } else if (e.key === 'Backspace' && !input && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  }, [input, emails, addEmail, removeEmail]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const parts = text.split(/[\n,;]+/);
    const newEmails = parts
      .map(p => p.trim().toLowerCase())
      .filter(p => isValidEmail(p) && !emails.includes(p));
    if (newEmails.length) {
      setError('');
      onChange([...emails, ...newEmails]);
    }
  }, [emails, onChange]);

  return (
    <div>
      <label style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, marginBottom: '12px', display: 'block' }}>
        المستلمون (اختياري)
      </label>
      <div
        className="glass-card"
        style={{
          padding: '8px 12px',
          display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'center',
          minHeight: '48px',
          cursor: 'text',
          opacity: disabled ? 0.55 : 1,
          transition: 'all 0.2s ease',
          background: 'var(--bg-input)',
          borderRadius: '8px',
          border: `1px solid ${isFocused ? 'var(--border-active)' : 'var(--border-default)'}`,
          boxShadow: isFocused ? '0 0 0 1px var(--border-active)' : 'none',
        }}
        onClick={() => (document.getElementById('email-input') as HTMLInputElement)?.focus()}
      >
        {emails.map((email, i) => (
          <span key={email} className="tag animate-fade-in" style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '6px'
          }}>
            {email}
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); removeEmail(i); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1,
                  padding: 0, display: 'flex', alignItems: 'center', marginLeft: '4px'
                }}
                title="حذف"
              >×</button>
            )}
          </span>
        ))}
        <input
          id="email-input"
          type="email"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => { setIsFocused(false); addEmail(input); }}
          disabled={disabled}
          placeholder={emails.length === 0 ? '' : ''}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: '15px',
            flex: 1, minWidth: '200px', direction: 'ltr',
            fontFamily: 'inherit',
          }}
        />
      </div>
      {error && (
        <p style={{ color: 'var(--accent-red)', fontSize: '13px', marginTop: '7px' }}>⚠️ {error}</p>
      )}
      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '7px' }}>

      </p>
    </div>
  );
}
