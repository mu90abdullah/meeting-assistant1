'use client';

import { useState } from 'react';

interface ActionItem { task: string; assignee: string | null; deadline: string | null; priority: string | null; }
interface Decision { description: string; made_by: string | null; rationale: string | null; }

interface ResultData {
  transcript: string; language: string; duration_seconds: number | null;
  meeting_title: string; summary: string; key_topics: string[];
  action_items: ActionItem[]; decisions: Decision[];
  participants_mentioned: string[]; sentiment: string | null;
  next_meeting_date: string | null; email_sent: boolean;
  email_error: string | null; email_recipients: string[];
}

interface ResultsViewerProps { result: ResultData; }
type Tab = 'summary' | 'transcript' | 'actions' | 'decisions';

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  high: { bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.3)', text: '#e8e8e8', label: 'عالية' },
  medium: { bg: 'rgba(233, 185, 74, 0.1)', border: 'var(--warm-gold)', text: 'var(--warm-gold)', label: 'متوسطة' },
  low: { bg: 'rgba(139, 134, 118, 0.1)', border: 'var(--warm-taupe)', text: 'var(--warm-taupe)', label: 'منخفضة' },
};

export default function ResultsViewer({ result }: ResultsViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [copied, setCopied] = useState(false);

  const tabs: { id: Tab; label: string; count?: number; icon: string }[] = [
    { id: 'summary', label: 'الملخص', icon: '' },
    { id: 'actions', label: 'المهام', icon: '', count: result.action_items.length },
    { id: 'decisions', label: 'القرارات', icon: '', count: result.decisions.length },
    { id: 'transcript', label: 'النص الكامل', icon: '' },
  ];

  const copyTranscript = async () => {
    await navigator.clipboard.writeText(result.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in-up">

      {/* ── Success Header Card ── */}
      <div className="card" style={{
        padding: 0, overflow: 'hidden', marginBottom: '24px',
      }}>


        <div style={{ padding: '32px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>

                <h2 className="text-h3" style={{ margin: 0 }}>
                  {result.meeting_title || 'اجتماع بدون عنوان'}
                </h2>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span className="badge">{result.language} </span>
                {result.duration_seconds && (
                  <span className="badge"> {Math.floor(result.duration_seconds / 60)}د {Math.round(result.duration_seconds % 60)}ث</span>
                )}
                {result.next_meeting_date && (
                  <span className="badge">📅 القادم: {result.next_meeting_date}</span>
                )}
              </div>
            </div>

            {result.email_recipients.length > 0 && (
              <div>
                {result.email_sent
                  ? <span className="badge badge-accent">✉️ أُرسل ({result.email_recipients.length})</span>
                  : <span className="badge" style={{ color: '#e8e8e8' }}>✗ فشل الإرسال</span>
                }
              </div>
            )}
          </div>

          {result.key_topics.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--charcoal-trans)' }}>
              <p className="form-label">
                المحاور الرئيسية
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.key_topics.map((topic, i) => (
                  <span key={i} className="badge">{topic}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px',
        background: 'var(--white)', borderRadius: '999px',
        padding: '6px', border: '1px solid var(--charcoal-trans)',
        boxShadow: 'var(--shadow-level-1)'
      }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '10px 16px', borderRadius: '999px', cursor: 'pointer',
            fontFamily: 'var(--font-primary)', fontSize: '14px',
            fontWeight: activeTab === tab.id ? 600 : 500, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'all 0.15s ease',
            background: activeTab === tab.id ? '#e8e8e8' : 'transparent',
            color: activeTab === tab.id ? '#15140F' : 'var(--deep-charcoal)',
            border: 'none', boxShadow: activeTab === tab.id ? '0 4px 14px 0 rgba(255, 255, 255, 0.1)' : 'none',
          }}>
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                background: activeTab === tab.id ? 'rgba(0,0,0,0.1)' : 'var(--cream)',
                borderRadius: '20px', padding: '2px 8px', fontSize: '11px',
                color: activeTab === tab.id ? '#15140F' : 'var(--deep-charcoal)',
                border: activeTab === tab.id ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                fontWeight: 700, fontFamily: 'var(--font-primary)',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div key={activeTab} className="animate-fade-in">

        {activeTab === 'summary' && (
          <div className="card">
            <h3 className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e8e8e8' }}>
              <span style={{ width: '4px', height: '14px', background: 'var(--coral)', borderRadius: '2px', display: 'inline-block' }} />{' '}
              الملخص التنفيذي
            </h3>
            <p className="text-body" style={{ padding: '24px', background: 'var(--white)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '16px' }}>
              {result.summary}
            </p>
            {result.participants_mentioned.length > 0 && (
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--charcoal-trans)' }}>
                <h4 className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e8e8e8', marginBottom: '16px' }}>
                  <span style={{ width: '4px', height: '14px', background: 'var(--coral)', borderRadius: '2px', display: 'inline-block' }} />{' '}
                  المشاركون المذكورون
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.participants_mentioned.map((p, i) => (
                    <span key={i} className="badge"> {p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="card">
            <h3 className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e8e8e8', marginBottom: '24px' }}>
              <span style={{ width: '4px', height: '14px', background: 'var(--coral)', borderRadius: '2px', display: 'inline-block' }} />
              قائمة المهام — {result.action_items.length} مهمة
            </h3>
            {result.action_items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--warm-taupe)', background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--charcoal-trans)' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}></p>
                <p className="text-body">لم يتم استخراج أي مهام</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {result.action_items.map((item, i) => {
                  const pStyle = item.priority ? PRIORITY_STYLES[item.priority] : null;
                  return (
                    <div key={i} style={{ padding: '20px 24px', borderRadius: '12px', background: 'var(--white)', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', gap: '20px', alignItems: 'flex-start', boxShadow: 'var(--shadow-level-1)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: 'var(--white)' }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <p className="text-h4" style={{ marginBottom: '12px' }}>{item.task}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                          {item.assignee && <span className="badge">👤 {item.assignee}</span>}
                          {item.deadline && <span className="badge">📅 {item.deadline}</span>}
                          {pStyle && <span className="badge" style={{ background: pStyle.bg, border: `1px solid ${pStyle.border}`, color: pStyle.text }}>{pStyle.label}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'decisions' && (
          <div className="card">
            <h3 className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e8e8e8', marginBottom: '24px' }}>
              <span style={{ width: '4px', height: '14px', background: 'var(--coral)', borderRadius: '2px', display: 'inline-block' }} />
              القرارات المتخذة — {result.decisions.length} قرار
            </h3>
            {result.decisions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--warm-taupe)', background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--charcoal-trans)' }}>
                <p style={{ fontSize: '32px', marginBottom: '12px' }}></p>
                <p className="text-body">لم يتم استخراج أي قرارات</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {result.decisions.map((dec, i) => (
                  <div key={i} style={{ padding: '24px', borderRadius: '12px', background: 'var(--white)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRight: '4px solid rgba(255, 255, 255, 0.2)', boxShadow: 'var(--shadow-level-1)' }}>
                    <p className="text-h4" style={{ marginBottom: '12px' }}>{dec.description}</p>
                    {dec.made_by && <span className="badge" style={{ marginBottom: '12px' }}>👤 {dec.made_by}</span>}
                    {dec.rationale && (
                      <p className="text-body" style={{ color: 'var(--warm-taupe)', fontStyle: 'italic', marginTop: '12px', borderTop: '1px solid var(--charcoal-trans)', paddingTop: '12px' }}>
                        💡 {dec.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e8e8e8', margin: 0 }}>
                <span style={{ width: '4px', height: '14px', background: 'var(--coral)', borderRadius: '2px', display: 'inline-block' }} />
                النص الكامل — {result.transcript.length.toLocaleString('ar')} حرف
              </h3>
              <button onClick={copyTranscript} className={copied ? 'btn-small-primary' : 'btn-tertiary'}>
                {copied ? '✓ تم النسخ' : ' نسخ'}
              </button>
            </div>
            <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '32px', maxHeight: '500px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <p className="text-body" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {result.transcript}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
