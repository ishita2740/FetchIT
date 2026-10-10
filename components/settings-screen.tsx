'use client'

import { useState, useEffect } from 'react'
import { useLanguage, LANGUAGES, Language } from '@/lib/i18n'
import { authClient } from '@/lib/auth/client'

interface SettingsScreenProps {
  onClose: () => void
  onSignOut: () => void
}

export function SettingsScreen({ onClose, onSignOut }: SettingsScreenProps) {
  const { language, setLanguage, t } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Profile
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState<string>('')
  const [gender, setGender] = useState<string>('')

  // Preferences
  const [interests, setInterests] = useState<string[]>([])
  const [purpose, setPurpose] = useState<string[]>([])
  const [style, setStyle] = useState<string[]>([])
  const [priorities, setPriorities] = useState<string[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const data = await res.json()
          if (data.profile) {
            setName(data.profile.name || '')
            setEmail(data.profile.email || '')
            setPhone(data.profile.phone || '')
            setAge(data.profile.age ? String(data.profile.age) : '')
            setGender(data.profile.gender || '')
            if (data.profile.language && LANGUAGES.some(l => l.code === data.profile.language)) {
              setLanguage(data.profile.language as Language)
            }
          }
          if (data.preferences) {
            setInterests(data.preferences.interests || [])
            setPurpose(data.preferences.information_purpose || [])
            setStyle(data.preferences.information_style || [])
            setPriorities(data.preferences.information_priorities || [])
          }
        }
      } catch (e) {
        console.error('Failed to load profile:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [setLanguage])

  async function handleSave() {
    setSaving(true)
    setSavedSuccess(false)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          age: age ? Number(age) : null,
          gender,
          language,
          interests,
          information_purpose: purpose,
          information_style: style,
          information_priorities: priorities,
        }),
      })

      if (res.ok) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
      } else {
        alert('Failed to save settings.')
      }
    } catch {
      alert('Network error while saving settings.')
    } finally {
      setSaving(false)
    }
  }

  function handleLanguageChange(newLang: Language) {
    setLanguage(newLang)
    // Silently sync to DB
    fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLang }),
    }).catch(() => {})
  }

  const interestOptions = [
    'Technology & AI',
    'Business & Finance',
    'Healthcare & Medicine',
    'Government & Policy',
    'Education & Academics',
    'Market Research',
  ]

  const styleOptions = [
    'Concise & Direct',
    'Comprehensive & Deep',
    'Structured Tables',
    'Visual Charts',
  ]

  const priorityOptions = [
    'Verified Sources First',
    'Fresh Data (Latest 24h)',
    'Depth Over Speed',
    'Comprehensive Aggregation',
  ]

  function toggleArrayItem(arr: string[], setArr: (val: string[]) => void, item: string) {
    if (arr.includes(item)) {
      setArr(arr.filter(i => i !== item))
    } else {
      setArr([...arr, item])
    }
  }

  return (
    <div className="sub-screen-container" role="region" aria-label={t('settings_title')}>
      <header className="sub-screen-header">
        <div className="sub-screen-header-left">
          <button className="icon-button" onClick={onClose} aria-label={t('back')}>
            ←
          </button>
          <h2>{t('settings_title')}</h2>
        </div>
        <button
          className="rs-btn rs-btn--primary"
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Saving…' : savedSuccess ? '✓ Saved!' : t('settings_save')}
        </button>
      </header>

      <div className="sub-screen-content">
        {loading ? (
          <div className="sub-screen-loading">
            <span className="spinner" />
            <p>{t('loading')}</p>
          </div>
        ) : (
          <div className="settings-form">
            {/* Language Selector */}
            <section className="settings-section">
              <h3 className="settings-section-title">{t('settings_language')}</h3>
              <p className="settings-section-desc">
                Choose the language for the FetchIT interface and results.
              </p>
              <div className="language-grid">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`language-card ${language === lang.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                  >
                    <span className="lang-native">{lang.native}</span>
                    <span className="lang-name">{lang.name}</span>
                    {language === lang.code && <span className="lang-check">✓</span>}
                  </button>
                ))}
              </div>
            </section>

            {/* Account Settings */}
            <section className="settings-section">
              <h3 className="settings-section-title">{t('settings_account')}</h3>
              <div className="settings-fields-grid">
                <div className="settings-field">
                  <label htmlFor="settings-name">{t('settings_name')}</label>
                  <input
                    id="settings-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="settings-email">{t('settings_email')}</label>
                  <input
                    id="settings-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="settings-phone">{t('settings_phone')}</label>
                  <input
                    id="settings-phone"
                    type="tel"
                    placeholder="+91..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div className="settings-field">
                  <label htmlFor="settings-age">Age</label>
                  <input
                    id="settings-age"
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Personalization */}
            <section className="settings-section">
              <h3 className="settings-section-title">{t('settings_personalization')}</h3>
              <p className="settings-section-desc">
                These preferences guide how FetchIT searches, filters, and formats your data.
              </p>

              <div className="pref-group">
                <label className="pref-group-title">{t('settings_interests')}</label>
                <div className="pref-tags-grid">
                  {interestOptions.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`pref-tag ${interests.includes(opt) ? 'active' : ''}`}
                      onClick={() => toggleArrayItem(interests, setInterests, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pref-group">
                <label className="pref-group-title">{t('settings_style')}</label>
                <div className="pref-tags-grid">
                  {styleOptions.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`pref-tag ${style.includes(opt) ? 'active' : ''}`}
                      onClick={() => toggleArrayItem(style, setStyle, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pref-group">
                <label className="pref-group-title">{t('settings_priorities')}</label>
                <div className="pref-tags-grid">
                  {priorityOptions.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`pref-tag ${priorities.includes(opt) ? 'active' : ''}`}
                      onClick={() => toggleArrayItem(priorities, setPriorities, opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Privacy & Security */}
            <section className="settings-section">
              <h3 className="settings-section-title">{t('settings_privacy')}</h3>
              <p className="settings-section-desc">{t('settings_privacy_text')}</p>
              <div className="privacy-badge">
                🔒 Protected with PostgreSQL Row Level Security (RLS) & encrypted sessions
              </div>
            </section>

            {/* Sign Out */}
            <section className="settings-section" style={{ borderBottom: 'none' }}>
              <button
                type="button"
                className="sub-btn sub-btn--danger"
                style={{ padding: '12px 24px', fontSize: 14 }}
                onClick={onSignOut}
              >
                {t('settings_sign_out')}
              </button>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
