'use client';

import { useState } from 'react';

interface ActionItem {
  task: string;
  assignee: string | null;
  deadline: string | null;
  priority: string | null;
}

interface Decision {
  description: string;
  made_by: string | null;
  rationale: string | null;
}

interface ResultData {
  transcript: string;
  language: string;
  duration_seconds: number | null;
  meeting_title: string;
  summary: string;
  key_topics: string[];
  action_items: ActionItem[];
  decisions: Decision[];
  participants_mentioned: string[];
  sentiment: string | null;
  next_meeting_date: string | null;
  email_sent: boolean;
  email_error: string | null;
  email_recipients: string[];
}

interface ResultsViewerProps { result: ResultData; }

type Tab = 'summary' | 'transcript' | 'actions' | 'decisions';

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {

};

const SENTIMENT_MAP: Record<string, { icon: string; label: string; color: string }> = {

};

export default function ResultsViewer({ result }: ResultsViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [copied, setCopied] = useState(false);

  const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
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

  const sentimentInfo = result.sentiment ? SENTIMENT_MAP[result.sentiment] : null;

  return (
    <div className="animate-fade-in-up" style={{ marginTop: '32px' }}>

      {/* Header card */}
      <div className="glass-card" style={{ padding: '26px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: 'var(--accent-teal-dim)', border: '1px solid var(--accent-orange-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              }}>✅</div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {result.meeting_title}
              </h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}> اللغة: {result.language}</span>
              {result.duration_seconds && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {Math.floor(result.duration_seconds / 60)}د {Math.round(result.duration_seconds % 60)}ث
                </span>
              )}
              {sentimentInfo && (
                <span style={{ fontSize: '12px', color: sentimentInfo.color }}>
                  {sentimentInfo.icon} {sentimentInfo.label}
                </span>
              )}
              {result.next_meeting_date && (
                <span style={{ fontSize: '12px', color: 'var(--accent-sage)' }}>
                  القادم: {result.next_meeting_date}
                </span>
              )}
            </div>
          </div>

          {result.email_recipients.length > 0 && (
            <div>
              {result.email_sent
                ? <span className="badge badge-done"> أُرسل ({result.email_recipients.length})</span>
                : <span className="badge badge-error"> فشل الإرسال</span>
              }
            </div>
          )}
        </div>

        {result.key_topics.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {result.key_topics.map((topic, i) => (
              <span key={i} style={{
                padding: '3px 11px', borderRadius: '7px', fontSize: '12px',
                background: 'rgba(130,160,148,0.08)', border: '1px solid rgba(130,160,148,0.18)',
                color: 'var(--text-secondary)',
              }}>
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '9px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.15s ease',
              background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeTab === tab.id
                ? '1px solid var(--border-default)'
                : '1px solid transparent',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                background: activeTab === tab.id ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                borderRadius: '6px', padding: '2px 6px', fontSize: '11px', border: '1px solid var(--border-subtle)',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div key={activeTab} className="animate-fade-in">

        {/* SUMMARY */}
        {activeTab === 'summary' && (
          <div className="glass-card" style={{ padding: '26px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              الملخص التنفيذي
            </h3>
            <p className="arabic-text" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
              {result.summary}
            </p>
            {result.participants_mentioned.length > 0 && (
              <div style={{ marginTop: '22px' }}>
                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  👥 المشاركون المذكورون
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {result.participants_mentioned.map((p, i) => (
                    <span key={i} style={{
                      padding: '4px 13px', borderRadius: '6px', fontSize: '13px',
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                    }}>👤 {p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTIONS */}
        {activeTab === 'actions' && (
          <div className="glass-card" style={{ padding: '26px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '18px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              قائمة المهام — {result.action_items.length} مهمة
            </h3>
            {result.action_items.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '28px 0' }}>
                لم يتم استخراج أي مهام من هذا الاجتماع
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.action_items.map((item, i) => {
                  const pStyle = item.priority ? PRIORITY_STYLES[item.priority] : null;
                  return (
                    <div key={i} style={{
                      padding: '15px 18px', borderRadius: '10px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-default)',
                      display: 'flex', gap: '14px', alignItems: 'flex-start',
                    }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                      }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <p className="arabic-text" style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', lineHeight: '1.6' }}>
                          {item.task}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {item.assignee && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>👤 {item.assignee}</span>}
                          {item.deadline && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📅 {item.deadline}</span>}
                          {pStyle && (
                            <span style={{
                              fontSize: '11px', padding: '2px 9px', borderRadius: '6px',
                              background: pStyle.bg, border: `1px solid ${pStyle.border}`, color: pStyle.text,
                            }}>{pStyle.label}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DECISIONS */}
        {activeTab === 'decisions' && (
          <div className="glass-card" style={{ padding: '26px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '18px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              القرارات المتخذة — {result.decisions.length} قرار
            </h3>
            {result.decisions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '28px 0' }}>لم يتم استخراج أي قرارات</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {result.decisions.map((dec, i) => (
                  <div key={i} style={{
                    padding: '18px 20px', borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    borderRight: '3px solid var(--accent-teal)',
                  }}>
                    <p className="arabic-text" style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                      {dec.description}
                    </p>
                    {dec.made_by && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>👤 {dec.made_by}</p>
                    )}
                    {dec.rationale && (
                      <p className="arabic-text" style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        {dec.rationale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TRANSCRIPT */}
        {activeTab === 'transcript' && (
          <div className="glass-card" style={{ padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                النص الكامل — {result.transcript.length.toLocaleString('ar')} حرف
              </h3>
              <button
                onClick={copyTranscript}
                style={{
                  padding: '7px 14px', borderRadius: '6px',
                  border: `1px solid ${copied ? 'var(--accent-green)' : 'var(--border-default)'}`,
                  background: copied ? 'var(--bg-secondary)' : 'var(--bg-input)',
                  color: copied ? 'var(--accent-green)' : 'var(--text-primary)',
                  cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                  fontWeight: 500, transition: 'all 0.15s ease',
                }}
              >
                {copied ? ' تم النسخ' : ' نسخ'}
              </button>
            </div>
            <div style={{
              background: 'var(--bg-input)', borderRadius: '10px', padding: '18px',
              maxHeight: '480px', overflowY: 'auto',
              border: '1px solid var(--border-default)',
            }}>
              <p className="arabic-text" style={{
                fontSize: '14px', color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {result.transcript}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
