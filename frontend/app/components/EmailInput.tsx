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
      <label className="form-label">
        المستلمون (اختياري)
        {emails.length > 0 && (
          <span className="badge badge-accent" style={{ marginRight: '8px' }}>
            {emails.length}
          </span>
        )}
      </label>

      <div
        style={{
          padding: '8px 12px',
          display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'center',
          minHeight: '48px',
          cursor: 'text',
          opacity: disabled ? 0.55 : 1,
          transition: 'all 0.2s ease',
          background: 'var(--white)',
          borderRadius: '8px',
          border: `1px solid ${isFocused ? '#e8e8e8' : 'rgba(255, 255, 255, 0.35)'}`,
          boxShadow: isFocused ? '#e8e8e8 0px 0px 0px 2px' : 'var(--shadow-level-1)',
        }}
        onClick={() => (document.getElementById('email-input') as HTMLInputElement)?.focus()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (document.getElementById('email-input') as HTMLInputElement)?.focus();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="إدخال البريد الإلكتروني للمستلمين"
      >
        {emails.map((email, i) => (
          <span
            key={email}
            className="badge animate-fade-in"
            style={{ fontSize: '12px', border: '1px solid var(--charcoal-trans)' }}
          >
            {email}
            {!disabled && (
              <button
                onClick={(e) => { e.stopPropagation(); removeEmail(i); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#e8e8e8', fontSize: '16px', lineHeight: 1,
                  padding: 0, display: 'flex', alignItems: 'center', marginLeft: '4px',
                  fontWeight: 600,
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
          placeholder={emails.length === 0 ? ' ادخل البريد الإلكتروني واضغط Enter' : ''}
          style={{
            background: 'none', border: 'none', outline: 'none',
            color: 'var(--deep-charcoal)', fontSize: '16px',
            flex: 1, minWidth: '200px', direction: 'rtl',
            textAlign: 'right',
            fontFamily: 'var(--font-secondary)',
          }}
        />
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: '#e8e8e8', fontSize: '13px', marginTop: '8px',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(255, 0, 0, 0.05)',
          border: '1px solid rgba(255, 0, 0, 0.2)',
        }}>
          ⚠️ {error}
        </div>
      )}

      <p className="text-caption" style={{ marginTop: '6px' }}>
      </p>
    </div>
  );
}
