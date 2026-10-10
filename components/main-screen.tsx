'use client'

import { ChangeEvent, FormEvent, useRef, useState, useEffect } from 'react'
import { authClient } from '@/lib/auth/client'
import { apiFetch } from '@/lib/api-fetch'
import { ProcessingScreen } from './processing-screen'
import { ResultScreen } from './result-screen'
import { HistoryScreen } from './history-screen'
import { DemoProcessingScreen } from './demo/demo-processing-screen'
import { RhythmaResultScreen } from './demo/rhythma-result-screen'
import { SavedDocumentsScreen } from './saved-documents-screen'
import { ChartsScreen } from './charts-screen'
import { SettingsScreen } from './settings-screen'
import { HelpFeedbackScreen } from './help-feedback-screen'
import { HowItWorksModal } from './how-it-works-modal'
import { useLanguage } from '@/lib/i18n'

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

type AppView =
  | 'home'
  | 'processing'
  | 'result'
  | 'history'
  | 'saved-docs'
  | 'charts'
  | 'settings'
  | 'help'
  | 'demo-processing'
  | 'demo-result'

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export function MainScreen({ name = 'User' }: { name?: string }) {
  const { t, language } = useLanguage()

  // ── UI state
  const [view, setView] = useState<AppView>('home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [request, setRequest] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [listening, setListening] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resultInitialTab, setResultInitialTab] = useState<'results' | 'workflow'>('results')
  const recognitionRef = useRef<any>(null)

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

  // ── Demo state (demo-video branch)
  const [demoQuery, setDemoQuery] = useState('')
  const [demoCompleted, setDemoCompleted] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('fetchit_demo_rhythma') === 'true') {
        setDemoCompleted(true)
      }
    } catch { /* silent */ }
  }, [])

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
      const res = await apiFetch('/api/profile')
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
        const undRes = await apiFetch(`/api/collections/${collectionId}/understand`, { method: 'POST' })
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
        const planRes = await apiFetch(`/api/collections/${collectionId}/plan`, { method: 'POST' })
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
        const discRes = await apiFetch(`/api/collections/${collectionId}/sources/discover`, { method: 'POST' })
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
        const collectRes = await apiFetch(`/api/collections/${collectionId}/collect`, { method: 'POST' })
        const collectData = await collectRes.json().catch(() => ({}))
        if (!collectRes.ok) throw new Error(collectData.error || 'Data collection failed')
        if (cancelledRef.current) return
        setActiveCollection(c => c ? { ...c, status: 'cleaning' } : null)
      }

      // Stage: Process (Clean / Validate / Deduplicate)
      if (cancelledRef.current) return
      lastFailedStageRef.current = 'cleaning'
      const processRes = await apiFetch(`/api/collections/${collectionId}/process`, { method: 'POST' })
      const processData = await processRes.json().catch(() => ({}))
      if (!processRes.ok) throw new Error(processData.error || 'Data processing failed')
      if (cancelledRef.current) return

      // Load full sources and workflow
      const [sourcesRes, resultRes] = await Promise.all([
        apiFetch(`/api/collections/${collectionId}/sources`),
        apiFetch(`/api/collections/${collectionId}/result`),
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
      await apiFetch(`/api/collections/${activeCollection.id}/cancel`, { method: 'POST' })
      const recRes = await apiFetch(`/api/collections/${activeCollection.id}/records`)
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

  // ─── Demo Completion Handler ─────────────────────────────────────────────

  function handleDemoComplete() {
    setDemoCompleted(true)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fetchit_demo_rhythma', 'true')
      }
    } catch { /* silent */ }
    setView('demo-result')
  }

  // ─── Submit pipeline ─────────────────────────────────────────────────────

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSend) return

    const inputQuery = request.trim() || attachment?.name || 'New Collection'

    // Detect Rhythma demo request
    const norm = inputQuery.toLowerCase()
    const isRhythmaDemo =
      norm.includes('rhythma') ||
      norm.includes('ishita2740/rhythma') ||
      norm.includes('maine ek github repo')

    if (isRhythmaDemo) {
      setDemoQuery(inputQuery)
      setView('demo-processing')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setActiveSources([])
    setActiveProcessingSummary(null)
    setActiveFinalRecords([])
    setActiveWorkflow(null)
    setPartialCount(0)

    // Set a preliminary activeCollection so the processing screen renders immediately
    setActiveCollection({
      id: 'pending',
      original_input: inputQuery,
      status: 'understanding',
      created_at: new Date().toISOString(),
    })

    // Switch to processing screen
    setView('processing')
    loadPreferences()

    // ── ATTACHMENT PIPELINE (Image or Document) ──
    if (attachment) {
      try {
        const isImage = attachment.type.startsWith('image/')

        const colRes = await apiFetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_input: inputQuery,
            input_type: 'file',
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
          status: 'collecting',
          created_at: collection.created_at,
        })

        if (isImage) {
          const formData = new FormData()
          formData.append('file', attachment)
          formData.append('prompt', inputQuery)

          const imgRes = await apiFetch('/api/analyze-image', {
            method: 'POST',
            body: formData,
          })

          if (!imgRes.ok) {
            const err = await imgRes.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to analyze image with vision model')
          }

          const imgData = await imgRes.json()
          const analysis = imgData.analysis || {}
          const records = analysis.records || []
          const fields = analysis.fields || (records.length > 0 ? Object.keys(records[0]) : [])

          const summary = {
            raw_records: records.length,
            valid_records: records.length,
            duplicates_removed: 0,
            final_count: records.length,
          }

          setActiveFinalRecords(records)
          setActiveProcessingSummary(summary)
          setActiveResult({
            understood_requirement: `Extracted data from image "${attachment.name}"`,
            processing_summary: analysis.summary || 'Vision AI extraction completed successfully.',
            result_data: { records, fields, summary },
            final_answer: analysis.summary || null,
          })

          // Save to collection_results
          apiFetch(`/api/collections/${collection.id}/result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              understood_requirement: `Extracted data from image "${attachment.name}"`,
              processing_summary: JSON.stringify(summary),
              result_data: { records, fields, summary },
              final_answer: analysis.summary || null,
            }),
          }).catch(() => {})

          setIsSubmitting(false)
          setView('result')
          return
        } else {
          // Document upload & text extraction
          const formData = new FormData()
          formData.append('file', attachment)
          formData.append('collection_id', collection.id)

          const upRes = await apiFetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!upRes.ok) {
            const err = await upRes.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to upload document')
          }

          const upData = await upRes.json()
          const fileId = upData.file?.id

          const docRes = await apiFetch('/api/analyze-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_id: fileId,
              prompt: inputQuery,
            }),
          })

          if (!docRes.ok) {
            const err = await docRes.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to extract information from document')
          }

          const docData = await docRes.json()
          const analysis = docData.analysis || {}
          const records = analysis.records || []
          const fields = analysis.fields || (records.length > 0 ? Object.keys(records[0]) : [])

          const summary = {
            raw_records: records.length,
            valid_records: records.length,
            duplicates_removed: 0,
            final_count: records.length,
          }

          setActiveFinalRecords(records)
          setActiveProcessingSummary(summary)
          setActiveResult({
            understood_requirement: `Extracted data from document "${attachment.name}"`,
            processing_summary: analysis.summary || 'Document processing and entity extraction completed.',
            result_data: { records, fields, summary },
            final_answer: analysis.summary || null,
          })

          // Save to collection_results
          apiFetch(`/api/collections/${collection.id}/result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              understood_requirement: `Extracted data from document "${attachment.name}"`,
              processing_summary: JSON.stringify(summary),
              result_data: { records, fields, summary },
              final_answer: analysis.summary || null,
            }),
          }).catch(() => {})

          setIsSubmitting(false)
          setView('result')
          return
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to process file.'
        setErrorMessage(msg)
        setActiveCollection(c => c ? { ...c, status: 'failed' } : { id: 'error', original_input: inputQuery, status: 'failed', created_at: new Date().toISOString() })
        setIsSubmitting(false)
        return
      }
    }

    // ── STANDARD WEB PIPELINE ──
    try {
      const colRes = await apiFetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_input: inputQuery,
          input_type: 'text',
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
      // Ensure activeCollection is never null so the processing screen can show the error
      setActiveCollection(c => c ? { ...c, status: 'failed' } : { id: 'error', original_input: inputQuery, status: 'failed', created_at: new Date().toISOString() })
      setIsSubmitting(false)
    }
  }

  // ─── History ────────────────────────────────────────────────────────────

  async function openHistory() {
    setMenuOpen(false)
    setHistoryLoading(true)
    setView('history')
    try {
      const res = await apiFetch('/api/collections')
      let list: any[] = []
      if (res.ok) {
        const data = await res.json()
        list = data.collections || []
      }
      const hasDemo = demoCompleted || (typeof window !== 'undefined' && localStorage.getItem('fetchit_demo_rhythma') === 'true')
      if (hasDemo) {
        const demoItem = {
          id: 'demo-rhythma',
          title: "Rhythma — Women’s Health Product & Market Intelligence",
          original_input: demoQuery || "Maine ek github repo ki link provide ki hai. ye mera startup hai rhythma. i want a detailed documentation in professional format no charts no images inside the pdf of rhythma jisme problem solution aur baki usp tech stack and jo bhi kuch important hai as per what you think vo ho. compare karo exisitng apps se and table generate karo comparison ka chrts do insights do kya imporve kar sakte hai kya already aacha hia sab batao\nhttps://github.com/ishita2740/Rhythma",
          status: 'completed',
          created_at: new Date().toISOString(),
          record_count: 6,
          isDemo: true,
        }
        list = [demoItem, ...list.filter(x => x.id !== 'demo-rhythma')]
      }
      setHistoryItems(list)
    } catch { /* silent */ }
    setHistoryLoading(false)
  }

  async function openHistoryItem(item: any, tab: 'results' | 'workflow' = 'results') {
    if (item.id === 'demo-rhythma' || item.isDemo) {
      setView('demo-result')
      return
    }
    setView('history')
    try {
      const [resultRes, sourcesRes] = await Promise.all([
        apiFetch(`/api/collections/${item.id}/result`),
        apiFetch(`/api/collections/${item.id}/sources`),
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
    if (item.id === 'demo-rhythma' || item.isDemo) {
      setRequest(item.original_input)
      setView('home')
      return
    }
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
    } else if (item === 'Saved Documents') {
      setView('saved-docs')
    } else if (item === 'Charts & Insights') {
      setView('charts')
    } else if (item === 'How FetchIT Works') {
      setShowHowItWorks(true)
    } else if (item === 'Settings') {
      setView('settings')
    } else if (item === 'Help & Feedback') {
      setView('help')
    }
  }

  function toggleListening() {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null

    if (!SpeechRecognition) {
      alert(t('main_mic_unavailable') || 'Microphone not available in this browser. Please use Chrome, Edge, or Safari.')
      setListening(false)
      return
    }

    if (listening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
      setListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang =
        language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : language === 'ta' ? 'ta-IN' : 'en-IN'

      recognition.onstart = () => {
        setListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('')
        if (transcript) {
          setRequest(transcript)
        }
      }

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error)
        setListening(false)
      }

      recognition.onend = () => {
        setListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error('Speech recognition start error:', err)
      setListening(false)
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <main className="main-screen">
      {/* ── TOP BAR (shown on home, processing, and history) ── */}
      {view !== 'result' && view !== 'demo-result' && view !== 'saved-docs' && view !== 'charts' && view !== 'settings' && view !== 'help' && (
        <header className="main-topbar">
          <button className="icon-button" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <span className="hamburger" aria-hidden="true"><i /><i /><i /></span>
          </button>
          {view !== 'processing' && view !== 'demo-processing' && (
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
          {view === 'demo-processing' && (
            <span className="processing-topbar-label">
              Processing…
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
                <span style={{ fontSize: 11, opacity: 0.75, marginLeft: 4 }}>
                  ({(attachment.size / 1024).toFixed(0)} KB)
                </span>
                <button type="button" aria-label="Remove attachment" onClick={() => setAttachment(null)}>×</button>
              </div>
            )}
            <textarea
              value={request}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRequest(e.target.value)}
              placeholder={listening ? t('main_placeholder_listening') : t('main_placeholder')}
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

          {/* Quick Agent Showcase Suggestions */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Suggested Research Workflows:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                style={{
                  fontSize: 12,
                  padding: '7px 14px',
                  borderRadius: 20,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={() => setRequest("Find 20 AI startups in India and create a structured dataset containing the company name, headquarters, primary AI application, founder names where reliably available, official website, and supporting source URLs.")}
              >
                <span>🇮🇳</span>
                <span><strong>AI Startups in India:</strong> 20 companies, founders, HQ, AI applications & verified URLs</span>
              </button>
              <button
                type="button"
                style={{
                  fontSize: 12,
                  padding: '7px 14px',
                  borderRadius: 20,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={() => setRequest("Find the top solar power plants in India with state, capacity in MW, operational status, and developers.")}
              >
                <span>☀️</span>
                <span><strong>Solar Energy Projects:</strong> Major plants, capacity (MW), states & developers</span>
              </button>
            </div>
          </div>
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

      {/* ── DEMO PROCESSING SCREEN (Rhythma Demo) ── */}
      {view === 'demo-processing' && (
        <div className="processing-container">
          <DemoProcessingScreen
            originalInput={demoQuery || request}
            onComplete={handleDemoComplete}
          />
        </div>
      )}

      {/* ── DEMO RESULT SCREEN (Rhythma Demo) ── */}
      {view === 'demo-result' && (
        <RhythmaResultScreen onNewCollection={resetToHome} />
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

      {/* ── SAVED DOCUMENTS SCREEN ── */}
      {view === 'saved-docs' && (
        <SavedDocumentsScreen
          onClose={() => setView('home')}
          onOpenCollection={(colId) => openHistoryItem({ id: colId })}
        />
      )}

      {/* ── CHARTS & INSIGHTS SCREEN ── */}
      {view === 'charts' && (
        <ChartsScreen
          onClose={() => setView('home')}
          onOpenCollection={(colId) => openHistoryItem({ id: colId })}
        />
      )}

      {/* ── SETTINGS SCREEN ── */}
      {view === 'settings' && (
        <SettingsScreen
          onClose={() => setView('home')}
          onSignOut={async () => {
            try { await authClient.signOut() } catch { /* ignore */ }
            window.location.reload()
          }}
        />
      )}

      {/* ── HELP & FEEDBACK SCREEN ── */}
      {view === 'help' && (
        <HelpFeedbackScreen onClose={() => setView('home')} />
      )}

      {/* ── HOW IT WORKS MODAL ── */}
      {showHowItWorks && (
        <HowItWorksModal onClose={() => setShowHowItWorks(false)} />
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
