/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useRef } from 'react'

import { PublicLayout } from '@/components/layout'
import { useTheme } from '@/context/theme-provider'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Fill in `Authorization: Bearer <token>` for same-origin /api/ fetches that
 * do not carry one (i.e. the plaza's legacy-style calls). Installed once.
 */
let authBridgeInstalled = false
function installAuthBridge() {
  if (authBridgeInstalled) return
  authBridgeInstalled = true
  const origFetch = window.fetch.bind(window)
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url
      const target = new URL(url, window.location.origin)
      const token = useAuthStore.getState().auth.accessToken
      if (
        token &&
        target.origin === window.location.origin &&
        target.pathname.startsWith('/api/')
      ) {
        const headers = new Headers(
          (init && init.headers) ||
            (input instanceof Request ? input.headers : undefined)
        )
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
          init = { ...(init || {}), headers }
        }
      }
    } catch {
      // Non-URL inputs fall through untouched.
    }
    return origFetch(input, init)
  }) as typeof window.fetch
}

/**
 * Model Plaza (vendored from TransAPI-eng/new-api-model-plaza, MIT-style).
 *
 * Replaces the native /pricing table with the tree-card plaza. Contract:
 * - READ-ONLY consumer of new-api's own APIs (/api/pricing, /api/status,
 *   /api/perf-metrics/summary, /api/user/self) plus the user-scoped
 *   POST /api/token/ for one-click key creation. No backend changes.
 * - Route guard, PublicHeader (original top bar) and /pricing/$modelId stay
 *   untouched. The old table component is kept in this feature folder but is
 *   no longer routed (restore = point the route back at `Pricing`).
 * - `no-credit` removes the upstream's competitor attribution footer.
 * - Login/register/keys entry points are remapped to this deployment's
 *   routes (/sign-in, /sign-up, /keys).
 *
 * Local assets: web/public/plaza/{plaza.js, official.json, plaza.config.json}
 * (official.json refreshed daily — see tools/sync-plaza-official.cjs).
 */
export function PricingPlaza() {
  return (
    <PublicLayout showMainContainer={false}>
      <PlazaEmbed />
    </PublicLayout>
  )
}

function PlazaEmbed() {
  const hostRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()
  const user = useAuthStore((s) => s.auth.user)

  // --- auth bridge (new-api's Bearer session <-> plaza's legacy conventions) ---
  // The upstream component predates the Bearer-session auth: it decides
  // "logged in" via localStorage.user and authenticates with the legacy
  // New-Api-User header, which this backend no longer honours. We bridge both
  // without touching plaza.js:
  //  1. mirror the logged-in user into localStorage.user ({id,...}) ;
  //  2. inject `Authorization: Bearer <token>` into same-origin /api/ fetches
  //     that have no Authorization header (the app's own client always sets
  //     its own, so it is unaffected).
  useEffect(() => {
    if (user) {
      localStorage.setItem(
        'user',
        JSON.stringify({ id: user.id, username: user.username })
      )
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  useEffect(() => {
    installAuthBridge()
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    // Load the web component once per app lifetime; the element auto-upgrades
    // when the definition registers.
    if (!document.querySelector('script[data-plaza]')) {
      const script = document.createElement('script')
      script.src = '/plaza/plaza.js'
      script.async = true
      script.setAttribute('data-plaza', '')
      document.body.appendChild(script)
    }

    const el = document.createElement('model-plaza')
    el.setAttribute('no-credit', '')
    el.setAttribute('login-page', '/sign-in')
    el.setAttribute('register-page', '/sign-up')
    el.setAttribute('token-page', '/keys')
    host.appendChild(el)

    return () => {
      host.innerHTML = ''
    }
  }, [])

  // Keep the plaza's palette in sync with the app theme.
  useEffect(() => {
    const el = hostRef.current?.querySelector('model-plaza')
    if (el) {
      el.setAttribute('theme', resolvedTheme === 'light' ? 'light' : 'dark')
    }
  }, [resolvedTheme])

  return (
    <div
      ref={hostRef}
      className='rm-plaza min-h-svh w-full'
      style={{ background: 'var(--background)' }}
    />
  )
}
