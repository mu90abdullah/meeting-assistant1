'use client';

interface ModeToggleProps {
  mode: 'local' | 'groq';
  onChange: (mode: 'local' | 'groq') => void;
  disabled?: boolean;
}

const MODES = [
  {
    id: 'local' as const,
    icon: '🖥️',
    title: 'Local Mode',
    description: 'معالجة محلية لخصوصية أعلى',
    badge: 'High Privacy',
    badgeBg: 'var(--bg-secondary)',
    badgeBorder: 'var(--border-default)',
    badgeColor: 'var(--text-secondary)',
    borderActive: 'var(--border-active)',
    bgActive: 'var(--bg-secondary)',
  },
  {
    id: 'groq' as const,
    icon: '⚡',
    title: 'Fast by Groq',
    description: 'معالجة سحابية فائقة السرعة',
    badge: 'Fast',
    badgeBg: 'var(--bg-secondary)',
    badgeBorder: 'var(--border-default)',
    badgeColor: 'var(--text-secondary)',
    borderActive: 'var(--border-active)',
    bgActive: 'var(--bg-secondary)',
  },
];

export default function ModeToggle({ mode, onChange, disabled }: ModeToggleProps) {
  return (
    <div>
      <label className="block" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, marginBottom: '12px', display: 'block' }}>
        وضع المعالجة
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <div
              key={m.id}
              onClick={() => !disabled && onChange(m.id)}
              className="glass-card"
              style={{
                padding: '16px', borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                border: `1.5px solid ${isActive ? m.borderActive : 'var(--border-default)'}`,
                background: isActive ? 'rgba(16,163,127,0.05)' : 'var(--bg-input)',
                boxShadow: isActive ? '0 0 0 1px var(--border-active)' : '0 1px 3px rgba(0,0,0,0.06)',
                userSelect: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '26px', lineHeight: 1 }}>{m.icon}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    padding: '2px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                    background: m.badgeBg, border: `1px solid ${m.badgeBorder}`, color: m.badgeColor,
                    letterSpacing: '0.04em',
                  }}>
                    {m.badge}
                  </span>
                  {/* Radio indicator */}
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: `2px solid ${isActive ? 'var(--accent-teal)' : 'var(--border-default)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.15s ease',
                    flexShrink: 0,
                  }}>
                    {isActive && (
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: 'var(--accent-teal)',
                      }} />
                    )}
                  </div>
                </div>
              </div>

              <h3 style={{
                fontSize: '15px', fontWeight: 600, marginBottom: '6px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>
                {m.title}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {m.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
