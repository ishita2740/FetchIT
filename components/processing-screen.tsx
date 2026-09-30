'use client'

import { useState } from 'react'

interface ProcessingScreenProps {
  status: string
  originalInput: string
  errorMessage?: string | null
  partialCount?: number
  onCancel?: () => void
  onRetry?: () => void
  onStartNew?: () => void
  onViewPartial?: () => void
}

const STEPS = [
  { id: 'understanding', label: 'Understanding your request', statuses: ['understanding'] },
  { id: 'planning',      label: 'Planning the workflow',      statuses: ['planning'] },
  { id: 'finding',       label: 'Finding relevant sources',   statuses: ['finding_sources'] },
  { id: 'collecting',    label: 'Collecting information',     statuses: ['collecting'] },
  { id: 'cleaning',      label: 'Cleaning the data',          statuses: ['cleaning'] },
  { id: 'validating',    label: 'Validating records',         statuses: ['validating'] },
  { id: 'deduplicating', label: 'Removing duplicates',        statuses: ['deduplicating'] },
  { id: 'preparing',     label: 'Preparing your results',     statuses: ['completed'] },
]

const STATUS_ORDER: Record<string, number> = {
  draft: -1,
  understanding: 0,
  planning: 1,
  finding_sources: 2,
  collecting: 3,
  cleaning: 4,
  validating: 5,
  deduplicating: 6,
  completed: 7,
}

function getStepState(stepIndex: number, currentStatusIndex: number): 'completed' | 'active' | 'pending' {
  if (currentStatusIndex > stepIndex) return 'completed'
  if (currentStatusIndex === stepIndex) return 'active'
  return 'pending'
}

export function ProcessingScreen({
  status,
  originalInput,
  errorMessage,
  partialCount = 0,
  onCancel,
  onRetry,
  onStartNew,
  onViewPartial,
}: ProcessingScreenProps) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const isCancelled = status === 'cancelled'
  const isFailed = status === 'failed'
  const isRunning = !isCancelled && !isFailed && status !== 'completed'

  const currentIndex = STATUS_ORDER[status] ?? 0

  return (
    <div className="processing-screen" aria-live="polite" aria-label="FetchIT task progress">
      {/* Header */}
      <div className="processing-header">
        <div className="processing-logo">
          <div className={`processing-dot ${isCancelled ? 'processing-dot--cancelled' : isFailed ? 'processing-dot--failed' : ''}`} />
          <span>FetchIT</span>
        </div>
        <h1 className="processing-title">
          {isCancelled
            ? 'Collection cancelled'
            : isFailed
            ? "Collection couldn't be completed"
            : 'Working on it…'}
        </h1>
        <p className="processing-subtitle">
          {isCancelled
            ? 'Your collection was stopped before completion. Any information collected so far has been preserved.'
            : isFailed
            ? (errorMessage || 'An issue occurred during data collection. You can retry the step or start fresh.')
            : 'FetchIT is turning your request into a structured, source-backed result.'}
        </p>
      </div>

      {/* Request echo */}
      <div className="processing-request">
        <span className="processing-request-label">Your request</span>
        <p className="processing-request-text">&ldquo;{originalInput}&rdquo;</p>
      </div>

      {/* Timeline (shown during running or partially completed) */}
      {!isCancelled && (
        <div className="processing-timeline" role="list" aria-label="Processing steps">
          {STEPS.map((step, idx) => {
            const state = isFailed && idx === currentIndex
              ? 'active'
              : getStepState(idx, currentIndex)

            return (
              <div
                key={step.id}
                className={`pt-step pt-step--${state} ${isFailed && idx === currentIndex ? 'pt-step--failed' : ''}`}
                role="listitem"
                aria-label={`${step.label}: ${state}`}
              >
                <div className="pt-step-track">
                  <div className="pt-step-node" aria-hidden="true">
                    {state === 'completed' ? (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : isFailed && idx === currentIndex ? (
                      <span className="pt-fail-icon">✕</span>
                    ) : state === 'active' ? (
                      <span className="pt-pulse" />
                    ) : null}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`pt-step-line ${state === 'completed' ? 'pt-step-line--filled' : ''}`} />
                  )}
                </div>
                <div className="pt-step-content">
                  <span className="pt-step-label">{step.label}</span>
                  {state === 'active' && !isFailed && (
                    <span className="pt-step-indicator">
                      <span className="pt-dot" /><span className="pt-dot" /><span className="pt-dot" />
                    </span>
                  )}
                  {isFailed && idx === currentIndex && (
                    <span className="pt-step-error-tag">Failed here</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ACTION CONTROLS ── */}
      {/* 1. Active task: Cancel collection */}
      {isRunning && onCancel && (
        <div className="processing-task-controls">
          {!confirmCancel ? (
            <button
              type="button"
              className="processing-cancel-btn"
              onClick={() => setConfirmCancel(true)}
            >
              Cancel collection
            </button>
          ) : (
            <div className="processing-confirm-cancel">
              <span>Stop this collection?</span>
              <div className="processing-confirm-actions">
                <button
                  type="button"
                  className="rs-btn rs-btn--danger rs-btn--sm"
                  onClick={() => {
                    setConfirmCancel(false)
                    onCancel()
                  }}
                >
                  Yes, cancel
                </button>
                <button
                  type="button"
                  className="rs-btn rs-btn--ghost rs-btn--sm"
                  onClick={() => setConfirmCancel(false)}
                >
                  Keep running
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Cancelled State: New Collection / View Partial Data */}
      {isCancelled && (
        <div className="processing-post-actions">
          {partialCount > 0 && onViewPartial && (
            <button
              type="button"
              className="rs-btn rs-btn--primary"
              onClick={onViewPartial}
            >
              View collected data ({partialCount} records)
            </button>
          )}
          {onStartNew && (
            <button
              type="button"
              className="rs-btn rs-btn--ghost"
              onClick={onStartNew}
            >
              + Start a new collection
            </button>
          )}
        </div>
      )}

      {/* 3. Failed State: Try again / Start new */}
      {isFailed && (
        <div className="processing-post-actions">
          {onRetry && (
            <button
              type="button"
              className="rs-btn rs-btn--primary"
              onClick={onRetry}
            >
              Try again
            </button>
          )}
          {onStartNew && (
            <button
              type="button"
              className="rs-btn rs-btn--ghost"
              onClick={onStartNew}
            >
              Start new collection
            </button>
          )}
        </div>
      )}

      {/* Footer note */}
      {isRunning && (
        <p className="processing-note">
          This usually takes 30–90 seconds depending on the number of sources.
        </p>
      )}
    </div>
  )
}
