'use client'

import { useLanguage } from '@/lib/i18n'

interface HowItWorksModalProps {
  onClose: () => void
}

export function HowItWorksModal({ onClose }: HowItWorksModalProps) {
  const { t } = useLanguage()

  const stages = [
    {
      num: 1,
      title: 'AI Understanding & Personalization',
      desc: 'Parses your request in any supported language (English, Hindi, Marathi, Tamil) and customizes extraction using your 4 personalized preferences (Interests, Purpose, Style, Priorities).',
      badge: 'Intent & Entity Parsing',
    },
    {
      num: 2,
      title: 'Workflow Planning',
      desc: 'Creates a custom multi-step data collection plan tailored specifically to your data targets, determining search queries and field requirements.',
      badge: 'Target Definition',
    },
    {
      num: 3,
      title: 'Live Source Discovery',
      desc: 'Searches real live web sources using Tavily API to locate reputable, fresh websites, official reports, and verified databases.',
      badge: 'Real-Time Web Fetch',
    },
    {
      num: 4,
      title: 'AI Extraction',
      desc: 'Fetches raw web content or extracts attached documents/images, transforming unorganized unstructured text into clean structured entities.',
      badge: 'Multi-Modal Extraction',
    },
    {
      num: 5,
      title: 'Cleaning & Normalization',
      desc: 'Strips out noise, formats currencies, dates, and units into consistent, standardized formats.',
      badge: 'Quality Conditioning',
    },
    {
      num: 6,
      title: 'Schema Validation',
      desc: 'Validates every record against strict Zod type constraints and ensures high confidence scoring before entering your final dataset.',
      badge: 'Strict Zod Verification',
    },
    {
      num: 7,
      title: 'Deduplication & Presentation',
      desc: 'Eliminates duplicate entities across multiple sources and presents data in an interactive dashboard with Table, Card views, and PDF/CSV export.',
      badge: 'Final Intelligence',
    },
  ]

  return (
    <div className="rs-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rs-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="rs-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>✨</span>
            <h3 style={{ margin: 0 }}>{t('help_how_it_works')}</h3>
          </div>
          <button onClick={onClose} aria-label={t('close')} className="rs-modal-close">✕</button>
        </div>

        <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            FetchIT is not just a search engine — it is an end-to-end autonomous research and structured data extraction engine.
          </p>

          <div className="how-it-works-steps">
            {stages.map(s => (
              <div key={s.num} className="how-it-works-step">
                <div className="how-step-badge">{s.num}</div>
                <div className="how-step-content">
                  <div className="how-step-top">
                    <strong className="how-step-title">{s.title}</strong>
                    <span className="how-step-tag">{s.badge}</span>
                  </div>
                  <p className="how-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="rs-btn rs-btn--primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
