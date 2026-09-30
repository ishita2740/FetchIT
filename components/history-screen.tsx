'use client'

interface HistoryItem {
  id: string
  title: string
  original_input: string
  status: string
  created_at: string
  record_count?: number
  understood_requirement?: string | null
  output_type?: string | null
}

interface HistoryScreenProps {
  items: HistoryItem[]
  onOpen: (item: HistoryItem, tab?: 'results' | 'workflow') => void
  onRunAgain?: (item: HistoryItem) => void
  onClose: () => void
  loading: boolean
}

function formatRelativeDate(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

function statusBadge(status: string) {
  if (status === 'completed') return <span className="hist-badge hist-badge--done">Completed</span>
  if (status === 'cancelled') return <span className="hist-badge hist-badge--cancel">Cancelled</span>
  if (status === 'failed') return <span className="hist-badge hist-badge--fail">Failed</span>
  return <span className="hist-badge hist-badge--pending">{status}</span>
}

export function HistoryScreen({
  items,
  onOpen,
  onRunAgain,
  onClose,
  loading,
}: HistoryScreenProps) {
  return (
    <div className="hist-screen" role="dialog" aria-modal="true" aria-label="Collection and workflow history">
      <div className="hist-panel">
        <div className="hist-header">
          <div>
            <h2 className="hist-title">History</h2>
            <p className="hist-subtitle">Revisit previous collections, datasets, and workflows</p>
          </div>
          <button className="hist-close" onClick={onClose} aria-label="Close history">✕</button>
        </div>

        {loading ? (
          <div className="hist-loading">Loading your history…</div>
        ) : items.length === 0 ? (
          <div className="hist-empty">
            <p>No collections yet.</p>
            <p className="hist-empty-hint">Submit a request to start your first data collection.</p>
          </div>
        ) : (
          <ul className="hist-list" role="list">
            {items.map(item => (
              <li key={item.id} className="hist-item">
                <div className="hist-item-header">
                  <div className="hist-item-query" title={item.original_input}>
                    &ldquo;{item.original_input}&rdquo;
                  </div>
                  <div className="hist-item-meta">
                    {statusBadge(item.status)}
                    {item.record_count != null && item.record_count > 0 && (
                      <span className="hist-meta-text">{item.record_count} records</span>
                    )}
                    <span className="hist-meta-date">{formatRelativeDate(item.created_at)}</span>
                  </div>
                </div>

                <div className="hist-item-actions">
                  <button
                    type="button"
                    className="hist-action-btn hist-action-btn--primary"
                    onClick={() => onOpen(item, 'results')}
                  >
                    Open results
                  </button>
                  <button
                    type="button"
                    className="hist-action-btn"
                    onClick={() => onOpen(item, 'workflow')}
                  >
                    View workflow
                  </button>
                  {onRunAgain && (
                    <button
                      type="button"
                      className="hist-action-btn hist-action-btn--ghost"
                      onClick={() => onRunAgain(item)}
                      title="Run again as a new collection"
                    >
                      Run again
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button className="hist-backdrop" onClick={onClose} aria-label="Close" />
    </div>
  )
}
