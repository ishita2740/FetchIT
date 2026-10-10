'use client'

import { useEffect, useState } from 'react'

interface DemoProcessingScreenProps {
  originalInput: string
  onComplete: () => void
}

// Exactly 8 clean steps pacing across ~90 seconds total
const DEMO_STEPS = [
  { id: 1, label: 'Understanding your request', durationMs: 10500 },
  { id: 2, label: 'Reading repository & context', durationMs: 11000 },
  { id: 3, label: 'Planning research workflow', durationMs: 11000 },
  { id: 4, label: 'Discovering relevant health apps', durationMs: 11000 },
  { id: 5, label: 'Collecting competitor data', durationMs: 11500 },
  { id: 6, label: 'Benchmarking features & capabilities', durationMs: 11500 },
  { id: 7, label: 'Generating insights & charts', durationMs: 11500 },
  { id: 8, label: 'Preparing professional report', durationMs: 11500 },
]

export function DemoProcessingScreen({ originalInput, onComplete }: DemoProcessingScreenProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    // 1-second interval ticker for elapsed time
    const ticker = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(ticker)
  }, [])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    function advance(stepIdx: number) {
      if (stepIdx >= DEMO_STEPS.length - 1) {
        timeoutId = setTimeout(() => {
          onComplete()
        }, DEMO_STEPS[DEMO_STEPS.length - 1].durationMs)
        return
      }

      timeoutId = setTimeout(() => {
        setCurrentStepIndex(stepIdx + 1)
        advance(stepIdx + 1)
      }, DEMO_STEPS[stepIdx].durationMs)
    }

    advance(0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [onComplete])

  const progressPercent = Math.min(
    100,
    Math.round(((currentStepIndex + 0.6) / DEMO_STEPS.length) * 100)
  )

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  return (
    <div className="processing-screen" aria-live="polite" aria-label="FetchIT task progress">
      {/* ── HEADER ── */}
      <div className="processing-header">
        <div className="processing-logo">
          <div className="processing-dot" />
          <span>FetchIT</span>
        </div>
        <h1 className="processing-title">Working on it…</h1>
        <p className="processing-subtitle">
          FetchIT is turning your request into a structured, source-backed result.
        </p>

        {/* Minimal Progress Bar */}
        <div style={{ marginTop: '1.25rem', width: '100%', maxWidth: '520px', marginInline: 'auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              color: '#6b9c90',
              marginBottom: '0.4rem',
            }}
          >
            <span>Step {currentStepIndex + 1} of {DEMO_STEPS.length}</span>
            <span style={{ fontWeight: 600, color: '#176b61' }}>
              {formatTime(elapsedSeconds)} ({progressPercent}%)
            </span>
          </div>
          <div
            style={{
              height: '5px',
              width: '100%',
              background: '#d9eee5',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: '#176b61',
                borderRadius: '999px',
                transition: 'width 1s ease-out',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── USER REQUEST ECHO ── */}
      <div className="processing-request" style={{ maxWidth: '520px', marginInline: 'auto', marginBottom: '2rem' }}>
        <span className="processing-request-label">Your request</span>
        <p className="processing-request-text" style={{ fontSize: '0.9rem', lineHeight: '1.45', opacity: 0.95 }}>
          &ldquo;{originalInput}&rdquo;
        </p>
      </div>

      {/* ── UNCLUTTERED 8-STEP TIMELINE ── */}
      <div
        className="processing-timeline"
        role="list"
        aria-label="Processing steps"
        style={{ maxWidth: '480px', marginInline: 'auto', padding: '0 8px' }}
      >
        {DEMO_STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex
          const isActive = idx === currentStepIndex
          const isPending = idx > currentStepIndex

          return (
            <div
              key={step.id}
              className={`pt-step ${isDone ? 'pt-step--completed' : isActive ? 'pt-step--active' : 'pt-step--pending'}`}
              role="listitem"
              style={{
                transition: 'all 0.4s ease',
                opacity: isPending ? 0.35 : 1,
              }}
            >
              {/* Left node & connector line */}
              <div className="pt-step-track">
                <div
                  className="pt-step-node"
                  style={{
                    boxShadow: isActive ? '0 0 0 4px rgba(23, 107, 97, 0.12)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isDone ? (
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>✓</span>
                  ) : isActive ? (
                    <span className="pt-pulse" />
                  ) : (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#a8c9bd' }} />
                  )}
                </div>
                {idx < DEMO_STEPS.length - 1 && (
                  <div className={`pt-step-line ${isDone ? 'pt-step-line--filled' : ''}`} style={{ minHeight: '28px' }} />
                )}
              </div>

              {/* Step name & right tick if completed */}
              <div
                className="pt-step-content"
                style={{
                  paddingBottom: idx === DEMO_STEPS.length - 1 ? '4px' : '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <span
                  className="pt-step-label"
                  style={{
                    fontSize: '0.98rem',
                    letterSpacing: '-0.01em',
                    color: isActive ? '#18312e' : isDone ? '#176b61' : '#6b9c90',
                    fontWeight: isActive ? 700 : isDone ? 600 : 500,
                  }}
                >
                  {step.label}
                </span>

                {/* Right tick icon beside completed step */}
                {isDone && (
                  <span
                    aria-label="Completed"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#d9eee5',
                      color: '#176b61',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      marginLeft: '0.75rem',
                      flexShrink: 0,
                      animation: 'main-arrive 0.25s ease-out forwards',
                    }}
                  >
                    ✓
                  </span>
                )}

                {/* Subtle active status pill */}
                {isActive && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: '#d9eee5',
                      color: '#176b61',
                      fontWeight: 600,
                      marginLeft: '0.75rem',
                      flexShrink: 0,
                    }}
                  >
                    in progress…
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── SKIP CTA (Discreet, for testing / recording control) ── */}
      <div style={{ marginTop: '1.75rem', textAlign: 'center' }}>
        <button
          type="button"
          onClick={onComplete}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a8c9bd',
            fontSize: '0.75rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#176b61')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#a8c9bd')}
        >
          Skip wait →
        </button>
      </div>
    </div>
  )
}
