'use client'

import { useState } from 'react'
import { RHYTHMA_DEMO_DATA } from './rhythma-data'
import { generateRhythmaPdfHtml } from './rhythma-pdf-report'

interface RhythmaResultScreenProps {
  onNewCollection: () => void
}

export function RhythmaResultScreen({ onNewCollection }: RhythmaResultScreenProps) {
  const d = RHYTHMA_DEMO_DATA
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'charts' | 'insights' | 'roadmap'>('overview')
  const [tableSearch, setTableSearch] = useState('')

  const handleDownloadReport = () => {
    // Generate clean executive HTML and open in print window
    const html = generateRhythmaPdfHtml()
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const printWin = window.open(url + '?print=true', '_blank')
    if (printWin) {
      setDownloadSuccess(true)
    } else {
      // Fallback: direct download link if popup blocked
      const a = document.createElement('a')
      a.href = url
      a.download = 'Rhythma-Executive-Research-Report.html'
      a.click()
      setDownloadSuccess(true)
    }

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 15000)
  }

  const filteredComparisonRows = d.comparisonTable.filter(
    (row) =>
      row.feature.toLowerCase().includes(tableSearch.toLowerCase()) ||
      row.rhythma.toLowerCase().includes(tableSearch.toLowerCase()) ||
      row.flo.toLowerCase().includes(tableSearch.toLowerCase())
  )

  return (
    <div className="result-screen rhythma-result-dashboard" style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* ── TOP STICKY BAR ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f766e', letterSpacing: '-0.025em' }}>FetchIT</span>
            <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#ccfbf1', color: '#0f766e', fontWeight: 600 }}>
              Market Intelligence
            </span>
          </div>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Rhythma Project Dossier</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onNewCollection}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + New Collection
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1.5rem 4rem 1.5rem' }}>
        {/* DOWNLOAD SUCCESS ALERT */}
        {downloadSuccess && (
          <div
            role="status"
            style={{
              marginBottom: '1.5rem',
              padding: '0.9rem 1.25rem',
              borderRadius: '8px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>✓</span>
              <span style={{ fontWeight: 600 }}>Your Rhythma Research Report has been downloaded successfully.</span>
            </div>
            <button
              onClick={() => setDownloadSuccess(false)}
              style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '1rem' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── SECTION 2: HEADER ── */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '2rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0f766e' }}>
              Research Dossier
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Updated {d.header.metadata.generatedDate}</span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0', letterSpacing: '-0.03em' }}>
            {d.header.title}
          </h1>

          <div style={{ fontSize: '1.35rem', fontWeight: 600, color: '#0f766e', marginBottom: '0.75rem' }}>
            {d.header.tagline}
          </div>

          <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: '1.6', margin: '0 0 1.5rem 0', maxWidth: '850px' }}>
            {d.header.subtitle}
          </p>

          {/* Small metadata badges */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
              padding: '1rem',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #edf2f7',
            }}
          >
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                Research Type
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{d.header.metadata.researchType}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                Domain
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>{d.header.metadata.domain}</span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                Repository
              </span>
              <a
                href={d.header.metadata.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0284c7', textDecoration: 'underline' }}
              >
                {d.header.metadata.repository} ↗
              </a>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>
                Research Output
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f766e' }}>{d.header.metadata.researchOutput}</span>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: AI EXPLAINABILITY & SECTION 4: PERSONALIZATION ── */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Transparency & Explainability
            </span>
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            {d.aiExplainability.heading}
          </h2>

          <p style={{ fontSize: '0.975rem', color: '#475569', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            &ldquo;{d.aiExplainability.lead}&rdquo;
          </p>

          {/* 4 Interpreted Objectives */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            {d.aiExplainability.objectives.map((obj) => (
              <div
                key={obj.number}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f766e', marginBottom: '0.25rem' }}>
                  {obj.number}
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.35rem 0' }}>
                  {obj.title}
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: '1.45', margin: 0 }}>
                  {obj.description}
                </p>
              </div>
            ))}
          </div>

          {/* Section 4: Personalized for your request */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              background: '#f0fdfa',
              border: '1px solid #ccfbf1',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e', letterSpacing: '0.05em' }}>
                {d.aiExplainability.personalization.heading}
              </span>
            </div>

            <p style={{ fontSize: '0.925rem', fontWeight: 600, color: '#134e4a', margin: '0 0 0.4rem 0' }}>
              &ldquo;{d.aiExplainability.personalization.lead}&rdquo;
            </p>

            <p style={{ fontSize: '0.85rem', color: '#0f766e', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
              {d.aiExplainability.personalization.details}
            </p>

            {/* Clear Visual Flow Diagram */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #99f6e4',
              }}
            >
              <div style={{ flex: '1', minWidth: '180px', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #99f6e4' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f766e' }}>USER PREFERENCE</span>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.2rem 0 0 0' }}>Requested deep documentation, comparison table, charts & insights</p>
              </div>

              <div style={{ color: '#0f766e', fontWeight: 800, fontSize: '1.1rem' }}>↓</div>

              <div style={{ flex: '1', minWidth: '180px', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #99f6e4' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f766e' }}>AI INTERPRETATION</span>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.2rem 0 0 0' }}>Expanded analytical scope, competitor benchmarking & clinical review</p>
              </div>

              <div style={{ color: '#0f766e', fontWeight: 800, fontSize: '1.1rem' }}>↓</div>

              <div style={{ flex: '1', minWidth: '180px', background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid #99f6e4' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0f766e' }}>PERSONALIZED OUTPUT</span>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.2rem 0 0 0' }}>Comprehensive multi-section dossier with charts & clean PDF export</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── NAVIGATION TABS ── */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '2px solid #e2e8f0',
            marginBottom: '1.5rem',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'overview', label: '1. Product Definition & Tech' },
            { id: 'comparison', label: '2. Competitor Benchmark' },
            { id: 'charts', label: '3. Data-Driven Charts' },
            { id: 'insights', label: '4. Key Insights' },
            { id: 'roadmap', label: '5. What to Improve & Roadmap' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.9rem',
                color: activeTab === tab.id ? '#0f766e' : '#64748b',
                borderBottom: activeTab === tab.id ? '2px solid #0f766e' : '2px solid transparent',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: OVERVIEW & TECH STACK ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* SECTION 5: RHYTHMA AT A GLANCE */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Rhythma at a Glance
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: '#0f766e', marginBottom: '0.35rem' }}>
                    What is Rhythma?
                  </strong>
                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                    {d.glance.whatIs}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: '#0f766e', marginBottom: '0.35rem' }}>
                    Problem it Addresses
                  </strong>
                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                    {d.glance.problemAddressed}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: '#0f766e', marginBottom: '0.35rem' }}>
                    Target Users
                  </strong>
                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                    {d.glance.targetUsers}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: '#0f766e', marginBottom: '0.35rem' }}>
                    Proposed Solution
                  </strong>
                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                    {d.glance.proposedSolution}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: '#0f766e', marginBottom: '0.35rem' }}>
                    Core Capabilities
                  </strong>
                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                    {d.glance.coreCapabilities}
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: '#0f766e', marginBottom: '0.35rem' }}>
                    Current Status & Direction
                  </strong>
                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                    {d.glance.currentStatus}
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 6: THE PROBLEM RHYTHMA ADDRESSES */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
                {d.problem.title}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {d.problem.points.map((pt, idx) => (
                  <div key={idx} style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #edf2f7', background: '#ffffff' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b91c1c', marginBottom: '0.35rem' }}>
                      • {pt.title}
                    </div>
                    <p style={{ fontSize: '0.825rem', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                      {pt.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 7: RHYTHMA'S SOLUTION */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                {d.solution.title}
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '1.25rem' }}>
                {d.solution.description}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {d.solution.pillars.map((pil, idx) => (
                  <div key={idx} style={{ padding: '1rem', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534', marginBottom: '0.35rem' }}>
                      ✓ {pil.title}
                    </div>
                    <p style={{ fontSize: '0.825rem', color: '#1e3a2f', lineHeight: '1.45', margin: 0 }}>
                      {pil.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 8: RHYTHMA'S DIFFERENTIATION */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                {d.differentiation.title}
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '1.25rem' }}>
                {d.differentiation.lead}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {d.differentiation.differentiators.map((diff, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 1.2fr) 2fr 2fr',
                      gap: '1rem',
                      padding: '1rem',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {diff.area}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#065f46', background: '#ecfdf5', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: '#047857' }}>Rhythma Approach</strong>
                      {diff.rhythmaApproach}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', background: '#ffffff', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8' }}>Industry Standard</strong>
                      {diff.industryStandard}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 9: TECHNOLOGY STACK */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Technology Stack Architecture
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {d.techStack.map((cat, idx) => (
                  <div key={idx} style={{ padding: '1.1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fafafa' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f766e', margin: '0 0 0.75rem 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.35rem' }}>
                      {cat.category}
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {cat.technologies.map((t, tidx) => (
                        <li key={tidx} style={{ fontSize: '0.825rem', color: '#334155' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{t.name}: </span>
                          <span style={{ color: '#64748b' }}>{t.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 2: COMPETITOR COMPARISON ── */}
        {activeTab === 'comparison' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* SECTION 10: COMPETITIVE LANDSCAPE PROFILES */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                {d.competitiveLandscape.title}
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '1.25rem' }}>
                {d.competitiveLandscape.lead}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {d.competitiveLandscape.competitors.map((comp) => (
                  <div key={comp.name} style={{ padding: '1.1rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{comp.name}</strong>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569', fontWeight: 600 }}>
                        {comp.position}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {comp.primaryFocus}
                    </div>
                    <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: '1.45', margin: 0 }}>
                      {comp.profile}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 11: COMPETITOR COMPARISON TABLE */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem 0' }}>
                    Competitor Comparison Table
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    15 source-backed evaluation dimensions across global and Indian applications
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Filter features or apps…"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    width: '220px',
                  }}
                />
              </div>

              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                      <th style={{ padding: '0.75rem', fontWeight: 700, color: '#1e293b', minWidth: '150px' }}>Feature / Capability</th>
                      <th style={{ padding: '0.75rem', fontWeight: 700, color: '#0f766e', background: '#ccfbf1', minWidth: '180px' }}>Rhythma (Target)</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600, color: '#334155', minWidth: '160px' }}>Flo</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600, color: '#334155', minWidth: '160px' }}>Clue</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600, color: '#334155', minWidth: '150px' }}>Maya</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600, color: '#334155', minWidth: '150px' }}>Naree</th>
                      <th style={{ padding: '0.75rem', fontWeight: 600, color: '#334155', minWidth: '160px' }}>HealCycle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComparisonRows.map((row, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{row.feature}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: '#0f766e', background: '#f0fdfa' }}>{row.rhythma}</td>
                        <td style={{ padding: '0.75rem', color: row.flo === 'Not publicly documented' ? '#94a3b8' : '#334155' }}>{row.flo}</td>
                        <td style={{ padding: '0.75rem', color: row.clue === 'Not publicly documented' ? '#94a3b8' : '#334155' }}>{row.clue}</td>
                        <td style={{ padding: '0.75rem', color: row.maya === 'Not publicly documented' ? '#94a3b8' : '#334155' }}>{row.maya}</td>
                        <td style={{ padding: '0.75rem', color: row.naree === 'Not publicly documented' ? '#94a3b8' : '#334155' }}>{row.naree}</td>
                        <td style={{ padding: '0.75rem', color: row.healcycle === 'Not publicly documented' ? '#94a3b8' : '#334155' }}>{row.healcycle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 3: CHARTS ── */}
        {activeTab === 'charts' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem' }}>
            {/* CHART 1 */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Chart 1</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0.35rem 0' }}>
                Documented Feature Coverage Across Competitors
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {d.charts[0].description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {d.charts[0].data.map((item: any) => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: item.label === 'Rhythma' ? 700 : 500, color: item.label === 'Rhythma' ? '#0f766e' : '#334155' }}>
                        {item.label}
                      </span>
                      <span style={{ fontWeight: 600, color: '#475569' }}>{item.score}%</span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.score}%`,
                          background: item.label === 'Rhythma' ? '#0f766e' : '#94a3b8',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CHART 2 */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Chart 2</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0.35rem 0' }}>
                AI & Personalization Capabilities
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {d.charts[1].description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {d.charts[1].data.map((item: any) => (
                  <div key={item.name} style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                      <strong style={{ color: item.name === 'Rhythma' ? '#0f766e' : '#1e293b' }}>{item.name}</strong>
                      <span style={{ fontWeight: 700, color: item.name === 'Rhythma' ? '#0f766e' : '#64748b' }}>Score: {item.score}/100</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                      <strong>AI Assistant:</strong> {item.llmAssistant}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      <strong>Risk Model:</strong> {item.riskModeling}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CHART 3 */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Chart 3</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0.35rem 0' }}>
                Language / Accessibility Comparison
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {d.charts[2].description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {d.charts[2].data.map((item: any) => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: item.label === 'Rhythma' ? 700 : 500, color: item.label === 'Rhythma' ? '#0f766e' : '#334155' }}>
                        {item.label}
                      </span>
                      <span style={{ fontWeight: 600, color: '#475569' }}>{item.indianLanguages} Indian Languages</span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.score}%`,
                          background: item.label === 'Rhythma' ? '#0f766e' : '#94a3b8',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CHART 4 */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Chart 4</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0.35rem 0' }}>
                Privacy & User-Control Features
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {d.charts[3].description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {d.charts[3].data.map((item: any) => (
                  <div key={item.entity} style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <strong style={{ color: item.entity === 'Rhythma' ? '#0f766e' : '#1e293b' }}>{item.entity}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>On-Device ML: {item.onDeviceML}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>Zero-Cloud Needed: <strong>{item.noCloudRequired}%</strong></span>
                      <span>•</span>
                      <span>Consent Logs: <strong>{item.doctorConsentLogs}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CHART 5 */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Chart 5</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0.35rem 0' }}>
                Healthcare Connectivity
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {d.charts[4].description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {d.charts[4].data.map((item: any) => (
                  <div key={item.app} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: item.app === 'Rhythma' ? '#0f766e' : '#1e293b' }}>{item.app}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.clinicalLevel}</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: item.app === 'Rhythma' ? '#0f766e' : '#475569' }}>
                      {item.rating}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CHART 6 */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Chart 6</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0 0.35rem 0' }}>
                India-Relevance / Local Accessibility
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {d.charts[5].description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {d.charts[5].data.map((item: any) => (
                  <div key={item.platform}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: item.platform === 'Rhythma' ? 700 : 500, color: item.platform === 'Rhythma' ? '#0f766e' : '#334155' }}>
                        {item.platform}
                      </span>
                      <span style={{ fontWeight: 600, color: '#475569' }}>{item.index} / 100</span>
                    </div>
                    <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${item.index}%`,
                          background: item.platform === 'Rhythma' ? '#0f766e' : '#94a3b8',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.suitability}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: KEY INSIGHTS ── */}
        {activeTab === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1.25rem 0' }}>
                Key Strategic Insights
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {d.keyInsights.map((ins) => (
                  <div key={ins.number} style={{ padding: '1.25rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {ins.number}
                      </span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {ins.title}
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                      {ins.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 5: ROADMAP & WHAT TO IMPROVE ── */}
        {activeTab === 'roadmap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* SECTION 14: ALREADY ACHIEVED */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
                What Rhythma Has Already Achieved
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#166534', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>✓</span> Implemented Capabilities (Verified in Code)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {d.alreadyAchieved.implemented.map((imp, idx) => (
                      <div key={idx} style={{ padding: '0.75rem', borderRadius: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: '#14532d' }}>{imp.feature}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#166534' }}>{imp.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>⏳</span> Planned / Work-in-Progress Scope
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {d.alreadyAchieved.planned.map((pl, idx) => (
                      <div key={idx} style={{ padding: '0.75rem', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <strong style={{ display: 'block', fontSize: '0.85rem', color: '#78350f' }}>{pl.feature}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#92400e' }}>{pl.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 15: WHERE RHYTHMA CAN IMPROVE */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
                Where Rhythma Can Improve
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    High Priority (Immediate Impact)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {d.whatToImprove.highPriority.map((item, idx) => (
                      <div key={idx} style={{ padding: '1rem', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#991b1b', marginBottom: '0.35rem' }}>
                          {item.opportunity}
                        </strong>
                        <div style={{ fontSize: '0.825rem', color: '#7f1d1d', marginBottom: '0.35rem' }}>
                          <strong>Why it matters:</strong> {item.whyItMatters}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                          <em>Competitor Benchmark:</em> {item.competitorBenchmark}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, marginTop: '0.25rem' }}>
                          → Implementation Path: {item.implementationPath}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Medium Priority
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {d.whatToImprove.mediumPriority.map((item, idx) => (
                      <div key={idx} style={{ padding: '1rem', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#92400e', marginBottom: '0.35rem' }}>
                          {item.opportunity}
                        </strong>
                        <div style={{ fontSize: '0.825rem', color: '#78350f', marginBottom: '0.35rem' }}>
                          <strong>Why it matters:</strong> {item.whyItMatters}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                          <em>Competitor Benchmark:</em> {item.competitorBenchmark}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, marginTop: '0.25rem' }}>
                          → Implementation Path: {item.implementationPath}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Future Opportunities
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {d.whatToImprove.futureOpportunities.map((item, idx) => (
                      <div key={idx} style={{ padding: '1rem', borderRadius: '8px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0369a1', marginBottom: '0.35rem' }}>
                          {item.opportunity}
                        </strong>
                        <div style={{ fontSize: '0.825rem', color: '#0c4a6e', marginBottom: '0.35rem' }}>
                          <strong>Why it matters:</strong> {item.whyItMatters}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                          <em>Competitor Benchmark:</em> {item.competitorBenchmark}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, marginTop: '0.25rem' }}>
                          → Implementation Path: {item.implementationPath}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 16: SUGGESTED PRODUCT DIRECTION */}
            <section style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                {d.productRoadmap.title}
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
                {d.productRoadmap.subtitle}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {d.productRoadmap.stages.map((stg) => (
                  <div key={stg.phase} style={{ padding: '1.25rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {stg.phase}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{stg.timeframe}</span>
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                      {stg.theme}
                    </h3>
                    <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {stg.goals.map((g, gidx) => (
                        <li key={gidx}>{g}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ── SECTION 17: RESEARCH SOURCES ── */}
        <section
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            marginTop: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
            Research Sources & Grounding
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
            {d.sources.map((s, idx) => (
              <div key={idx} style={{ padding: '0.85rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0284c7', textDecoration: 'underline' }}
                  >
                    {s.title} ↗
                  </a>
                  <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: '#e2e8f0', color: '#475569' }}>
                    {s.category}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                  {s.notes}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 18 & 19: REPORT DOWNLOAD ── */}
        <section
          style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            padding: '2rem',
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            boxShadow: '0 10px 25px -5px rgba(15, 118, 110, 0.25)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#99f6e4' }}>
              Final Deliverable
            </span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0.5rem 0' }}>
              Your Rhythma research report is ready.
            </h2>
            <div style={{ fontSize: '0.875rem', color: '#ccfbf1', display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
              <span>✓ Product Documentation</span>
              <span>✓ Competitive Analysis</span>
              <span>✓ Comparison Table</span>
              <span>✓ Charts & Insights</span>
              <span>✓ Improvement Opportunities</span>
              <span>✓ Research Sources</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadReport}
            style={{
              padding: '0.85rem 1.75rem',
              borderRadius: '8px',
              border: 'none',
              background: '#ffffff',
              color: '#0f766e',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'transform 0.15s ease',
            }}
          >
            <span>↓</span>
            <span>Download Rhythma Report</span>
          </button>
        </section>
      </main>
    </div>
  )
}
