'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { AuthScreen } from './auth-screen'
import { MainScreen } from './main-screen'

type BootState = 'loading' | 'splash' | 'auth' | 'profile' | 'main'

export function SplashScreen() {
  const [bootState, setBootState] = useState<BootState>('loading')
  const [showDataScreen, setShowDataScreen] = useState(false)
  const [userName, setUserName] = useState('User')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // Clean up OAuth callback parameter if present
      if (typeof window !== 'undefined' && window.location.search.includes('auth_callback')) {
        const url = new URL(window.location.href)
        url.searchParams.delete('auth_callback')
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''))
      }

      try {
        const { data } = await authClient.getSession()

        if (cancelled) return

        if (data?.user) {
          // User is authenticated (e.g. after Google OAuth callback)
          console.log('[auth] Session found for user:', data.user.email, 'provider:', data.user.id)
          if (data.user.name) setUserName(data.user.name)
          if (data.user.email) setUserEmail(data.user.email)

          // Check whether profile is complete (name + age + gender + preferences)
          try {
            const res = await fetch('/api/profile')
            if (cancelled) return

            if (res.ok) {
              const profileData = await res.json()
              const p = profileData.profile
              const hasPrefs = profileData.preferences?.interests?.length > 0

              console.log('[auth] Profile lookup:', {
                hasProfile: !!p,
                name: p?.name,
                age: p?.age,
                gender: p?.gender,
                hasPrefs,
              })

              if (p?.name && p?.age && p?.gender) {
                // Account is already created — go directly to main screen
                console.log('[auth] Account exists → MainScreen')
                if (p.name) setUserName(p.name)
                setBootState('main')
                return
              }

              // Profile exists but incomplete (e.g. new Google user) — show profile form directly
              if (p?.name) setUserName(p.name)
              console.log('[auth] Profile incomplete → AuthScreen (profile mode)')
              setBootState('profile')
              return
            }
          } catch (e) {
            console.error('[auth] Profile fetch error:', e)
          }

          // Profile fetch failed — still authenticated, show profile form directly
          console.log('[auth] Profile fetch failed → AuthScreen (profile mode)')
          setBootState('profile')
          return
        }
      } catch {
        // getSession failed — user is not authenticated
        console.log('[auth] No session found')
      }

      if (cancelled) return

      // Not authenticated: show normal splash → data screen → auth screen
      console.log('[auth] Unauthenticated → starting splash sequence')
      setBootState('splash')
      const dataTransition = window.setTimeout(() => {
        if (!cancelled) setShowDataScreen(true)
      }, 3000)
      const authTransition = window.setTimeout(() => {
        if (!cancelled) {
          setBootState('auth')
        }
      }, 6000)

      return () => {
        window.clearTimeout(dataTransition)
        window.clearTimeout(authTransition)
      }
    }

    const cleanupPromise = bootstrap()

    return () => {
      cancelled = true
      cleanupPromise?.then?.(cleanup => cleanup?.())
    }
  }, [])

  return (
    <main
      className={`splash-screen ${showDataScreen ? 'show-data-screen' : ''} ${bootState === 'auth' || bootState === 'profile' ? 'show-auth-screen' : ''} ${bootState === 'main' ? 'show-main-screen' : ''}`}
      aria-label="FetchIT"
    >
      <div className="corner-shape corner-shape-top" aria-hidden="true" />
      <div className="corner-shape corner-shape-bottom" aria-hidden="true" />
      <div className="corner-curve corner-curve-top" aria-hidden="true" />
      <div className="corner-curve corner-curve-bottom" aria-hidden="true" />

      {bootState === 'splash' && (
        <>
          <section className="splash-content" aria-label="FetchIT">
            <div className="mascot-wrap">
              <svg className="mascot" viewBox="0 0 360 290" role="img" aria-label="Winking FetchIT mascot">
                <defs>
                  <linearGradient id="mascotFill" x1="70" y1="40" x2="270" y2="250" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#68b5a0" />
                    <stop offset="1" stopColor="#258675" />
                  </linearGradient>
                  <linearGradient id="mascotShade" x1="75" y1="110" x2="180" y2="245" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#146e63" stopOpacity=".1" />
                    <stop offset="1" stopColor="#0b5e55" stopOpacity=".55" />
                  </linearGradient>
                </defs>
                <ellipse className="mascot-shadow" cx="190" cy="257" rx="105" ry="17" />
                <path className="mascot-body" d="M86 168c-18-25-24-49-18-76 12-55 66-82 137-78 73 4 126 36 132 91 6 55-38 104-110 112-37 4-72-1-98 12l-31 18c-17 9-31-3-26-22l10-43c3-6 4-10 4-14Z" fill="url(#mascotFill)" />
                <path d="M76 179c10 23 32 44 65 51-12 2-26 7-42 15l-23 14c-17 9-31-3-26-22l10-43c2-6 11-15 16-15Z" fill="url(#mascotShade)" opacity=".65" />
                <path className="mascot-glint" d="M94 71c20-24 54-38 92-40" />
                <g className="mascot-eye-open">
                  <ellipse cx="132" cy="123" rx="36" ry="45" fill="#f3fff9" />
                  <ellipse cx="143" cy="127" rx="22" ry="31" fill="#073f43" />
                  <ellipse cx="133" cy="113" rx="9" ry="12" fill="#f3fff9" />
                </g>
                <path className="mascot-eye-wink" d="M223 126c11-14 24-20 38-20" />
                <path className="mascot-brow" d="M220 102c13-12 29-17 46-14" />
                <path className="mascot-smile" d="M178 159c7 15 24 21 40 18 12-2 19-9 24-19" />
                <ellipse className="mascot-blush" cx="252" cy="151" rx="22" ry="10" />
              </svg>
              <div className="spark spark-one" aria-hidden="true" />
              <div className="spark spark-two" aria-hidden="true" />
              <div className="spark spark-three" aria-hidden="true" />
            </div>

            <h1 className="wordmark" aria-label="FetchIT">
              <span>Fetch</span><span className="wordmark-accent">IT</span>
            </h1>
          </section>

          <section className="data-screen" aria-label="Turn ideas into data">
            <div className="data-screen-copy">
              <h2>Turn ideas into data.</h2>
              <p>Get the information you need, organized and ready to use.</p>
            </div>
            <div className="data-table" aria-label="Organized information table">
              <div className="data-table-head"><span>Topic</span><span>Type</span><span>Status</span></div>
              <div className="data-table-row"><span className="fill fill-one">Market research</span><span className="fill fill-two">Report</span><span className="fill fill-three">Ready</span></div>
              <div className="data-table-row"><span className="fill fill-four">Customer notes</span><span className="fill fill-five">Summary</span><span className="fill fill-six">Ready</span></div>
              <div className="data-table-row"><span className="fill fill-seven">Product ideas</span><span className="fill fill-eight">List</span><span className="fill fill-nine">Ready</span></div>
            </div>
          </section>
        </>
      )}

      {(bootState === 'auth' || bootState === 'profile') && (
        <AuthScreen
          initialMode={bootState === 'profile' ? 'profile' : 'choose'}
          initialName={userName !== 'User' ? userName : ''}
          initialEmail={userEmail}
          onComplete={(completedName) => {
            if (completedName) setUserName(completedName)
            setBootState('main')
          }}
        />
      )}

      {bootState === 'main' && <MainScreen name={userName} />}
    </main>
  )
}
