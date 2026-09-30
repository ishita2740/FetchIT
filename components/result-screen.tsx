'use client'

import { useState, useMemo } from 'react'

interface ResultScreenProps {
  collection: {
    id: string
    original_input: string
    status: string
    created_at?: string
    completed_at?: string | null
  }
  result: {
    understood_requirement?: string | null
    processing_summary?: string | null
    result_data?: any
    final_answer?: string | null
  } | null
  workflow?: any | null
  processingSummary: any
  finalRecords: any[]
  sources: any[]
  preferences: any | null
  initialTab?: 'results' | 'workflow'
  onNewCollection: () => void
  onRunAgain?: () => void
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

function getColumns(records: any[]): string[] {
  const keys = new Set<string>()
  for (const r of records) {
    for (const k of Object.keys(r)) {
      if (!k.startsWith('_')) keys.add(k)
    }
  }
  return Array.from(keys)
}

function humanizeKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function cellValue(val: any) {
  if (val === null || val === undefined) return <span className="rs-null">—</span>
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (Array.isArray(val)) return val.join(', ')
  const s = String(val)
  if (s.startsWith('http')) {
    return <a href={s} target="_blank" rel="noopener noreferrer" className="rs-link">{s}</a>
  }
  return s
}

function buildPersonalizationMessage(prefs: any): string | null {
  if (!prefs) return null
  const styles: string[] = prefs.information_style || []
  const priorities: string[] = prefs.information_priorities || []
  if (styles.length === 0 && priorities.length === 0) return null
  const parts = [...styles, ...priorities].slice(0, 3)
  return `Since you prefer ${parts.join(' and ')}, FetchIT has presented your results in a structured, detailed format.`
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

async function exportCSV(collectionId: string) {
  const res = await fetch(`/api/collections/${collectionId}/export?format=csv`)
  if (!res.ok) { alert('Export failed. Please try again.'); return }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fetchit-${collectionId.slice(0, 8)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDF(collectionId: string) {
  window.open(`/api/collections/${collectionId}/export?format=pdf`, '_blank')
}

// ─── SOURCE MODAL ────────────────────────────────────────────────────────────

function SourceModal({ source, onClose }: { source: any; onClose: () => void }) {
  return (
    <div className="rs-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Source details">
      <div className="rs-modal" onClick={e => e.stopPropagation()}>
        <div className="rs-modal-header">
          <h3>Source details</h3>
          <button onClick={onClose} aria-label="Close" className="rs-modal-close">✕</button>
        </div>
        <dl className="rs-modal-dl">
          {source.source_name && <><dt>Name</dt><dd>{source.source_name}</dd></>}
          {source.source_url && <><dt>URL</dt><dd><a href={source.source_url} target="_blank" rel="noopener noreferrer" className="rs-link">{source.source_url}</a></dd></>}
          {source.source_type && <><dt>Type</dt><dd>{source.source_type.replace(/_/g, ' ')}</dd></>}
          {source.status && <><dt>Status</dt><dd>{source.status === 'failed' ? 'Could not be accessed' : source.status}</dd></>}
          {source.relevance && <><dt>Relevance</dt><dd>{source.relevance}</dd></>}
        </dl>
      </div>
    </div>
  )
}

// ─── RESULT TABLE ────────────────────────────────────────────────────────────

function ResultTable({
  records,
  columns,
  sources,
  viewMode = 'table',
}: {
  records: any[]
  columns: string[]
  sources: any[]
  viewMode?: 'table' | 'cards' | 'list'
}) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filterValidation, setFilterValidation] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<any | null>(null)

  const uniqueSources = useMemo(() => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const r of records) {
      const name = r._source_name || r._source_url || ''
      if (name && !seen.has(name)) { seen.add(name); out.push(name) }
    }
    return out
  }, [records])

