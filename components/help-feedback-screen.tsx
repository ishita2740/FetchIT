'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'

interface HelpFeedbackScreenProps {
  onClose: () => void
}

export function HelpFeedbackScreen({ onClose }: HelpFeedbackScreenProps) {
  const { t } = useLanguage()

  const [category, setCategory] = useState<'general' | 'bug' | 'feature' | 'praise' | 'other'>('general')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [faqOpen, setFaqOpen] = useState<number | null>(0)

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message,
          page_context: 'help_screen',
        }),
      })

      if (res.ok) {
        setSubmitted(true)
        setMessage('')
      } else {
        alert('Failed to send feedback. Please try again.')
      }
    } catch {
      alert('Network error. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  const faqs = [
    {
      q: 'How does FetchIT collect and verify data?',
      a: 'FetchIT uses a multi-stage autonomous pipeline: AI Understanding parses your prompt and user preferences; Workflow Planning creates an execution plan; Source Discovery fetches real, verified live websites; Extraction pulls structured records; and Cleaning, Validation (Zod schemas), and Deduplication ensure clean, ready-to-use datasets.',
    },
    {
      q: 'What languages does FetchIT support?',
      a: 'FetchIT natively supports 4 languages: English, Hindi (हिंदी), Marathi (मराठी), and Tamil (தமிழ்). You can switch the UI language anytime from Settings, and prompt in any supported language.',
    },
    {
      q: 'How does voice input (Microphone) work?',
      a: 'Click the microphone button to dictate your data request. FetchIT uses standard browser speech recognition with real-time feedback and speech-to-text conversion.',
    },
    {
      q: 'How can I export my results?',
      a: 'You can export data as CSV or generate a publication-quality PDF report directly from the Result screen. You can also save documents and charts to your account.',
    },
    {
      q: 'Can I upload files and images for analysis?',
      a: 'Yes! FetchIT supports attaching PDF, DOCX, TXT, CSV, XLSX, and images (JPEG, PNG, WebP). Text files are extracted and analyzed by AI, while images are processed by vision AI models.',
    },
  ]

  return (
    <div className="sub-screen-container" role="region" aria-label={t('help_title')}>
      <header className="sub-screen-header">
        <div className="sub-screen-header-left">
          <button className="icon-button" onClick={onClose} aria-label={t('back')}>
            ←
          </button>
          <h2>{t('help_title')}</h2>
        </div>
      </header>

      <div className="sub-screen-content">
        <div className="help-content-wrap">
          {/* FAQ Accordion */}
          <section className="help-section">
            <h3 className="help-section-title">{t('help_faq')}</h3>
            <div className="faq-list">
              {faqs.map((faq, idx) => (
                <div key={idx} className="faq-item">
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                    aria-expanded={faqOpen === idx}
                  >
                    <span>{faq.q}</span>
                    <span className="faq-icon">{faqOpen === idx ? '−' : '+'}</span>
                  </button>
                  {faqOpen === idx && (
                    <div className="faq-answer">
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Feedback Form */}
          <section className="help-section">
            <h3 className="help-section-title">{t('help_feedback_title')}</h3>
            <p className="help-section-desc">
              Have a suggestion, question, or encountered an issue? Let us know.
            </p>

            {submitted ? (
              <div className="feedback-success">
                <span className="feedback-success-icon">✓</span>
                <p>{t('help_feedback_submitted')}</p>
                <button
                  type="button"
                  className="sub-btn sub-btn--ghost"
                  onClick={() => setSubmitted(false)}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="feedback-form">
                <div className="feedback-category-row">
                  {(['general', 'bug', 'feature', 'praise', 'other'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`feedback-cat-btn ${category === cat ? 'active' : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat === 'general' && '💬 General'}
                      {cat === 'bug' && '🐞 Bug'}
                      {cat === 'feature' && '💡 Feature Idea'}
                      {cat === 'praise' && '⭐ Praise'}
                      {cat === 'other' && '📝 Other'}
                    </button>
                  ))}
                </div>

                <div className="feedback-textarea-wrap">
                  <textarea
                    rows={4}
                    placeholder="Tell us what you think or describe the issue in detail..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="rs-btn rs-btn--primary"
                  disabled={submitting || !message.trim()}
                >
                  {submitting ? 'Sending…' : t('help_feedback_submit')}
                </button>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
