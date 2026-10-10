'use client'

import { useState, useEffect, useMemo, useRef, ChangeEvent } from 'react'
import { useLanguage } from '@/lib/i18n'
import { apiFetch } from '@/lib/api-fetch'

interface SavedDoc {
  id: string
  file_name: string
  file_type?: string | null
  file_url?: string | null
  extracted_text?: string | null
  document_type?: string | null
  file_size?: number | null
  collection_id?: string | null
  collection_title?: string | null
  created_at: string
}

interface SavedDocumentsScreenProps {
  onClose: () => void
  onOpenCollection?: (collectionId: string) => void
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes === 0) return '—'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function getFileIcon(type?: string | null, name?: string): string {
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  if (type?.includes('pdf') || ext === 'pdf') return '📄'
  if (type?.includes('word') || ['doc', 'docx'].includes(ext)) return '📝'
  if (type?.includes('sheet') || type?.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) return '📊'
  if (type?.includes('image') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return '🖼️'
  if (type?.includes('json') || ext === 'json') return '🧾'
  return '📁'
}

export function SavedDocumentsScreen({ onClose, onOpenCollection }: SavedDocumentsScreenProps) {
  const { t } = useLanguage()
  const [docs, setDocs] = useState<SavedDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'report' | 'uploaded'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<SavedDoc | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadDocs()
  }, [])

  async function loadDocs() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/saved-documents')
      if (res.ok) {
        const data = await res.json()
        setDocs(data.documents || [])
      }
    } catch (e) {
      console.error('Failed to load saved documents:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this document?')) return
    setDeletingId(id)
    try {
      const res = await apiFetch(`/api/saved-documents?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.id !== id))
        if (previewDoc?.id === id) setPreviewDoc(null)
      } else {
        alert('Failed to delete document.')
      }
    } catch {
      alert('Network error while deleting.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        // Save to saved_documents
        await apiFetch('/api/saved-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            document_type: 'uploaded',
            extracted_text: data.file?.extracted_text || null,
          }),
        })
        await loadDocs()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to upload document')
      }
    } catch {
      alert('Upload failed. Please check network.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filteredDocs = useMemo(() => {
    return docs.filter(d => {
      const matchesSearch =
        d.file_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.collection_title && d.collection_title.toLowerCase().includes(search.toLowerCase())) ||
        (d.extracted_text && d.extracted_text.toLowerCase().includes(search.toLowerCase()))

      const matchesType =
        filterType === 'all' ||
        (filterType === 'report' && d.document_type === 'report') ||
        (filterType === 'uploaded' && d.document_type !== 'report')

      return matchesSearch && matchesType
    })
  }, [docs, search, filterType])

  return (
    <div className="sub-screen-container" role="region" aria-label={t('docs_title')}>
      <header className="sub-screen-header">
        <div className="sub-screen-header-left">
          <button className="icon-button" onClick={onClose} aria-label={t('back')}>
            ←
          </button>
          <h2>{t('docs_title')}</h2>
          <span className="sub-screen-badge">{docs.length}</span>
        </div>
        <div className="sub-screen-header-actions">
          <input
            type="file"
            ref={fileInputRef}
            hidden
            accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.json,image/*"
            onChange={handleFileUpload}
          />
          <button
            className="rs-btn rs-btn--primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? t('upload_processing') : '+ Upload File'}
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div className="sub-screen-toolbar">
        <div className="sub-screen-search">
          <span className="sub-screen-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search documents by name or content..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="sub-screen-clear-btn" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </div>

        <div className="sub-screen-filters">
          <button
            className={`sub-screen-filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({docs.length})
          </button>
          <button
            className={`sub-screen-filter-btn ${filterType === 'report' ? 'active' : ''}`}
            onClick={() => setFilterType('report')}
          >
            Reports ({docs.filter(d => d.document_type === 'report').length})
          </button>
          <button
            className={`sub-screen-filter-btn ${filterType === 'uploaded' ? 'active' : ''}`}
            onClick={() => setFilterType('uploaded')}
          >
            Uploaded ({docs.filter(d => d.document_type !== 'report').length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="sub-screen-content">
        {loading ? (
          <div className="sub-screen-loading">
            <span className="spinner" />
            <p>{t('loading')}</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="sub-screen-empty">
            <div className="sub-screen-empty-icon">📁</div>
            <h3>{search ? 'No matching documents' : t('docs_empty')}</h3>
            <p>{search ? 'Try modifying your search query' : t('docs_empty_sub')}</p>
            {!search && (
              <button
                className="rs-btn rs-btn--primary"
                style={{ marginTop: 16 }}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload your first document
              </button>
            )}
          </div>
        ) : (
          <div className="saved-docs-grid">
            {filteredDocs.map(doc => {
              const icon = getFileIcon(doc.file_type, doc.file_name)
              const isReport = doc.document_type === 'report'
              return (
                <div key={doc.id} className="saved-doc-card">
                  <div className="saved-doc-card-top">
                    <span className="saved-doc-icon">{icon}</span>
                    <div className="saved-doc-meta">
                      <h4 className="saved-doc-title" title={doc.file_name}>
                        {doc.file_name}
                      </h4>
                      <div className="saved-doc-sub">
                        <span>{formatDate(doc.created_at)}</span>
                        {doc.file_size ? <span>• {formatBytes(doc.file_size)}</span> : null}
                        <span className={`saved-doc-tag ${isReport ? 'tag-report' : 'tag-file'}`}>
                          {isReport ? 'Report' : 'File'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {doc.collection_title && (
                    <div className="saved-doc-collection-link">
                      <span className="collection-icon">📦</span>
                      <span className="collection-title-text" title={doc.collection_title}>
                        {doc.collection_title}
                      </span>
                    </div>
                  )}

                  {doc.extracted_text && (
                    <p className="saved-doc-preview">
                      {doc.extracted_text.slice(0, 120)}...
                    </p>
                  )}

                  <div className="saved-doc-actions">
                    {doc.extracted_text && (
                      <button
                        className="sub-btn sub-btn--ghost"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        Preview Text
                      </button>
                    )}
                    {doc.collection_id && (
                      <a
                        href={`/api/collections/${doc.collection_id}/export-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sub-btn sub-btn--ghost"
                      >
                        PDF
                      </a>
                    )}
                    <button
                      className="sub-btn sub-btn--danger"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      aria-label="Delete document"
                    >
                      {deletingId === doc.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="rs-modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div className="rs-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="rs-modal-header">
              <h3>{previewDoc.file_name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="rs-modal-close">✕</button>
            </div>
            <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {previewDoc.extracted_text}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
