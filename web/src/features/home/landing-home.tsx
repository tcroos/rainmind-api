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
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef } from 'react'

import { landingHtml, landingThemePinCss } from './landing-html'

/**
 * RainMind landing content (tuned gateway-landing visual: WebGL black hole,
 * scroll reveal, footer wordmark) mounted inside the SPA home route.
 *
 * Top-entry contract (do not break):
 * - The top bar is new-api's ORIGINAL PublicHeader (logo left, entries right,
 *   lang/theme/bell/auth actions) — rendered by PublicLayout in index.tsx.
 * - The landing's own glass header / mobile menu are stripped by
 *   integrate-landing.cjs and must never be re-added here.
 *
 * Entry choreography (kept in lockstep with the splash in wordmark-splash):
 * - Body injects immediately, but all CSS entrance animations are PAUSED and
 *   the inline scripts (scroll reveal, showcase) are deferred — otherwise
 *   they play invisibly while hidden.
 * - The black-hole runtime starts at 3.1s (just after the splash begins its
 *   crossfade) so the shader compile can never disturb the draw / glow /
 *   colour-shift. Its opacity fade and the hero cascade are compositor
 *   properties (opacity/transform), so they stay silky even mid-compile.
 * - At `revealed` the hero copy plays a staggered fade-up entrance AS the
 *   page appears, restoring the entrance the capture froze into end state.
 */
const BLACKHOLE_SCRIPT_DELAY = 3100

/**
 * The captured landing stylesheet ships its OWN global `:root` / `.dark`
 * palette. Once injected into the SPA document head it overrides new-api's
 * theme tokens for everything outside `.rm-landing` too — including the
 * original PublicHeader. Switching to light mode therefore turns the header
 * text near-black on a permanently black canvas, making the whole top bar
 * unreadable.
 *
 * This overlay is scoped to the home route only (`html.rm-home-active`) and
 * pins the header's TEXT *and SURFACE* tokens to the landing's dark palette.
 * Surfaces matter as much as text: the scrolled capsule uses
 * `bg-background/60`, the mobile overlay `bg-background/98`, and the theme /
 * notification menus render `bg-popover` in a body-level portal. In light
 * mode `--background` resolves to `#fff`, so pinning only the text turned the
 * capsule into a light-grey bar with near-white text on it.
 *
 * Brand tokens (`--primary`) are deliberately left alone when an admin theme
 * preset is active — otherwise a configured accent (e.g. the orange sign-in
 * button) would be replaced. Only the no-preset case needs a pin, because the
 * captured `:root` sets a near-black primary in light mode.
 */
const LANDING_HEADER_SURFACE_TOKENS = `
  --background: oklch(14.1% .004 285.83);
  --foreground: var(--base-200);
  --muted-foreground: var(--base-400);
  --border: var(--base-800);
  /* hover / aria-expanded highlight of the ghost icon buttons; light mode's
     --muted is oklch(97% 0 0) and shows up as a white square on the dark bar. */
  --muted: oklch(21% .0053 285.89);
  --input: oklch(37% .012 285.81);
  --accent: rgba(255, 255, 255, 0.1);
  --accent-foreground: var(--base-200);
  --ring: var(--base-400);
  --popover: oklch(14.1% .004 285.83);
  --popover-foreground: var(--base-200);
  --card: oklch(14.1% .004 285.83);
  --card-foreground: var(--base-200);
  --secondary: rgba(255, 255, 255, 0.1);
  --secondary-foreground: var(--base-200);
  color: var(--foreground);
  color-scheme: dark;
`
const LANDING_HEADER_PIN_CSS = `
html.rm-home-active {
  /* The landing theme pins these inside .rm-landing. The public header is a
     sibling, so expose the tokens it references at the home-route root too. */
  --base-50: oklch(99% .0053 106.5);
  --base-200: oklch(92.45% .0074 107.89);
  --base-400: oklch(70.76% .0095 109.42);
  --base-800: oklch(27.08% .008 110.04);
  --base-900: oklch(21.38% .0074 110.31);
}
html.rm-home-active .rm-landing {
  color: var(--foreground);
}
html.rm-home-active header[data-public-header],
html.rm-home-active [data-public-header-overlay] {
  ${LANDING_HEADER_SURFACE_TOKENS}
}
/* Portalled menus live outside the header, so they need their own pin. */
html.rm-home-active [data-slot='dropdown-menu-content'],
html.rm-home-active [data-slot='dropdown-menu-sub-content'],
html.rm-home-active [data-slot='popover-content'] {
  ${LANDING_HEADER_SURFACE_TOKENS}
}
html.rm-home-active body:not([data-theme-preset]) header[data-public-header] {
  --primary: var(--base-50);
  --primary-foreground: var(--base-900);
}
/* The stock header renders the current-route link with text-foreground
   (--base-200, ~92% lightness) and every other link with
   text-muted-foreground (--base-400, ~70% lightness). On the permanently
   dark landing that reads as a row of randomly dim labels next to the bright
   logo and icon buttons. Pin the muted token to the same brightness as the
   foreground ONLY inside the top bar / mobile overlay. Portalled menus keep
   their own --muted-foreground so secondary text still has hierarchy.
   --primary is untouched, so the configured sign-in button keeps its accent. */
html.rm-home-active header[data-public-header],
html.rm-home-active [data-public-header-overlay] {
  --muted-foreground: var(--base-200);
}
`

