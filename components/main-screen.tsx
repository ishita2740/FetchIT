'use client'

import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { ProcessingScreen } from './processing-screen'
import { ResultScreen } from './result-screen'
import { HistoryScreen } from './history-screen'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveCollectionState {
  id: string
  original_input: string
  status: string
  created_at?: string
  completed_at?: string | null
}

interface ActiveResultState {
  understood_requirement?: string | null
  processing_summary?: string | null
  result_data?: unknown
  final_answer?: string | null
}

type AppView = 'home' | 'processing' | 'result' | 'history'

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export function MainScreen({ name = 'User' }: { name?: string }) {
  // ── UI state
  const [view, setView] = useState<AppView>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [request, setRequest] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [listening, setListening] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultInitialTab, setResultInitialTab] = useState<'results' | 'workflow'>('results')

  // ── Collection pipeline state
  const [activeCollection, setActiveCollection] = useState<ActiveCollectionState | null>(null)
  const [activeResult, setActiveResult] = useState<ActiveResultState | null>(null)
  const [activeWorkflow, setActiveWorkflow] = useState<any | null>(null)
  const [activeSources, setActiveSources] = useState<any[]>([])
  const [activeProcessingSummary, setActiveProcessingSummary] = useState<any>(null)
  const [activeFinalRecords, setActiveFinalRecords] = useState<any[]>([])
  const [userPreferences, setUserPreferences] = useState<any>(null)
  const [partialCount, setPartialCount] = useState<number>(0)

  // ── History state
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Pipeline control refs
  const cancelledRef = useRef(false)
  const lastFailedStageRef = useRef<string>('understanding')
  const inputRef = useRef<HTMLInputElement>(null)

  const canSend = (request.trim().length > 0 || Boolean(attachment)) && !isSubmitting
  const greeting = new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(new Date()).includes('PM')
    ? 'Good evening'
    : 'Good morning'

  // ─── Reset to Home ────────────────────────────────────────────────────────

  function resetToHome() {
    cancelledRef.current = true
    setView('home')
    setRequest('')
    setAttachment(null)
    setActiveCollection(null)
    setActiveResult(null)
    setActiveWorkflow(null)
    setActiveSources([])
    setActiveProcessingSummary(null)
    setActiveFinalRecords([])
    setPartialCount(0)
    setErrorMessage(null)
    setIsSubmitting(false)
  }

  // ─── Load Preferences Silently ───────────────────────────────────────────

  async function loadPreferences() {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data = await res.json()
        setUserPreferences(data.preferences || null)
        return data.profile?.name || name
      }
    } catch { /* silent */ }
    return name
  }

  // ─── Pipeline Runner (supports stage resumption) ──────────────────────────

  async function runPipeline(collectionId: string, inputQuery: string, fromStage = 'understanding') {
    setIsSubmitting(true)
    setErrorMessage(null)
    cancelledRef.current = false

    try {
      // Stage: Understand
      if (fromStage === 'understanding') {
        if (cancelledRef.current) return
        lastFailedStageRef.current = 'understanding'
        const undRes = await fetch(`/api/collections/${collectionId}/understand`, { method: 'POST' })
        const undData = await undRes.json().catch(() => ({}))
        if (!undRes.ok) throw new Error(undData.error || 'Understanding failed')
        if (cancelledRef.current) return
        setActiveCollection(c => c ? { ...c, status: undData.collection?.status || 'planning' } : null)
        setActiveResult(undData.result)
      }

      // Stage: Plan
      if (fromStage === 'understanding' || fromStage === 'planning') {
        if (cancelledRef.current) return
        lastFailedStageRef.current = 'planning'
        const planRes = await fetch(`/api/collections/${collectionId}/plan`, { method: 'POST' })
        const planData = await planRes.json().catch(() => ({}))
        if (!planRes.ok) throw new Error(planData.error || 'Workflow planning failed')
        if (cancelledRef.current) return
        setActiveCollection(c => c ? { ...c, status: planData.collection?.status || 'finding_sources' } : null)
        setActiveWorkflow(planData.plan || null)
      }

      // Stage: Discover sources
      if (fromStage === 'understanding' || fromStage === 'planning' || fromStage === 'finding_sources') {
        if (cancelledRef.current) return
        lastFailedStageRef.current = 'finding_sources'
        const discRes = await fetch(`/api/collections/${collectionId}/sources/discover`, { method: 'POST' })
        const discData = await discRes.json().catch(() => ({}))
        if (!discRes.ok) throw new Error(discData.error || 'Source discovery failed')
        if (cancelledRef.current) return
        setActiveCollection(c => c ? { ...c, status: discData.collection?.status || 'collecting' } : null)
        setActiveSources(discData.sources || [])
      }

      // Stage: Collect
      if (fromStage === 'understanding' || fromStage === 'planning' || fromStage === 'finding_sources' || fromStage === 'collecting') {
        if (cancelledRef.current) return
        lastFailedStageRef.current = 'collecting'
        const collectRes = await fetch(`/api/collections/${collectionId}/collect`, { method: 'POST' })
        const collectData = await collectRes.json().catch(() => ({}))
        if (!collectRes.ok) throw new Error(collectData.error || 'Data collection failed')
        if (cancelledRef.current) return
        setActiveCollection(c => c ? { ...c, status: 'cleaning' } : null)
      }

      // Stage: Process (Clean / Validate / Deduplicate)
      if (cancelledRef.current) return
      lastFailedStageRef.current = 'cleaning'
      const processRes = await fetch(`/api/collections/${collectionId}/process`, { method: 'POST' })
      const processData = await processRes.json().catch(() => ({}))
      if (!processRes.ok) throw new Error(processData.error || 'Data processing failed')
      if (cancelledRef.current) return

      // Load full sources and workflow
      const [sourcesRes, resultRes] = await Promise.all([
        fetch(`/api/collections/${collectionId}/sources`),
        fetch(`/api/collections/${collectionId}/result`),
      ])

      const sourcesData = sourcesRes.ok ? await sourcesRes.json() : {}
      const fullResultData = resultRes.ok ? await resultRes.json() : {}

      setActiveCollection({
        id: collectionId,
        original_input: inputQuery,
        status: 'completed',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      setActiveFinalRecords(processData.final_records || [])
      setActiveProcessingSummary(processData.summary || null)
      setActiveSources(sourcesData.sources || [])
      setActiveWorkflow(fullResultData.workflow || null)
      setRequest('')
      setAttachment(null)
      setResultInitialTab('results')
      setView('result')
    } catch (err: unknown) {
      if (cancelledRef.current) return
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setErrorMessage(msg)
      setActiveCollection(c => c ? { ...c, status: 'failed' } : null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Task Management: Cancel Active Collection ───────────────────────────

  async function cancelActiveCollection() {
    if (!activeCollection) return
    cancelledRef.current = true

    try {
      await fetch(`/api/collections/${activeCollection.id}/cancel`, { method: 'POST' })
      const recRes = await fetch(`/api/collections/${activeCollection.id}/records`)
      if (recRes.ok) {
        const rData = await recRes.json()
        const rawRecs = (rData.records || []).map((r: any) => ({
          ...r.record_data,
          _source_url: r.source_url,
          _source_name: r.source_name,
          _validation: r.status,
        }))
        setActiveFinalRecords(rawRecs)
        setPartialCount(rawRecs.length)
      }
    } catch { /* silent */ }

    setActiveCollection(c => c ? { ...c, status: 'cancelled' } : null)
    setIsSubmitting(false)
  }

  // ─── Task Management: Retry Failed Collection ─────────────────────────────

  async function retryFailedCollection() {
    if (!activeCollection) return
    const stageToRetry = lastFailedStageRef.current || 'understanding'
    await runPipeline(activeCollection.id, activeCollection.original_input, stageToRetry)
  }

  // ─── Task Management: View Partial Data ───────────────────────────────────

  function viewPartialData() {
    if (!activeCollection) return
    setView('result')
  }

  // ─── Submit pipeline ─────────────────────────────────────────────────────

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSend) return

    const inputQuery = request.trim() || attachment?.name || 'New Collection'

    setIsSubmitting(true)
    setErrorMessage(null)
    setActiveSources([])
    setActiveProcessingSummary(null)
    setActiveFinalRecords([])
    setActiveWorkflow(null)
    setPartialCount(0)

    // Switch to processing screen
    setView('processing')
    loadPreferences()

    try {
      const colRes = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_input: inputQuery,
          input_type: attachment ? 'file' : 'text',
          title: inputQuery.slice(0, 60),
        }),
      })

      if (!colRes.ok) {
        const errData = await colRes.json().catch(() => ({}))
        if (colRes.status === 401) throw new Error('Please sign in to use FetchIT.')
        throw new Error(errData.error || 'Failed to create collection')
      }

      const { collection } = await colRes.json()
      setActiveCollection({
        id: collection.id,
        original_input: inputQuery,
        status: 'understanding',
        created_at: collection.created_at,
      })

      await runPipeline(collection.id, inputQuery, 'understanding')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start collection.'
      setErrorMessage(msg)
      setActiveCollection(c => c ? { ...c, status: 'failed' } : null)
      setIsSubmitting(false)
    }
  }

  // ─── History ────────────────────────────────────────────────────────────

  async function openHistory() {
    setMenuOpen(false)
    setHistoryLoading(true)
    setView('history')
    try {
      const res = await fetch('/api/collections')
      if (res.ok) {
        const data = await res.json()
        setHistoryItems(data.collections || [])
      }
    } catch { /* silent */ }
    setHistoryLoading(false)
  }

  async function openHistoryItem(item: any, tab: 'results' | 'workflow' = 'results') {
    setView('history')
    try {
      const [resultRes, sourcesRes] = await Promise.all([
        fetch(`/api/collections/${item.id}/result`),
        fetch(`/api/collections/${item.id}/sources`),
      ])

      const resultData = resultRes.ok ? await resultRes.json() : {}
      const sourcesData = sourcesRes.ok ? await sourcesRes.json() : {}

      setActiveCollection({
        id: item.id,
        original_input: item.original_input,
        status: item.status,
        created_at: item.created_at,
        completed_at: item.completed_at,
      })

      setActiveResult({
        understood_requirement: resultData.understood_requirement || null,
        result_data: resultData.result_data || null,
        processing_summary: resultData.processing_summary || null,
        final_answer: resultData.final_answer || null,
      })

      setActiveWorkflow(resultData.workflow || null)

      const rd = resultData.result_data as any
      setActiveFinalRecords(rd?.records || [])
      setActiveProcessingSummary(rd?.summary || null)
      setActiveSources(sourcesData.sources || resultData.sources || [])

      await loadPreferences()
      setResultInitialTab(tab)
      setView('result')
    } catch {
      setErrorMessage('Failed to load collection. Please try again.')
      setView('history')
    }
  }

  // ─── Safe Re-Run From Previous Workflow ───────────────────────────────────

  function runAgainHistoryItem(item: any) {
    // Populates original input and returns to home for user confirmation/submission
    setRequest(item.original_input)
    setView('home')
  }

  // ─── Menu ────────────────────────────────────────────────────────────────

  async function handleMenuItem(item: string) {
    setMenuOpen(false)
    if (item === 'Sign Out') {
      try { await authClient.signOut() } catch { /* ignore */ }
      window.location.reload()
    } else if (item === '+ New Collection') {
      resetToHome()
    } else if (item === 'History') {
      await openHistory()
    }
  }

  function toggleListening() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setListening(false)
      return
    }
    setListening(v => !v)
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <main className="main-screen">
      {/* ── TOP BAR (shown on home, processing, and history) ── */}
      {view !== 'result' && (
        <header className="main-topbar">
          <button className="icon-button" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <span className="hamburger" aria-hidden="true"><i /><i /><i /></span>
          </button>
          {view !== 'processing' && (
            <button className="new-collection-button" type="button" onClick={resetToHome}>+ New</button>
          )}
          {view === 'processing' && activeCollection && (
            <span className="processing-topbar-label">
              {activeCollection.status === 'cancelled'
                ? 'Cancelled'
                : activeCollection.status === 'failed'
                ? 'Issue detected'
                : 'Processing…'}
            </span>
          )}
        </header>
      )}

      {/* ── HOME SCREEN (Unchanged, 100% preserved) ── */}
      {view === 'home' && (
        <section className="ask-content" aria-labelledby="ask-title">
          <p className="time-greeting">{greeting}, {name}</p>
          <h1 id="ask-title">What do you want to find?</h1>
          <p className="ask-helper">Ask anything</p>

          <form className={`request-box ${listening ? 'is-listening' : ''}`} onSubmit={submit}>
            {attachment && (
              <div className="attachment-chip">
                <span aria-hidden="true">📎</span>
                <span>{attachment.name}</span>
                <button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)}>×</button>
              </div>
            )}
            <textarea
              value={request}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRequest(e.target.value)}
              placeholder="Type what you're looking for..."
              aria-label="Your information request"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="request-actions">
              <input ref={inputRef} type="file" hidden accept="image/*,.pdf,.doc,.docx,.txt,audio/*,video/*" onChange={(e: ChangeEvent<HTMLInputElement>) => setAttachment(e.target.files?.[0] ?? null)} />
              <button type="button" className="request-icon" aria-label="Attach a file" onClick={() => inputRef.current?.click()} disabled={isSubmitting}>+</button>
              <button
                type="button"
                className={`request-icon ${listening ? 'active' : ''}`}
                aria-label={listening ? 'Stop listening' : 'Start voice input'}
                onClick={toggleListening}
                disabled={isSubmitting}
              >
                {listening ? '●' : '⌕'}
              </button>
              <button className="send-button" type="submit" disabled={!canSend} aria-label="Send request">
                {isSubmitting ? '…' : '→'}
              </button>
            </div>
            {listening && <span className="listening-label" role="status">Listening… tap the microphone to stop</span>}
          </form>
        </section>
      )}

      {/* ── PROCESSING SCREEN (With task management: Cancel & Retry) ── */}
      {view === 'processing' && activeCollection && (
        <div className="processing-container">
          <ProcessingScreen
            status={activeCollection.status}
            originalInput={activeCollection.original_input}
            errorMessage={errorMessage}
            partialCount={partialCount}
            onCancel={cancelActiveCollection}
            onRetry={retryFailedCollection}
            onStartNew={resetToHome}
            onViewPartial={viewPartialData}
          />
        </div>
      )}

      {/* ── RESULT SCREEN (Centralized interactive dashboard) ── */}
      {view === 'result' && activeCollection && (
        <ResultScreen
          collection={activeCollection}
          result={activeResult}
          workflow={activeWorkflow}
          processingSummary={activeProcessingSummary}
          finalRecords={activeFinalRecords}
          sources={activeSources}
          preferences={userPreferences}
          initialTab={resultInitialTab}
          onNewCollection={resetToHome}
          onRunAgain={() => runAgainHistoryItem(activeCollection)}
        />
      )}

      {/* ── HISTORY SCREEN ── */}
      {view === 'history' && (
        <HistoryScreen
          items={historyItems}
          onOpen={openHistoryItem}
          onRunAgain={runAgainHistoryItem}
          onClose={() => setView('home')}
          loading={historyLoading}
        />
      )}

      {/* ── MENU DRAWER ── */}
      {menuOpen && (
        <>
          <button className="drawer-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="menu-drawer" aria-label="FetchIT menu">
            <div className="drawer-header">
              <strong>FetchIT</strong>
              <button className="icon-button" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <nav>
              {['+ New Collection', 'History', 'Saved Documents', 'Charts & Insights', 'How FetchIT Works', 'Settings', 'Help & Feedback', 'Sign Out'].map(item => (
                <button key={item} type="button" onClick={() => handleMenuItem(item)}>{item}</button>
              ))}
            </nav>
          </aside>
        </>
      )}
    </main>
  )
}
