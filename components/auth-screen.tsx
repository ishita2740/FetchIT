'use client'

import { FormEvent, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { PersonalizationScreen } from './personalization-screen'
import { normalizeIndianPhoneNumber } from '@/lib/phone'

type Mode = 'choose' | 'email' | 'mobile' | 'otp' | 'verify' | 'profile' | 'personalize'

const countryCodes = [
  ['+91', 'India'], ['+1', 'United States / Canada'], ['+44', 'United Kingdom'], ['+61', 'Australia'], ['+971', 'United Arab Emirates'], ['+65', 'Singapore'], ['+60', 'Malaysia'], ['+92', 'Pakistan'], ['+880', 'Bangladesh'], ['+94', 'Sri Lanka'], ['+977', 'Nepal'], ['+81', 'Japan'], ['+82', 'South Korea'], ['+86', 'China'], ['+49', 'Germany'], ['+33', 'France'], ['+39', 'Italy'], ['+34', 'Spain'], ['+7', 'Russia / Kazakhstan'], ['+55', 'Brazil'], ['+52', 'Mexico'], ['+27', 'South Africa'], ['+234', 'Nigeria'], ['+254', 'Kenya'], ['+20', 'Egypt'], ['+966', 'Saudi Arabia'], ['+974', 'Qatar'], ['+968', 'Oman'], ['+90', 'Turkey'], ['+31', 'Netherlands'], ['+32', 'Belgium'], ['+41', 'Switzerland'], ['+46', 'Sweden'], ['+47', 'Norway'], ['+45', 'Denmark'], ['+358', 'Finland'], ['+353', 'Ireland'], ['+48', 'Poland'], ['+351', 'Portugal'], ['+64', 'New Zealand'], ['+66', 'Thailand'], ['+84', 'Vietnam'], ['+62', 'Indonesia'], ['+63', 'Philippines'], ['+972', 'Israel'], ['+212', 'Morocco'], ['+57', 'Colombia'], ['+54', 'Argentina'], ['+56', 'Chile'], ['+58', 'Venezuela'],
] as const

function friendlyError(message: string) {
  const text = message.toLowerCase()
  if (text.includes('already registered') || text.includes('user already exists') || text.includes('already in use')) {
    return 'This email is already registered. Try signing in instead.'
  }
  if (text.includes('invalid login') || text.includes('invalid credentials') || text.includes('invalid email or password')) {
    return 'The email or password is incorrect.'
  }
  if (text.includes('expired')) {
    return 'OTP expired. Please request a new one.'
  }
  if (text.includes('incorrect') || text.includes('invalid otp') || text.includes('invalid or expired') || text.includes('invalid verification')) {
    return 'Invalid OTP. Please try again.'
  }
  if (text.includes('trial') || text.includes('not verified')) {
    return 'This phone number is not verified on this trial account. Please use a verified phone number.'
  }
  if (text.includes('too many') || text.includes('maximum') || text.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (text.includes('phone') || text.includes('mobile')) {
    return 'Please enter a valid 10-digit Indian mobile number.'
  }
  if (text.includes('failed to send') || text.includes('could not send') || text.includes('twilio') || text.includes('service')) {
    return 'Could not send OTP. Please try again.'
  }
  return message || 'Something went wrong. Please try again.'
}

export function AuthScreen({
  initialMode,
  initialName,
  initialEmail,
  onComplete,
}: {
  initialMode?: Mode
  initialName?: string
  initialEmail?: string
  onComplete?: (name?: string) => void
}) {
  const [mode, setMode] = useState<Mode>(initialMode ?? 'choose')
  const [email, setEmail] = useState(initialEmail ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState(initialName ?? '')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('prefer_not_to_say')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [signUp, setSignUp] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [personalizeStep, setPersonalizeStep] = useState(1)
  const [interests, setInterests] = useState<string[]>([])
  const [informationNeeds, setInformationNeeds] = useState<string[]>([])
  const [interactionPreferences, setInteractionPreferences] = useState<string[]>([])
  const [formatPreferences, setFormatPreferences] = useState<string[]>([])
  const [priorityPreferences, setPriorityPreferences] = useState<string[]>([])
  // Store the full phone number (with country code) for OTP verification
  const [fullPhoneNumber, setFullPhoneNumber] = useState('')

  const toggleSelection = (value: string, setter: (values: string[]) => void, selected: string[]) => {
    setter(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value])
  }

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = window.setTimeout(() => {
      setResendCountdown((c) => c - 1)
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [resendCountdown])

  useEffect(() => {
    // If initialMode is already set to 'profile' (from SplashScreen bootstrap),
    // we only need to hydrate form state — no need to re-check session.
    if (initialMode === 'profile') {
      authClient.getSession().then(({ data }) => {
        if (data?.user) {
          if (data.user.name) setName(data.user.name)
          if (data.user.email) setEmail(data.user.email)
          fetch('/api/profile')
            .then(res => res.json())
            .then(resData => {
              if (resData.profile) {
                if (resData.profile.name) setName(resData.profile.name)
                if (resData.profile.age) setAge(String(resData.profile.age))
                if (resData.profile.gender) setGender(resData.profile.gender)
                if (resData.profile.phone) setPhone(resData.profile.phone)
              }
              if (resData.preferences) {
                if (resData.preferences.interests) setInterests(resData.preferences.interests)
                if (resData.preferences.information_purpose) setInformationNeeds(resData.preferences.information_purpose)
                if (resData.preferences.information_style) setFormatPreferences(resData.preferences.information_style)
                if (resData.preferences.information_priorities) setPriorityPreferences(resData.preferences.information_priorities)
              }
              // Check if profile is actually complete → go directly to main screen
              const p = resData.profile
              if (p?.name && p?.age && p?.gender) {
                console.log('[auth] AuthScreen: Account already created → onComplete')
                onComplete?.(p.name)
              }
              // Otherwise stay in 'profile' mode with hydrated values
            })
            .catch(() => {
              // Profile fetch failed — stay on profile form
            })
        }
      }).catch(() => {})
      return
    }

    // For 'choose' mode — check if already authenticated
    if (initialMode === 'choose' || !initialMode) {
      authClient.getSession().then(({ data }) => {
        if (data?.user) {
          if (data.user.name) setName(data.user.name)
          if (data.user.email) setEmail(data.user.email)
          fetch('/api/profile')
            .then(res => res.json())
            .then(resData => {
              if (resData.profile) {
                if (resData.profile.name) setName(resData.profile.name)
                if (resData.profile.age) setAge(String(resData.profile.age))
                if (resData.profile.gender) setGender(resData.profile.gender)
                if (resData.profile.phone) setPhone(resData.profile.phone)
              }
              if (resData.preferences) {
                if (resData.preferences.interests) setInterests(resData.preferences.interests)
                if (resData.preferences.information_purpose) setInformationNeeds(resData.preferences.information_purpose)
                if (resData.preferences.information_style) setFormatPreferences(resData.preferences.information_style)
                if (resData.preferences.information_priorities) setPriorityPreferences(resData.preferences.information_priorities)
              }

              const p = resData.profile
              if (p?.name && p?.age && p?.gender) {
                console.log('[auth] AuthScreen: already complete → onComplete')
                onComplete?.(p.name)
              } else {
                setMode('profile')
              }
            })
            .catch(() => setMode('profile'))
        }
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function previewOnboarding() {
    setName('Ishita')
    setPersonalizeStep(1)
    setMode('personalize')
    setMessage('')
  }

  async function google() {
    setBusy(true)
    setMessage('')
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin + '?auth_callback=google',
      })
      if (error) {
        setMessage(friendlyError(error.message || 'Google sign-in failed'))
        setBusy(false)
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Google sign-in failed'
      setMessage(friendlyError(errorMsg))
      setBusy(false)
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (signUp) {
        if (password.length < 8) {
          setMessage('Use at least 8 characters for your password.')
          setBusy(false)
          return
        }
        if (password !== confirmPassword) {
          setMessage('Passwords do not match.')
          setBusy(false)
          return
        }
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0] || 'User',
        })
        if (error) {
          setMessage(friendlyError(error.message || 'Failed to create account'))
        } else {
          await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              email,
              age: age ? Number(age) : null,
              gender,
            }),
          }).catch(() => {})
          setPersonalizeStep(1)
          setMode('personalize')
        }
      } else {
        const { error } = await authClient.signIn.email({
          email,
          password,
        })
        if (error) {
          setMessage(friendlyError(error.message || 'Invalid email or password'))
        } else {
          const res = await fetch('/api/profile').catch(() => null)
          let resolvedName = name
          if (res && res.ok) {
            const profileData = await res.json()
            if (profileData.profile?.name) resolvedName = profileData.profile.name
          }
          // Requirement 3: Email sign-in directly opens MainScreen (not questions page)
          onComplete?.(resolvedName || 'there')
          return
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Authentication error'
      setMessage(friendlyError(errorMsg))
    } finally {
      setBusy(false)
    }
  }

  async function sendPhone(event: FormEvent | null) {
    if (event) event.preventDefault()
    const rawDigits = phone.trim()
    const fullCandidate = rawDigits.startsWith('+') ? rawDigits : `${countryCode}${rawDigits}`
    const normalized = normalizeIndianPhoneNumber(fullCandidate)
    if (!normalized) {
      setMessage('Please enter a valid 10-digit Indian mobile number.')
      return
    }
    setFullPhoneNumber(normalized)
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/mobile/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, phoneNumber: normalized }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMessage(friendlyError(data.message || data.error || 'Could not send OTP. Please try again.'))
      } else {
        setMessage('OTP sent to your mobile number.')
        setMode('otp')
        setResendCountdown(30)
      }
    } catch {
      setMessage('Could not send OTP. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyPhone(event: FormEvent) {
    event.preventDefault()
    const cleanOtp = otp.trim()
    if (!cleanOtp || cleanOtp.length < 4) {
      setMessage('Please enter the 6-digit OTP.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/mobile/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhoneNumber, phoneNumber: fullPhoneNumber, code: cleanOtp }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMessage(friendlyError(data.message || data.error || 'Invalid OTP. Please try again.'))
      } else {
        console.log('[auth] Mobile OTP verified, user authenticated:', data.userId)
        
        // Requirement 4: If account is already created (existing user), redirect straight to MainScreen!
        // Do NOT show questions page again!
        if (data.isProfileComplete) {
          onComplete?.(data.userName || name || 'there')
          return
        }

        // New user or incomplete profile: redirect to Name/Age/Gender onboarding page
        if (data.userName && data.userName !== 'Mobile User') {
          setName(data.userName)
        }
        setMode('profile')
      }
    } catch {
      setMessage('Invalid OTP. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: fullPhoneNumber || phone,
          age: age ? Number(age) : null,
          gender,
        }),
      })
      if (!res.ok) {
        setMessage('We could not save your profile. Please try again.')
      } else {
        setPersonalizeStep(1)
        setMode('personalize')
      }
    } catch {
      setMessage('We could not save your profile. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePersonalizationDone() {
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          interests,
          information_purpose: informationNeeds,
          information_style: formatPreferences,
          information_priorities: priorityPreferences,
        }),
      })
    } catch (e) {
      console.error('Failed to save preferences:', e)
    }
    onComplete?.(name || 'there')
  }

  return <main className="auth-screen" aria-label="FetchIT authentication"><div className="auth-card">
    <div className="auth-mark" aria-hidden="true">●</div>
    {mode === 'choose' && <><h1>Welcome to FetchIT</h1><p className="auth-lead">Your friendly way to turn ideas into useful data.</p><button className="auth-button google-button" onClick={google} disabled={busy}>Continue with Google</button><div className="auth-divider"><span>or</span></div><button className="auth-button" onClick={() => { setSignUp(true); setMode('email') }}>Create account</button><button className="auth-button secondary" onClick={() => { setSignUp(false); setMode('email') }}>Sign in</button><button className="auth-link" onClick={() => setMode('mobile')}>Continue with mobile</button><button className="preview-link" onClick={previewOnboarding}>Preview personalization without signing in</button><button className="preview-link" onClick={() => onComplete?.(name || 'Ishita')}>Open main page preview</button></>}
    {mode === 'email' && <form onSubmit={submitEmail}><button type="button" className="back-link" onClick={() => setMode('choose')}>Back</button><h1>{signUp ? 'Create your FetchIT account' : 'Welcome back'}</h1><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" /></label><label>Password<input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>{signUp && <><label>Confirm password<input type="password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" /></label><label>Name<input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label><label>Age<input type="number" min="13" max="120" required value={age} onChange={e => setAge(e.target.value)} placeholder="Your age" /></label><Gender value={gender} onChange={setGender} /></>}<button className="auth-button" disabled={busy}>{busy ? 'Please wait...' : signUp ? 'Create account' : 'Continue'}</button><button type="button" className="auth-link" onClick={() => setMode('mobile')}>Use mobile instead</button></form>}
    {mode === 'mobile' && <form onSubmit={sendPhone}><button type="button" className="back-link" onClick={() => { setMessage(''); setMode('choose') }}>Back</button><h1>Continue with mobile</h1><p className="auth-note">A verification code will be sent to your mobile.</p><label>Country code<select className="country-select" value={countryCode} onChange={e => setCountryCode(e.target.value)}>{countryCodes.map(([code, country]) => <option key={`${code}-${country}`} value={code}>{code} — {country}</option>)}</select></label><label>Mobile number<input type="tel" required inputMode="numeric" pattern="[0-9 +]{7,16}" value={phone} onChange={e => setPhone(e.target.value)} placeholder="98765 43210" /></label><button className="auth-button" disabled={busy}>{busy ? 'Sending code...' : 'Send OTP'}</button></form>}
    {mode === 'otp' && <form onSubmit={verifyPhone}><button type="button" className="back-link" onClick={() => { setMessage(''); setMode('mobile') }}>Change mobile number</button><h1>Verify your mobile number</h1><p className="auth-note">We sent a 6-digit code to {fullPhoneNumber}.</p><label>Enter OTP<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="______" /></label><button className="auth-button" disabled={busy}>{busy ? 'Verifying...' : 'Verify'}</button><button type="button" className="auth-link" disabled={busy || resendCountdown > 0} onClick={() => sendPhone(null)}>{resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : 'Resend OTP'}</button></form>}
    {mode === 'verify' && <><h1>Check your email</h1><p className="auth-note">{message}</p><button className="auth-button" onClick={() => setMode('choose')}>Back to FetchIT</button></>}
    {mode === 'profile' && <form onSubmit={saveProfile}><h1>Almost there!</h1><p className="auth-note">Tell us a little about yourself.</p><label>Name<input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label><label>Age<input type="number" min="13" max="120" required value={age} onChange={e => setAge(e.target.value)} placeholder="Your age" /></label><Gender value={gender} onChange={setGender} /><button className="auth-button" disabled={busy}>{busy ? 'Saving...' : 'Continue'}</button><button type="button" className="preview-link" onClick={previewOnboarding}>Skip authentication for preview</button></form>}
    {mode === 'personalize' && <PersonalizationScreen onComplete={handlePersonalizationDone} name={name || 'there'} step={personalizeStep} setStep={setPersonalizeStep} interests={interests} setInterests={setInterests} informationNeeds={informationNeeds} setInformationNeeds={setInformationNeeds} interactionPreferences={interactionPreferences} setInteractionPreferences={setInteractionPreferences} formatPreferences={formatPreferences} setFormatPreferences={setFormatPreferences} priorityPreferences={priorityPreferences} setPriorityPreferences={setPriorityPreferences} toggleSelection={toggleSelection} />}
    {message && mode !== 'verify' && mode !== 'personalize' && <p className="auth-message" role="alert">{message}</p>}
  </div></main>
}

function Gender({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <fieldset><legend>Gender</legend><div className="gender-options">{[['female','Female'],['male','Male'],['prefer_not_to_say','Prefer not to say']].map(([key, label]) => <button type="button" key={key} className={`gender-option ${value === key ? 'selected' : ''}`} onClick={() => onChange(key)}>{label}</button>)}</div></fieldset>
}
