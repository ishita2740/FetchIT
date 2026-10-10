'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from '@/lib/i18n'
import { apiFetch } from '@/lib/api-fetch'

export interface SavedChartItem {
  id: string
  chart_type: string
  title: string
  config: Record<string, any>
  insight_text?: string | null
  collection_id?: string | null
  collection_title?: string | null
  created_at: string
}

interface ChartsScreenProps {
  onClose: () => void
  onOpenCollection?: (collectionId: string) => void
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function ChartsScreen({ onClose, onOpenCollection }: ChartsScreenProps) {
  const { t } = useLanguage()
  const [charts, setCharts] = useState<SavedChartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadCharts()
  }, [])

  async function loadCharts() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/saved-charts')
      if (res.ok) {
        const data = await res.json()
        setCharts(data.charts || [])
      }
    } catch (e) {
      console.error('Failed to load saved charts:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this chart?')) return
    setDeletingId(id)
    try {
      const res = await apiFetch(`/api/saved-charts?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCharts(prev => prev.filter(c => c.id !== id))
      }
    } catch {
      alert('Failed to delete chart.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredCharts = useMemo(() => {
    if (filterType === 'all') return charts
    return charts.filter(c => c.chart_type === filterType)
  }, [charts, filterType])

  return (
    <div className="sub-screen-container" role="region" aria-label={t('charts_title')}>
      <header className="sub-screen-header">
        <div className="sub-screen-header-left">
          <button className="icon-button" onClick={onClose} aria-label={t('back')}>
            ←
          </button>
          <h2>{t('charts_title')}</h2>
          <span className="sub-screen-badge">{charts.length}</span>
        </div>
      </header>

      {/* Toolbar / Filters */}
      <div className="sub-screen-toolbar">
        <div className="sub-screen-filters">
          <button
            className={`sub-screen-filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({charts.length})
          </button>
          <button
            className={`sub-screen-filter-btn ${filterType === 'bar' ? 'active' : ''}`}
            onClick={() => setFilterType('bar')}
          >
            Bar Charts ({charts.filter(c => c.chart_type === 'bar').length})
          </button>
          <button
            className={`sub-screen-filter-btn ${filterType === 'distribution' ? 'active' : ''}`}
            onClick={() => setFilterType('distribution')}
          >
            Distributions ({charts.filter(c => c.chart_type === 'distribution').length})
          </button>
          <button
            className={`sub-screen-filter-btn ${filterType === 'insight' ? 'active' : ''}`}
            onClick={() => setFilterType('insight')}
          >
            Insights ({charts.filter(c => c.chart_type === 'insight').length})
          </button>
        </div>
      </div>

      <div className="sub-screen-content">
        {loading ? (
          <div className="sub-screen-loading">
            <span className="spinner" />
            <p>{t('loading')}</p>
          </div>
        ) : filteredCharts.length === 0 ? (
          <div className="sub-screen-empty">
            <div className="sub-screen-empty-icon">📈</div>
            <h3>{t('charts_empty')}</h3>
            <p>{t('charts_empty_sub')}</p>
          </div>
        ) : (
          <div className="charts-grid">
            {filteredCharts.map(item => {
              const dataPoints: { label: string; value: number }[] = item.config?.data || []
              const maxValue = Math.max(...dataPoints.map(d => d.value), 1)

              return (
                <div key={item.id} className="chart-card">
                  <div className="chart-card-top">
                    <div>
                      <h4 className="chart-card-title">{item.title}</h4>
                      {item.collection_title && (
                        <span className="chart-card-collection">
                          📦 {item.collection_title}
                        </span>
                      )}
                    </div>
                    <button
                      className="sub-btn sub-btn--danger"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      aria-label="Delete chart"
                    >
                      {deletingId === item.id ? '…' : '✕'}
                    </button>
                  </div>

                  {/* Render Visual Chart */}
                  <div className="chart-visual-box">
                    {dataPoints.length > 0 ? (
                      <div className="bar-chart-container">
                        {dataPoints.map((point, pIdx) => {
                          const pct = Math.round((point.value / maxValue) * 100)
                          return (
                            <div key={pIdx} className="bar-chart-row">
                              <div className="bar-label-group">
                                <span className="bar-label" title={point.label}>
                                  {point.label}
                                </span>
                                <span className="bar-value">{point.value}</span>
                              </div>
                              <div className="bar-track">
                                <div
                                  className="bar-fill"
                                  style={{
                                    width: `${pct}%`,
                                    background: `linear-gradient(90deg, #1f7a68 0%, #3ca88f 100%)`,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : item.insight_text ? (
                      <div className="chart-insight-box">
                        <span className="chart-insight-sparkle">✦ Insight</span>
                        <p>{item.insight_text}</p>
                      </div>
                    ) : (
                      <p className="rs-empty">No visualization data available.</p>
                    )}
                  </div>

                  {item.insight_text && dataPoints.length > 0 && (
                    <p className="chart-card-footer-insight">
                      {item.insight_text}
                    </p>
                  )}

                  <div className="chart-card-footer">
                    <span className="chart-date">{formatDate(item.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
