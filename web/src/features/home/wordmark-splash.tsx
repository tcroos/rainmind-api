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

/*
 * Entry splash — 1:1 clone of the landing footer wordmark (see gateway-landing):
 *   - viewBox 0 0 520 100, textLength=480 spacingAndGlyphs, pathLength=1000
 *   - hairline stroke-width 0.3, font helvetica bold 72u (text-7xl)
 *   - layer 1: 20% white stroke drawn over 2.8s (footer's exact WAAPI call)
 *   - layer 2: --brand gradient behind the radial white→black mask, radius
 *     grows after the draw (the footer's hover spotlight, automated)
 *
 * Timing contract:
 * - The splash is rendered from the FIRST paint (Home mounts it above the
 *   content tree) so the interface never flashes before the text appears.
 * - The black-hole runtime is deferred by LandingHome until the stroke has
 *   finished drawing, so the draw stays smooth (no shader compile jank).
 * - When the glow completes, the page is revealed UNDER the fading splash
 *   immediately (crossfade) — never wait on the black hole; it fades in on
 *   its own once compiled.
 */
const SPLASH_CSS = `
.rm-splash {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 450ms cubic-bezier(0.4, 0, 0.2, 1);
}
.rm-splash-out {
  opacity: 0;
  pointer-events: none;
}
.rm-splash-stage {
  width: min(90vw, 1160px);
  aspect-ratio: 520 / 100;
}
.rm-splash-stage svg {
  width: 100%;
  height: 100%;
}
.rm-splash-text,
.rm-splash-fill {
  font-family: helvetica;
  font-size: 72px;
  font-weight: 700;
  fill: transparent;
}
.rm-splash-text {
  stroke: rgba(255, 255, 255, 0.2);
}
@media (prefers-reduced-motion: reduce) {
  .rm-splash {
    transition-duration: 1ms;
  }
}
`

const BRAND = 'oklch(60.6% .25 292.72)'
const BRAND_SECONDARY = 'oklch(66.7% .29 322.15)'

const DRAW = 2000
const COLOR = 900
const HOLD = 150
const FADE = 450

export function WordmarkSplash({
  onReveal,
  onDone,
}: {
  onReveal: () => void
  onDone: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const svg = root.querySelector('svg')
    const base = svg?.querySelector('text') as SVGTextElement | null
    const grad = svg?.querySelector('linearGradient') as SVGElement | null
    const reveal = svg?.querySelector('radialGradient') as SVGElement | null
    if (!svg || !base || !grad || !reveal) {
      onDone()
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Footer's exact draw setup.
    const dash = 1000
    base.style.strokeDasharray = String(dash)
    base.style.strokeDashoffset = String(reduced ? 0 : dash)

    for (const [offset, color] of [
      ['0%', BRAND],
      ['50%', BRAND_SECONDARY],
      ['100%', BRAND],
    ] as const) {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
      stop.setAttribute('offset', offset)
      stop.setAttribute('stop-color', color)
      grad.appendChild(stop)
    }

    reveal.setAttribute('cx', '50%')
    reveal.setAttribute('cy', '50%')
    reveal.setAttribute('r', reduced ? '80%' : '0%')

    let raf = 0
    let glowTimer = 0
    let revealTimer = 0
    let doneTimer = 0

    const glowIn = () => {
      const t0 = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / COLOR)
        const eased = 1 - Math.pow(1 - p, 3)
        reveal.setAttribute('r', 80 * eased + '%')
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    // 发光结束后完整走完「变色」并停留一拍（保留最终变色态），再丝滑
    // 交叉淡入页面。不等待黑洞，黑洞编译完会自行淡入。
    const enterPage = () => {
      onReveal()
      root.classList.add('rm-splash-out')
      doneTimer = window.setTimeout(onDone, FADE)
    }

    const started = Date.now()
    if (reduced) {
      revealTimer = window.setTimeout(enterPage, 150)
    } else {
      base.animate(
        [{ strokeDashoffset: dash }, { strokeDashoffset: 0 }],
        { duration: DRAW, easing: 'ease-in-out', fill: 'forwards' }
      )
      glowTimer = window.setTimeout(glowIn, DRAW)
      const remaining = Math.max(
        0,
        DRAW + COLOR + HOLD - (Date.now() - started)
      )
      revealTimer = window.setTimeout(enterPage, remaining)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(glowTimer)
      window.clearTimeout(revealTimer)
      window.clearTimeout(doneTimer)
    }
  }, [onReveal, onDone])

  return (
    <div ref={rootRef} className='rm-splash'>
      <style>{SPLASH_CSS}</style>
      <div className='rm-splash-stage'>
        <svg viewBox='0 0 520 100' xmlns='http://www.w3.org/2000/svg' className='select-none'>
          <defs>
            <linearGradient
              id='rm-splash-grad'
              gradientUnits='userSpaceOnUse'
              cx='50%'
              cy='50%'
              r='25%'
            ></linearGradient>
            <radialGradient
              id='rm-splash-reveal'
              gradientUnits='objectBoundingBox'
              r='20%'
              cx='50%'
              cy='50%'
            >
              <stop offset='0%' stopColor='white'></stop>
              <stop offset='100%' stopColor='black'></stop>
            </radialGradient>
            <mask id='rm-splash-mask'>
              <rect x='0' y='0' width='100%' height='100%' fill='url(#rm-splash-reveal)'></rect>
            </mask>
          </defs>
          <text
            x='50%'
            y='50%'
            textAnchor='middle'
            dominantBaseline='middle'
            strokeWidth='0.3'
            pathLength='1000'
            textLength='480'
            lengthAdjust='spacingAndGlyphs'
            className='rm-splash-text'
            strokeDashoffset='1000'
            strokeDasharray='1000'
          >
            RainMind API
          </text>
          <text
            x='50%'
            y='50%'
            textAnchor='middle'
            dominantBaseline='middle'
            stroke='url(#rm-splash-grad)'
            strokeWidth='0.3'
            textLength='480'
            lengthAdjust='spacingAndGlyphs'
            mask='url(#rm-splash-mask)'
            className='rm-splash-fill'
          >
            RainMind API
          </text>
        </svg>
      </div>
    </div>
  )
}