  const filtered = useMemo(() => {
    let rows = records
    // search
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        columns.some(col => {
          const v = r[col]
          return v != null && String(v).toLowerCase().includes(q)
        })
      )
    }
    // validation filter
    if (filterValidation !== 'all') {
      rows = rows.filter(r => r._validation === filterValidation)
    }
    // source filter
    if (filterSource !== 'all') {
      rows = rows.filter(r => (r._source_name || r._source_url || '') === filterSource)
    }
    // sort
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = String(a[sortCol] ?? '')
        const bv = String(b[sortCol] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return rows
  }, [records, columns, search, sortCol, sortDir, filterValidation, filterSource])

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function findSource(record: any) {
    const url = record._source_url
    return sources.find(s => s.source_url === url) || { source_url: url, source_name: record._source_name }
  }

  return (
    <div className="rs-table-section">
      {/* Controls */}
      <div className="rs-controls">
        <div className="rs-search-wrap">
          <svg className="rs-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            className="rs-search"
            placeholder="Search collected records…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search dataset"
          />
          {search && <button className="rs-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>}
        </div>
        <div className="rs-filters">
          <select className="rs-filter-select" value={filterValidation} onChange={e => setFilterValidation(e.target.value)} aria-label="Filter by quality">
            <option value="all">All records</option>
            <option value="valid">Complete only</option>
            <option value="incomplete">Incomplete only</option>
          </select>
          {uniqueSources.length > 1 && (
            <select className="rs-filter-select" value={filterSource} onChange={e => setFilterSource(e.target.value)} aria-label="Filter by source">
              <option value="all">All sources</option>
              {uniqueSources.map(s => (
                <option key={s} value={s}>{s.length > 40 ? s.slice(0, 40) + '…' : s}</option>
              ))}
            </select>
          )}
        </div>
        <span className="rs-count">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Render Mode: Table */}
      {viewMode === 'table' && (
        <div className="rs-table-wrap">
          <table className="rs-table" aria-label="Results dataset">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} onClick={() => toggleSort(col)} className="rs-th" scope="col" aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    {humanizeKey(col)}
                    <span className="rs-sort-icon" aria-hidden="true">
                      {sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
                    </span>
                  </th>
                ))}
                <th className="rs-th rs-th-source" scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="rs-empty">No records match your search or filters.</td></tr>
              ) : filtered.map((record, idx) => (
                <tr key={idx} className={`rs-tr ${record._validation === 'valid' ? '' : 'rs-tr--incomplete'}`}>
                  {columns.map(col => (
                    <td key={col} className="rs-td">{cellValue(record[col])}</td>
                  ))}
                  <td className="rs-td rs-td-source">
                    <button
                      className="rs-source-btn"
                      onClick={() => setSelectedSource(findSource(record))}
                      title={record._source_name || record._source_url}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      {(record._source_name || record._source_url || '').slice(0, 22)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Render Mode: Cards / List */}
      {(viewMode === 'cards' || viewMode === 'list') && (
        <div className={`rs-cards-grid ${viewMode === 'list' ? 'rs-cards-grid--list' : ''}`}>
          {filtered.length === 0 ? (
            <p className="rs-empty">No records match your search or filters.</p>
          ) : (
            filtered.map((record, idx) => (
              <div key={idx} className={`rs-card-item ${record._validation === 'valid' ? '' : 'rs-card-item--incomplete'}`}>
                <div className="rs-card-header">
                  <span className="rs-card-num">#{idx + 1}</span>
                  <button
                    className="rs-source-btn"
                    onClick={() => setSelectedSource(findSource(record))}
                    title={record._source_name || record._source_url}
                  >
                    {(record._source_name || record._source_url || '').slice(0, 20)}
                  </button>
                </div>
                <div className="rs-card-fields">
                  {columns.map(col => (
                    <div key={col} className="rs-card-field">
                      <span className="rs-card-field-name">{humanizeKey(col)}:</span>
                      <span className="rs-card-field-val">{cellValue(record[col])}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedSource && (
        <SourceModal source={selectedSource} onClose={() => setSelectedSource(null)} />
      )}
    </div>
  )
}

// ─── WORKFLOW INSPECTION VIEW ────────────────────────────────────────────────

function WorkflowView({
  collection,
  workflow,
  result,
  processingSummary,
  sources,
}: {
  collection: any
  workflow: any
  result: any
  processingSummary: any
  sources: any[]
}) {
  const steps: any[] = workflow?.steps || [
    { id: 'step_1', type: 'input_processing', description: 'Understood your requirement using AI' },
    { id: 'step_2', type: 'source_discovery', description: 'Discovered relevant permitted web sources' },
    { id: 'step_3', type: 'data_collection', description: 'Fetched live content from verified sources' },
    { id: 'step_4', type: 'cleaning', description: 'Cleaned and structured extracted data' },
    { id: 'step_5', type: 'validation', description: 'Validated fields and removed duplicates' },
    { id: 'step_6', type: 'result_generation', description: 'Prepared the final dataset' },
  ]

  const friendlyLabels: Record<string, string> = {
    input_processing: 'Understanding request',
    document_extraction: 'Structuring information',
    source_discovery: 'Finding relevant sources',
    data_collection: 'Collecting content from sources',
    cleaning: 'Cleaning data & removing nulls',
    validation: 'Checking attributes against requirement',
    deduplication: 'Removing duplicate records',
    summarization: 'Summarizing key findings',
    analysis: 'Analyzing extracted information',
    result_generation: 'Assembling final results',
  }

  return (
    <div className="rs-workflow-view">
      <div className="rs-wf-header">
        <h3 className="rs-wf-title">How FetchIT collected this data</h3>
        <p className="rs-wf-subtitle">
          Transparent, end-to-end execution audit of your request.
        </p>
      </div>

      {/* Goal */}
      {workflow?.goal && (
        <div className="rs-wf-card">
          <span className="rs-wf-card-label">Workflow Objective</span>
          <p className="rs-wf-card-text">{workflow.goal}</p>
        </div>
      )}

      {/* Steps Timeline */}
      <div className="rs-wf-timeline">
        {steps.map((st, idx) => (
          <div key={st.id || idx} className="rs-wf-step">
            <div className="rs-wf-step-node">
              <span className="rs-wf-step-num">{idx + 1}</span>
              {idx < steps.length - 1 && <div className="rs-wf-step-line" />}
            </div>
            <div className="rs-wf-step-body">
              <div className="rs-wf-step-top">
                <strong className="rs-wf-step-name">
                  {friendlyLabels[st.type] || humanizeKey(st.type || `Stage ${idx + 1}`)}
                </strong>
                <span className="rs-tag rs-tag--verified">Completed</span>
              </div>
              <p className="rs-wf-step-desc">{st.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Processing Audit Breakdown */}
      {processingSummary && (
        <div className="rs-wf-audit">
          <h4 className="rs-wf-audit-title">Processing & Quality Audit</h4>
          <div className="rs-wf-audit-grid">
            <div className="rs-wf-audit-box">
              <span className="rs-wf-audit-num">{sources.length}</span>
              <span className="rs-wf-audit-label">Permitted Sources</span>
            </div>
            <div className="rs-wf-audit-box">
              <span className="rs-wf-audit-num">{processingSummary.raw_records ?? '—'}</span>
              <span className="rs-wf-audit-label">Raw Records Extracted</span>
            </div>
            <div className="rs-wf-audit-box">
              <span className="rs-wf-audit-num">{processingSummary.duplicates_removed ?? 0}</span>
              <span className="rs-wf-audit-label">Duplicates Eliminated</span>
            </div>
            <div className="rs-wf-audit-box">
              <span className="rs-wf-audit-num">{processingSummary.final_count ?? '—'}</span>
              <span className="rs-wf-audit-label">Verified Final Results</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN CENTRALIZED DASHBOARD SCREEN ────────────────────────────────────────

export function ResultScreen({
  collection,
  result,
  workflow,
  processingSummary,
  finalRecords,
  sources,
  preferences,
  initialTab = 'results',
  onNewCollection,
  onRunAgain,
}: ResultScreenProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'workflow' | 'sources'>(initialTab)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [exportOpen, setExportOpen] = useState(false)
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const [selectedSource, setSelectedSource] = useState<any | null>(null)

  const resultData = result?.result_data as any
  const outputType = resultData?.output_type || 'structured_dataset'
  const fields: string[] = resultData?.fields || []
  const columns = getColumns(finalRecords.length > 0 ? finalRecords : [])
  const displayColumns = fields.length > 0
    ? fields.filter(f => columns.includes(f))
    : columns

  const personMsg = buildPersonalizationMessage(preferences)
  const understoodReq = result?.understood_requirement || null

  async function handleExport(format: 'csv' | 'pdf') {
    setExportLoading(format)
    try {
      if (format === 'csv') await exportCSV(collection.id)
      else await exportPDF(collection.id)
    } finally {
      setExportLoading(null)
      setExportOpen(false)
    }
  }

  return (
    <div className="rs-screen" aria-label="FetchIT centralized collection dashboard">
      {/* ── TOP BAR ── */}
      <header className="rs-topbar">
        <div className="rs-topbar-status">
          <span className="rs-status-dot" />
          <span className="rs-status-text">
            {collection.status === 'completed' ? 'Collection completed' : `Status: ${collection.status}`}
          </span>
        </div>
        <div className="rs-topbar-actions">
          {/* Export */}
          <div className="rs-export-wrap">
            <button
              className="rs-btn rs-btn--primary"
              onClick={() => setExportOpen(o => !o)}
              id="export-btn"
              aria-haspopup="true"
              aria-expanded={exportOpen}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            {exportOpen && (
              <div className="rs-export-menu" role="menu">
                <button className="rs-export-item" role="menuitem" onClick={() => handleExport('csv')} disabled={exportLoading === 'csv'}>
                  {exportLoading === 'csv' ? 'Exporting…' : '📄 Export CSV'}
                </button>
                <button className="rs-export-item" role="menuitem" onClick={() => handleExport('pdf')} disabled={exportLoading === 'pdf'}>
                  {exportLoading === 'pdf' ? 'Generating…' : '📑 Print / PDF Report'}
                </button>
              </div>
            )}
          </div>

          {onRunAgain && (
            <button className="rs-btn rs-btn--ghost" onClick={onRunAgain} title="Run again as new collection">
              Run again
            </button>
          )}

          <button className="rs-btn rs-btn--ghost" onClick={onNewCollection}>
            + New collection
          </button>
        </div>
      </header>

      {/* ── HERO / COLLECTION HEADER ── */}
      <div className="rs-hero">
        <div className="rs-hero-meta-row">
          <div className="rs-hero-badge">✦ Data Intelligence Dashboard</div>
          <span className="rs-hero-date">Created {formatDate(collection.created_at)}</span>
        </div>
        <h1 className="rs-hero-title">
          {processingSummary?.final_count ?? finalRecords.length} record{(processingSummary?.final_count ?? finalRecords.length) !== 1 ? 's' : ''} found
        </h1>
      </div>

      <div className="rs-body">

        {/* ── CENTRALIZED NAVIGATION TABS ── */}
        <nav className="rs-dashboard-tabs" aria-label="Dashboard navigation">
          <button
            type="button"
            className={`rs-dash-tab ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
          >
            📊 Results & Dataset ({finalRecords.length})
          </button>
          <button
            type="button"
            className={`rs-dash-tab ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            ⚙ View Workflow
          </button>
          <button
            type="button"
            className={`rs-dash-tab ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            🌐 Sources ({sources.length})
          </button>
        </nav>

        {/* ── TAB 1: RESULTS & DATASET ── */}
        {activeTab === 'results' && (
          <>
            {/* What you asked & AI explainability */}
            <section className="rs-section" aria-labelledby="rs-asked-heading">
              <h2 className="rs-section-label" id="rs-asked-heading">Your inquiry</h2>
              <blockquote className="rs-asked">&ldquo;{collection.original_input}&rdquo;</blockquote>

              {understoodReq && (
                <div className="rs-understood-wrap">
                  <span className="rs-section-label rs-section-label--sm">
                    <span className="rs-sparkle">✦</span> What FetchIT understood
                  </span>
                  <p className="rs-understood">{understoodReq}</p>
                </div>
              )}
            </section>

            {/* Personalization (if set by user) */}
            {personMsg && (
              <section className="rs-section rs-section--tinted" aria-labelledby="rs-personal-heading">
                <h2 className="rs-section-label" id="rs-personal-heading">
                  <span className="rs-sparkle">✦</span> Adapted to your preferences
                </h2>
                <p className="rs-personal">{personMsg}</p>
              </section>
            )}

            {/* Overview statistics */}
            {processingSummary && (
              <div className="rs-overview">
                <div className="rs-overview-stat">
                  <span className="rs-overview-num">{processingSummary.final_count ?? finalRecords.length}</span>
                  <span className="rs-overview-label">Final records</span>
                </div>
                <div className="rs-overview-stat">
                  <span className="rs-overview-num">{sources.length}</span>
                  <span className="rs-overview-label">Sources</span>
                </div>
                <div className="rs-overview-stat">
                  <span className="rs-overview-num">{processingSummary.raw_records ?? '—'}</span>
                  <span className="rs-overview-label">Raw extracted</span>
                </div>
                <div className="rs-overview-stat">
                  <span className="rs-overview-num">{processingSummary.duplicates_removed ?? 0}</span>
                  <span className="rs-overview-label">Duplicates removed</span>
                </div>
                {processingSummary.incomplete > 0 && (
                  <div className="rs-overview-stat rs-overview-stat--warn">
                    <span className="rs-overview-num">{processingSummary.incomplete}</span>
                    <span className="rs-overview-label">Incomplete</span>
                  </div>
                )}
              </div>
            )}

            {/* Dataset table & view toggle */}
            <section className="rs-section" aria-labelledby="rs-results-heading">
              <div className="rs-section-header-row">
                <h2 className="rs-section-label" id="rs-results-heading">
                  <span className="rs-sparkle">✦</span> Collected data
                </h2>
                {displayColumns.length > 0 && (
                  <div className="rs-view-toggle">
                    <button
                      type="button"
                      className={`rs-vt-btn ${viewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setViewMode('table')}
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      className={`rs-vt-btn ${viewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setViewMode('cards')}
                    >
                      Cards
                    </button>
                  </div>
                )}
              </div>

              {finalRecords.length === 0 ? (
                <div className="rs-empty-state">
                  <p>No records could be extracted from the discovered sources.</p>
                  <p className="rs-empty-hint">Try adjusting your query or providing a more specific topic.</p>
                </div>
              ) : displayColumns.length > 0 ? (
                <ResultTable
                  records={finalRecords}
                  columns={displayColumns}
                  sources={sources}
                  viewMode={viewMode}
                />
              ) : (
                <pre className="rs-raw">{JSON.stringify(finalRecords, null, 2)}</pre>
              )}
            </section>
          </>
        )}

        {/* ── TAB 2: WORKFLOW INSPECTION ── */}
        {activeTab === 'workflow' && (
          <section className="rs-section" aria-label="Workflow details">
            <WorkflowView
              collection={collection}
              workflow={workflow}
              result={result}
              processingSummary={processingSummary}
              sources={sources}
            />
          </section>
        )}

        {/* ── TAB 3: SOURCES & PERMISSIONS ── */}
        {activeTab === 'sources' && (
          <section className="rs-section" aria-label="Sources consulted">
            <h2 className="rs-section-label">Permitted web sources ({sources.length})</h2>
            <p className="rs-how">
              Information was discovered and gathered from these live sources:
            </p>

            <ol className="rs-sources-list">
              {sources.map((src, idx) => (
                <li key={src.id || idx} className="rs-source-item">
                  <div className="rs-source-num">{idx + 1}</div>
                  <div className="rs-source-info">
                    <div className="rs-source-name">{src.source_name || src.name || 'Unknown source'}</div>
                    {(src.source_url || src.url) && (
                      <a
                        href={src.source_url || src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rs-source-url"
                      >
                        {src.source_url || src.url}
                      </a>
                    )}
                    <div className="rs-source-meta">
                      {(src.source_type || src.type) && (
                        <span className="rs-tag rs-tag--type">
                          {(src.source_type || src.type).replace(/_/g, ' ')}
                        </span>
                      )}
                      <span className={`rs-tag rs-tag--${src.status || 'verified'}`}>
                        {src.status === 'failed' ? 'Could not be accessed' : (src.status || 'verified')}
                      </span>
                      <button
                        type="button"
                        className="rs-link-btn"
                        onClick={() => setSelectedSource(src)}
                      >
                        View details
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ── FOOTER ── */}
        <footer className="rs-footer">
          <span className="rs-footer-date">
            FetchIT Data Intelligence Platform &nbsp;·&nbsp; {formatDate(collection.created_at)}
          </span>
          <div className="rs-footer-actions">
            {onRunAgain && (
              <button className="rs-btn rs-btn--ghost rs-btn--sm" onClick={onRunAgain}>
                Run again
              </button>
            )}
            <button className="rs-btn rs-btn--ghost rs-btn--sm" onClick={onNewCollection}>
              + New collection
            </button>
          </div>
        </footer>

      </div>

      {selectedSource && (
        <SourceModal source={selectedSource} onClose={() => setSelectedSource(null)} />
      )}
    </div>
  )
}
