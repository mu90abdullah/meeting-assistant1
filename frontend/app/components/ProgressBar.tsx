'use client';

interface ProgressBarProps {
  progress: number;
  stage: string;
  status: 'queued' | 'running' | 'done' | 'error';
}

const STAGES = [
  { label: 'الرفع', threshold: 10 },
  { label: 'التفريغ النصي', threshold: 55 },
  { label: 'التحليل', threshold: 80 },
  { label: 'الإرسال', threshold: 90 },
  { label: 'مكتمل', threshold: 100 },
];

export default function ProgressBar({ progress, stage, status }: ProgressBarProps) {
  const isError = status === 'error';
  const isDone = status === 'done';

  const barBg = isError
    ? 'linear-gradient(90deg, #E05252, #C43E3E)'
    : isDone
      ? 'linear-gradient(90deg, #3DAA7A, #2E8A62)'
      : undefined; // handled by .progress-bar-fill class

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: '28px' }}>

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

          {/* Status icon */}
          {status === 'running' && (
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              border: '2px solid rgba(249,115,22,0.2)',
              borderTopColor: 'var(--accent-orange)',
            }} className="animate-spin-slow" />
          )}
          {isDone && <span style={{ fontSize: '22px' }}>✅</span>}
          {isError && <span style={{ fontSize: '22px' }}>❌</span>}
          {status === 'queued' && (
            <div style={{
              width: '24px', height: '24px', borderRadius: '8px',
              background: 'rgba(212,144,26,0.13)',
              border: '1px solid rgba(212,144,26,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px',
            }}>⏳</div>
          )}

          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px', color: 'var(--text-primary)' }}>
              {isError ? 'فشلت العملية' : isDone ? 'اكتملت العملية بنجاح!' : 'جاري المعالجة...'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stage}</p>
          </div>
        </div>

        {/* Percentage */}
        <div style={{
          fontSize: '26px', fontWeight: 800, fontFamily: 'monospace',
          color: isError ? 'var(--accent-red)' : isDone ? 'var(--accent-green)' : 'var(--accent-orange)',
        }}>
          {progress}%
        </div>
      </div>

      {/* Track */}
      <div style={{
        height: '8px', borderRadius: '100px',
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden', marginBottom: '22px',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div
          className={isDone || isError ? '' : 'progress-bar-fill'}
          style={{
            height: '100%',
            width: `${progress}%`,
            borderRadius: '100px',
            backgroundImage: barBg,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>

      {/* Milestone dots */}
      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '7px', left: '8px', right: '8px', height: '1px',
          background: 'rgba(130,160,148,0.08)', zIndex: 0,
        }} />

        {STAGES.map((s, i) => {
          const isReached = progress >= s.threshold;
          const isCurrent = progress < s.threshold && (i === 0 || progress >= STAGES[i - 1].threshold);
          return (
            <div key={s.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '5px', position: 'relative', zIndex: 1,
            }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '50%',
                background: isReached
                  ? (isDone ? 'var(--accent-green)' : isError ? 'var(--accent-red)' : 'var(--accent-orange)')
                  : 'rgba(130,160,148,0.1)',
                border: isCurrent ? '2px solid var(--accent-orange)' : '1px solid rgba(130,160,148,0.15)',
                boxShadow: isCurrent ? '0 0 10px rgba(249,115,22,0.4)'
                  : isReached ? '0 0 8px rgba(249,115,22,0.2)' : 'none',
                transition: 'all 0.35s ease',
              }} />
              <span style={{
                fontSize: '9px', fontWeight: 600, letterSpacing: '0.04em',
                color: isReached ? 'var(--text-secondary)' : 'var(--text-muted)',
                whiteSpace: 'nowrap', transition: 'color 0.35s ease',
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
