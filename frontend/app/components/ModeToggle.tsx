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

    badge: 'Private',
  },
  {
    id: 'groq' as const,
    icon: '⚡',
    title: 'Fast by Groq',

    badge: 'Fast',
  },
];

export default function ModeToggle({ mode, onChange, disabled }: ModeToggleProps) {
  return (
    <div>
      <label className="form-label">وضع المعالجة</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {MODES.map((m) => {
          const isActive = mode === m.id;
          return (
            <div
              key={m.id}
              onClick={() => !disabled && onChange(m.id)}
              style={{
                padding: '18px',
                borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.55 : 1,
                border: `1px solid rgba(255, 255, 255, 0.3)`,
                background: isActive ? 'rgba(232, 232, 232, 0.05)' : 'var(--white)',
                boxShadow: isActive
                  ? '#e8e8e8 0px 0px 0px 1px inset'
                  : 'var(--shadow-level-1)',
                userSelect: 'none' as const,
                transition: 'all 0.2s ease',
              }}
            >
              {/* Header row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '14px',
              }}>
                {/* Icon */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'var(--white)',
                  border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
                  boxShadow: 'var(--shadow-level-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {m.icon}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={isActive ? 'badge badge-accent' : 'badge'}>
                    {m.badge}
                  </span>

                  {/* Radio indicator */}
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: `1px solid rgba(255, 255, 255, 0.3)`,
                    background: 'var(--white)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'border-color 0.15s ease',
                    flexShrink: 0,
                  }}>
                    {isActive && (
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#e8e8e8',
                      }} />
                    )}
                  </div>
                </div>
              </div>

              <h3 className="text-h4" style={{ marginBottom: '6px', color: isActive ? '#e8e8e8' : 'var(--deep-charcoal)' }}>
                {m.title}
              </h3>
              <p className="text-body" style={{ fontSize: '13px' }}>
                {m.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