// The captured document's <body> carries the landing's own layout classes and
// theme-preset attributes (bg-background, font variable classes, data-theme-*).
// `host.innerHTML = doc.body.innerHTML` only ports the children, so these must
// be re-attached to the host element or the preset palette / fonts are lost.
const BODY_TAG = landingHtml.match(/<body[^>]*>/)?.[0] ?? ''
const BODY_CLASS = BODY_TAG.match(/class="([^"]*)"/)?.[1] ?? ''
const BODY_DATA_ATTRS: Record<string, string> = {}
for (const m of BODY_TAG.matchAll(/(data-[a-z-]+)="([^"]*)"/g)) {
  BODY_DATA_ATTRS[m[1]] = m[2]
}

export function LandingHome({ revealed }: { revealed: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const revealHookRef = useRef<(() => void) | null>(null)

  // Inject the landing document into the SPA once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const doc = new DOMParser().parseFromString(landingHtml, 'text/html')
    const created: Node[] = []
    const cleanups: Array<() => void> = []
    const deferred: Array<HTMLScriptElement> = []
    const pendingInline: string[] = []

    // Stylesheets + inline <style> blocks -> <head> (removed on unmount)
    for (const link of Array.from(
      doc.querySelectorAll('link[rel="stylesheet"]')
    )) {
      const el = document.createElement('link')
      el.rel = 'stylesheet'
      el.href = link.getAttribute('href') || ''
      el.setAttribute('data-rm-landing', '')
      document.head.appendChild(el)
      created.push(el)
    }
    for (const style of Array.from(doc.querySelectorAll('style'))) {
      const el = document.createElement('style')
      el.textContent = style.textContent
      el.setAttribute('data-rm-landing', '')
      document.head.appendChild(el)
      created.push(el)
    }
    // Freeze every CSS entrance animation until the splash reveals the page.
    const pauseStyle = document.createElement('style')
    pauseStyle.setAttribute('data-rm-landing', '')
    pauseStyle.textContent =
      '.rm-anim-paused .rm-landing *{animation-play-state:paused !important}'
    document.head.appendChild(pauseStyle)
    created.push(pauseStyle)

    // Pin the landing's dark palette onto the host container. The SPA's theme
    // system shares Tailwind variable names with the landing CSS, so without
    // this the light-mode decorative layers (bottom fade band, blur glows)
    // leak through as whitish halos (inheritance from .rm-landing beats any
    // html-level cascade).
    const pinStyle = document.createElement('style')
    pinStyle.setAttribute('data-rm-landing', '')
    pinStyle.textContent = landingThemePinCss
    document.head.appendChild(pinStyle)
    created.push(pinStyle)

    // Keep the original top bar's text readable on the dark landing in BOTH
    // themes. Scoped to rm-home-active, removed together with the landing.
    const headerPinStyle = document.createElement('style')
    headerPinStyle.setAttribute('data-rm-landing', '')
    headerPinStyle.textContent = LANDING_HEADER_PIN_CSS
    document.head.appendChild(headerPinStyle)
    created.push(headerPinStyle)

    // Body markup
    host.innerHTML = doc.body.innerHTML

    // Track DOM/window listeners registered by landing scripts so we can
    // detach them on unmount (scripts are re-run per mount for scroll reveal).
    const tracked: Array<
      [EventTarget, string, EventListenerOrEventListenerObject]
    > = []
    const patchTarget = (target: EventTarget, restore: Array<() => void>) => {
      const origAdd = target.addEventListener.bind(target)
      const origRemove = target.removeEventListener.bind(target)
      target.addEventListener = ((
        type: string,
        fn: EventListenerOrEventListenerObject,
        opts?: unknown
      ) => {
        if (typeof fn === 'function') tracked.push([target, type, fn])
        origAdd(
          type,
          fn as EventListenerOrEventListenerObject,
          opts as AddEventListenerOptions
        )
      }) as typeof target.addEventListener
      restore.push(() => {
        target.addEventListener = origAdd
        target.removeEventListener = origRemove
      })
    }

    const runInline = (code: string) => {
      const restore: Array<() => void> = []
      patchTarget(document, restore)
      patchTarget(window, restore)
      const el = document.createElement('script')
      el.textContent = code
      document.body.appendChild(el)
      document.body.removeChild(el)
      for (const fn of restore) fn()
    }

    // Inline scripts are deferred to reveal so the IntersectionObserver
    // section reveals fire with the page, not while it is hidden. External
    // scripts (the black-hole runtime) start at BLACKHOLE_SCRIPT_DELAY so
    // the shader compile overlaps the splash's colour-shift phase.
    for (const script of Array.from(doc.querySelectorAll('script'))) {
      if (script.src) {
        const el = document.createElement('script')
        el.src = script.src
        deferred.push(el)
      } else {
        pendingInline.push(script.textContent || '')
      }
    }

    const deferTimer = window.setTimeout(() => {
      for (const el of deferred) document.body.appendChild(el)
    }, BLACKHOLE_SCRIPT_DELAY)

    const flushInline = () => {
      for (const code of pendingInline.splice(0)) runInline(code)
    }

    // Detach script-registered document/window listeners on unmount. The list
    // must be iterated at unmount time (scripts run later, at reveal) — doing
    // this at mount time iterated an empty array and leaked every listener.
    cleanups.push(() => {
      for (const [target, type, fn] of tracked) {
        target.removeEventListener(type, fn)
      }
    })

    // Mark that the home landing is mounted. Do NOT force html.dark here:
    // the theme provider owns that class and removes it whenever the user
    // switches to light, which used to make the header colours flip. The
    // landing host itself carries `.dark` plus the pinned palette, so it
    // stays dark without touching the global theme.
    document.documentElement.classList.add('rm-home-active')
    const prevTitle = document.title
    const titleTag = doc.querySelector('title')
    if (titleTag?.textContent) document.title = titleTag.textContent

    // Reveal hook — invoked by the layout effect below on the exact commit
    // where `revealed` flips true (before paint, so no static flash).
    revealHookRef.current = () => {
      host.classList.remove('rm-anim-paused')
      flushInline()
      // Hero entrance cascade (the capture froze these into their end state).
      // Opacity + transform only: compositor-accelerated, survives shader
      // compilation on the main thread.
      const heroKids = host.querySelectorAll('.public-hero-copy > *')
      heroKids.forEach((el, i) => {
        ;(el as HTMLElement).animate(
          [
            { opacity: 0, transform: 'translateY(18px)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: 650,
            delay: i * 100,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'both',
          }
        )
      })
    }

    cleanups.push(() => {
      window.clearTimeout(deferTimer)
      revealHookRef.current = null
      pendingInline.length = 0
      for (const node of created) node.parentNode?.removeChild(node)
      for (const el of deferred) el.parentNode?.removeChild(el)
      host.innerHTML = ''
      document.documentElement.classList.remove('rm-home-active')
      document.title = prevTitle
    })

    return () => {
      for (const fn of cleanups) fn()
    }
  }, [])

  // Run the reveal choreography before the first paint that shows the page.
  useLayoutEffect(() => {
    if (revealed) revealHookRef.current?.()
  }, [revealed])

  // SPA navigation for in-app links (no full reload).
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      const anchor = (event.target as HTMLElement | null)?.closest?.('a')
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return
      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith('/') || href.startsWith('//')) return
      event.preventDefault()
      void navigate({ to: href })
    }
    host.addEventListener('click', onClick)
    return () => host.removeEventListener('click', onClick)
  }, [navigate])

  return (
    <div
      ref={hostRef}
      {...BODY_DATA_ATTRS}
      className={
        'rm-landing dark min-h-svh w-full ' +
        BODY_CLASS +
        (revealed ? '' : ' rm-anim-paused')
      }
      style={{
        visibility: revealed ? 'visible' : 'hidden',
        colorScheme: 'dark',
      }}
    />
  )
}
