'use client';

interface ProgressBarProps {
  progress: number;
  stage: string;
  status: 'queued' | 'running' | 'done' | 'error';
}

const STAGES = [
  { label: 'الرفع', threshold: 10 },
  { label: 'التفريغ', threshold: 55 },
  { label: 'التحليل', threshold: 80 },
  { label: 'الإرسال', threshold: 90 },
  { label: 'مكتمل', threshold: 100 },
];

export default function ProgressBar({ progress, stage, status }: ProgressBarProps) {
  const isError = status === 'error';
  const isDone = status === 'done';

  const barColor = isError
    ? 'linear-gradient(90deg, #FF0000, #CC0000)'
    : '#e8e8e8';

  const accentColor = isError ? 'var(--red-alert)' : '#e8e8e8';

  return (
    <div className="card animate-fade-in-up" style={{ padding: '32px 40px' }}>


      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {status === 'running' && (
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2.5px solid rgba(255, 255, 255, 0.1)', borderTopColor: '#e8e8e8',
            }} className="animate-spin-slow" />
          )}

          {isError && (
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'rgba(255, 0, 0, 0.1)', border: '1px solid rgba(255, 0, 0, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }}>❌</div>
          )}
          {status === 'queued' && (
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'rgba(176, 155, 141, 0.15)', border: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }}>⏳</div>
          )}
          <div>
            <h3 className="text-h4" style={{ marginBottom: '3px' }}>
              {isError ? 'فشلت العملية' : isDone ? 'اكتملت العملية بنجاح ' : 'جاري المعالجة...'}
            </h3>
            <p className="text-body" style={{ fontSize: '13px' }}>{stage}</p>
          </div>
        </div>

        <div style={{
          minWidth: '64px', height: '36px', borderRadius: '20px',
          background: isError ? 'rgba(255, 0, 0, 0.08)' : isDone ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.2)',
          border: `1px solid ${isError ? 'rgba(255, 0, 0, 0.2)' : isDone ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.5)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', fontWeight: 600, color: accentColor,
          fontFamily: 'var(--font-code)', padding: '0 14px',
        }}>
          {progress}%
        </div>
      </div>

      <div style={{
        height: '6px', borderRadius: '980px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden', marginBottom: '24px',
      }}>
        <div className={isDone || isError ? '' : 'progress-bar-fill'} style={{
          height: '100%', width: `${progress}%`, borderRadius: '980px',
          background: barColor, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', height: '1px', background: 'var(--charcoal-trans)', zIndex: 0 }} />
        {STAGES.map((s, i) => {
          const isReached = progress >= s.threshold;
          const isCurrent = progress < s.threshold && (i === 0 || progress >= STAGES[i - 1].threshold);
          return (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: isReached ? (isError ? '#dc2626' : '#e8e8e8') : 'transparent',
                border: isCurrent ? '2px solid #e8e8e8' : `1px solid ${isReached ? 'transparent' : 'rgba(255, 255, 255, 0.2)'}`,
                boxShadow: isCurrent ? '0 0 0 3px rgba(255, 255, 255, 0.1)' : 'none',
                transition: 'all 0.35s ease',
              }} />
              <span className="text-caption" style={{
                color: isReached ? 'var(--deep-charcoal)' : 'var(--warm-taupe)', whiteSpace: 'nowrap', opacity: 1,
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
