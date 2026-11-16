/*
 * Eye-following characters for the auth pages.
 *
 * Faithful port of "Eyes-Follow-Mouse-Login-Website" (gokuscraper), Apache-2.0.
 * Original characters/careercompass design credited to arsh342.
 *
 * Kept IDENTICAL to the source: character colors (#6C3FF5 / #2D2D2D /
 * #FF9B6B / #E8D754), sizes, eye gaps (gap-8 / gap-6), the 80x4 pill mouth,
 * and the source's motion feel:
 *   character-transition   700ms ease-in-out (body pose + mouse sway)
 *   face-transition        700ms ease-in-out (tall/medium eye box)
 *   fast-face-transition   200ms ease-out    (wide/small eye box + mouth)
 *   pupil-transition       100ms ease-out
 *   eye-ball (blink)       150ms
 *
 * Deviations:
 * - (performance) transitions animate `transform` instead of `all`, and the
 *   400<->440 grow is scaleY — animating height/left/top reflows every frame.
 * - (correctness) characters resync from a MutationObserver on the password
 *   input's `type` attribute instead of reading DOM in a click timeout; React
 *   can commit that attribute a frame later, which used to leave the pose one
 *   click out of phase. Pose transitions always keep the source's 700ms
 *   duration, including on a show/hide flip.
 */
import { useEffect, useRef } from 'react'

type CharRole = 'tall' | 'medium' | 'wide' | 'small'

type CharDef = {
  role: CharRole
  left: number
  width: number
  height: number
  radius: string
  color: string
  zIndex: number
  eyesLeft: number
  eyesTop: number
  gap: number
  eyeSize?: number
  pupilSize: number
  maxDistance: number
  blink: boolean
  fastFace: boolean
  hasMouth?: boolean
}

// Geometry/colors taken verbatim from the source (purple/black/orange/yellow).
const CHARACTERS: CharDef[] = [
  {
    role: 'tall',
    left: 70,
    width: 180,
    height: 440,
    radius: '10px 10px 0 0',
    color: '#6C3FF5',
    zIndex: 1,
    eyesLeft: 45,
    eyesTop: 40,
    gap: 32,
    eyeSize: 18,
    pupilSize: 7,
    maxDistance: 5,
    blink: true,
    fastFace: false,
  },
  {
    role: 'medium',
    left: 240,
    width: 120,
    height: 310,
    radius: '8px 8px 0 0',
    color: '#2D2D2D',
    zIndex: 2,
    eyesLeft: 26,
    eyesTop: 32,
    gap: 24,
    eyeSize: 16,
    pupilSize: 6,
    maxDistance: 4,
    blink: true,
    fastFace: false,
  },
  {
    role: 'wide',
    left: 0,
    width: 240,
    height: 200,
    radius: '120px 120px 0 0',
    color: '#FF9B6B',
    zIndex: 3,
    eyesLeft: 82,
    eyesTop: 90,
    gap: 32,
    pupilSize: 12,
    maxDistance: 5,
    blink: false,
    fastFace: true,
  },
  {
    role: 'small',
    left: 310,
    width: 140,
    height: 230,
    radius: '70px 70px 0 0',
    color: '#E8D754',
    zIndex: 4,
    eyesLeft: 52,
    eyesTop: 40,
    gap: 24,
    pupilSize: 12,
    maxDistance: 5,
    blink: false,
    fastFace: true,
    hasMouth: true,
  },
]

const BODY_T = 'transform 700ms ease-in-out'
const FACE_T = 'transform 700ms ease-in-out'
const FAST_FACE_T = 'transform 200ms ease-out'
const PUPIL_T = 'transform 100ms ease-out'
const BLINK_T = 'transform 150ms'

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

type ViewState = {
  mouseX: number
  mouseY: number
  isTyping: boolean
  passwordLength: number
  showPassword: boolean
  isLookingAtEachOther: boolean
  isPeeking: boolean
  isTallBlinking: boolean
  isMediumBlinking: boolean
}

/**
 * Hosts the four mouse-tracking characters and wires them to the auth form
 * inside `formRef` (typing focus / password length / visibility toggle).
 */
export function EyeCharacters({
  formRef,
}: {
  formRef: React.RefObject<HTMLElement | null>
}) {
  const elsRef = useRef<Record<string, HTMLElement | null>>({})
  const rafRef = useRef(0)
  const timersRef = useRef<number[]>([])
  const stateRef = useRef<ViewState>({
    mouseX: typeof window !== 'undefined' ? window.innerWidth / 2 : 720,
    mouseY: typeof window !== 'undefined' ? window.innerHeight / 2 : 400,
    isTyping: false,
    passwordLength: 0,
    showPassword: false,
    isLookingAtEachOther: false,
    isPeeking: false,
    isTallBlinking: false,
    isMediumBlinking: false,
  })

  useEffect(() => {
    const state = stateRef.current
    const els = elsRef.current

    const setTimer = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms)
      timersRef.current.push(id)
      return id
    }

    // ---- math (faithful port of the original) ----
    const pupilPosition = (
      el: HTMLElement | null,
      maxDistance: number,
      forceX?: number,
      forceY?: number
    ) => {
      if (!el) return { x: 0, y: 0 }
      if (forceX !== undefined && forceY !== undefined)
        return { x: forceX, y: forceY }
      const r = el.getBoundingClientRect()
      const dx = state.mouseX - (r.left + r.width / 2)
      const dy = state.mouseY - (r.top + r.height / 2)
      const dist = Math.min(Math.hypot(dx, dy), maxDistance)
      const angle = Math.atan2(dy, dx)
      return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
    }

    const faceOffset = (el: HTMLElement | null) => {
      if (!el) return { faceX: 0, faceY: 0, bodySkew: 0 }
      const r = el.getBoundingClientRect()
      const dx = state.mouseX - (r.left + r.width / 2)
      const dy = state.mouseY - (r.top + r.height / 3)
      return {
        faceX: clamp(dx / 20, -15, 15),
        faceY: clamp(dy / 30, -10, 10),
        bodySkew: clamp(-dx / 120, -6, 6),
      }
    }

    const render = () => {
      const tall = faceOffset(els['tall'])
      const med = faceOffset(els['medium'])
      const wide = faceOffset(els['wide'])
      const small = faceOffset(els['small'])
      const hiding = state.passwordLength > 0 && !state.showPassword
      const opened = state.passwordLength > 0 && state.showPassword
      const typing = state.isTyping || hiding

      // Body: state pose + mouse skew combined (source formulas).
      // The tall one is authored at 440px and shown at 400 via scaleY —
      // identical to the source's height grow, without the reflow.
      const tallScale = typing ? 1 : 400 / 440
      const body = (el: HTMLElement | null, transform: string) => {
        if (el) el.style.transform = transform
      }
      body(
        els['tall'],
        opened
          ? `scaleY(${tallScale})`
          : typing
            ? `translateX(40px) skewX(${(tall.bodySkew || 0) - 12}deg) scaleY(${tallScale})`
            : `skewX(${tall.bodySkew || 0}deg) scaleY(${tallScale})`
      )
      body(
        els['medium'],
        opened
          ? 'none'
          : state.isLookingAtEachOther
            ? `translateX(20px) skewX(${(med.bodySkew || 0) * 1.5 + 10}deg)`
            : typing
              ? `skewX(${(med.bodySkew || 0) * 1.5}deg)`
              : `skewX(${med.bodySkew || 0}deg)`
      )
      body(els['wide'], opened ? 'none' : `skewX(${wide.bodySkew || 0}deg)`)
      body(els['small'], opened ? 'none' : `skewX(${small.bodySkew || 0}deg)`)

      // Eye boxes: source positions (translate instead of left/top).
      const eyes = (
        role: CharRole,
        baseX: number,
        baseY: number,
        pos: { faceX: number; faceY: number }
      ) => {
        const box = els[role + '-eyes']
        if (!box) return
        let x = baseX + (pos.faceX || 0)
        let y = baseY + (pos.faceY || 0)
        if (opened) {
          x = role === 'tall' ? 20 : role === 'medium' ? 10 : role === 'wide' ? 50 : 20
          y = role === 'tall' ? 35 : role === 'medium' ? 28 : role === 'wide' ? 85 : 35
        } else if (role === 'tall' && state.isLookingAtEachOther) {
          x = 55
          y = 65
        } else if (role === 'medium' && state.isLookingAtEachOther) {
          x = 32
          y = 12
        }
        box.style.transform = `translate(${x}px, ${y}px)`
      }
      eyes('tall', 45, 40, tall)
      eyes('medium', 26, 32, med)
      eyes('wide', 82, 90, wide)
      eyes('small', 52, 40, small)

      const mouth = els['small-mouth']
      if (mouth) {
        mouth.style.transform = opened
          ? 'translate(10px, 88px)'
          : `translate(${40 + (small.faceX || 0)}px, ${88 + (small.faceY || 0)}px)`
      }

      const tallFX = opened
        ? state.isPeeking
          ? 4
          : -4
        : state.isLookingAtEachOther
          ? 3
          : undefined
      const tallFY = opened
        ? state.isPeeking
          ? 5
          : -4
        : state.isLookingAtEachOther
          ? 4
          : undefined
      const medFX = opened ? -4 : state.isLookingAtEachOther ? 0 : undefined
      const medFY = opened ? -4 : state.isLookingAtEachOther ? -4 : undefined
      const frontFX = opened ? -5 : undefined
      const frontFY = opened ? -4 : undefined

      const eyes2 = (
        role: CharRole,
        maxDistance: number,
        blink: boolean,
        fx?: number,
        fy?: number
      ) => {
        for (const i of [1, 2]) {
          const eye = els[role + '-eye-' + i]
          const pupil = els[role + '-pupil-' + i]
          if (!pupil) continue
          if (eye) {
            const size = CHARACTERS.find((c) => c.role === role)!.eyeSize || 12
            eye.style.height = blink ? '2px' : size + 'px'
            pupil.style.opacity = blink ? '0' : '1'
          }
          if (!blink) {
            const p = pupilPosition(eye || pupil, maxDistance, fx, fy)
            pupil.style.transform = `translate(${p.x}px, ${p.y}px)`
          }
        }
      }
      eyes2('tall', 5, state.isTallBlinking, tallFX, tallFY)
      eyes2('medium', 4, state.isMediumBlinking, medFX, medFY)
      eyes2('wide', 5, false, frontFX, frontFY)
      eyes2('small', 5, false, frontFX, frontFY)
    }

    let queued = false
    const scheduleRender = () => {
      if (queued) return
      queued = true
      rafRef.current = requestAnimationFrame(() => {
        queued = false
        render()
      })
    }

    // ---- behaviour timers (source behaviour) ----
    let lookTimer = 0
    const triggerLook = () => {
      state.isLookingAtEachOther = true
      scheduleRender()
      window.clearTimeout(lookTimer)
      lookTimer = window.setTimeout(() => {
        state.isLookingAtEachOther = false
        scheduleRender()
      }, 800)
    }

    let peekTimer = 0
    let peekResetTimer = 0
    const schedulePeek = () => {
      window.clearTimeout(peekTimer)
      window.clearTimeout(peekResetTimer)
      if (state.passwordLength > 0 && state.showPassword && !reducedMotion) {
        peekTimer = window.setTimeout(() => {
          state.isPeeking = true
          scheduleRender()
          peekResetTimer = window.setTimeout(() => {
            state.isPeeking = false
            scheduleRender()
            schedulePeek()
          }, 800)
        }, Math.random() * 3000 + 2000)
      } else {
        state.isPeeking = false
        scheduleRender()
      }
    }

    const scheduleBlink = (key: 'isTallBlinking' | 'isMediumBlinking') => {
      if (reducedMotion) return
      setTimer(() => {
        state[key] = true
        scheduleRender()
        setTimer(() => {
          state[key] = false
          scheduleRender()
          scheduleBlink(key)
        }, 150)
      }, Math.random() * 4000 + 3000)
    }

    // ---- input wiring (any auth form inside formRef) ----
    // PasswordInput tags its input, so we never mistake a username/OTP field
    // for the password field (which used to desync the characters after a
    // visibility toggle).
    const scanPassword = () => {
      const root = formRef.current
      if (!root) return
      const inputs = Array.from(root.querySelectorAll('input'))
      const pw =
        inputs.find((i) => i.hasAttribute('data-password-input')) ??
        inputs.find((i) => {
          const hint =
            (i.name || '') +
            ' ' +
            (i.id || '') +
            ' ' +
            (i.autocomplete || '')
          return (
            i.type === 'password' ||
            (i.type === 'text' && /pass|密码/i.test(hint))
          )
        })
      if (!pw) {
        state.passwordLength = 0
        state.showPassword = false
        return
      }
      state.passwordLength = pw.value.length
      state.showPassword = pw.type === 'text'
    }

    const onFocusIn = (event: Event) => {
      const target = event.target as HTMLElement
      if (target.tagName !== 'INPUT') return
      state.isTyping = true
      scanPassword()
      triggerLook()
      schedulePeek()
      scheduleRender()
    }
    const onFocusOut = (event: Event) => {
      const target = event.target as HTMLElement
      if (target.tagName !== 'INPUT') return
      state.isTyping = false
      scanPassword()
      scheduleRender()
    }
    const onInput = () => {
      scanPassword()
      schedulePeek()
      scheduleRender()
    }
    const onClick = () => {
      // A native bubble listener runs BEFORE React commits the new input
      // type, so reading it here (or in a 0ms timeout) used to lag one click
      // behind. The type MutationObserver below is authoritative now; this
      // frame only refreshes length / peek scheduling for the same click.
      requestAnimationFrame(() => {
        scanPassword()
        schedulePeek()
        scheduleRender()
      })
    }
    const onMouseMove = (event: MouseEvent) => {
      state.mouseX = event.clientX
      state.mouseY = event.clientY
      scheduleRender()
    }

    window.addEventListener('mousemove', onMouseMove)
    const root = formRef.current
    if (root) {
      root.addEventListener('focusin', onFocusIn)
      root.addEventListener('focusout', onFocusOut)
      root.addEventListener('input', onInput)
      root.addEventListener('click', onClick)
    }

    // Watch the DOM, not the click: React may flush the type change in a
    // microtask, on a later frame, or after another state update. Any
    // actual `type` mutation resyncs the characters immediately, so the
    // visibility toggle can never be one click out of phase.
    const typeObserver =
      root && typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            scanPassword()
            schedulePeek()
            scheduleRender()
          })
        : null
    if (root && typeObserver) {
      typeObserver.observe(root, {
        attributes: true,
        attributeFilter: ['type'],
        subtree: true,
      })
    }

    scanPassword()
    scheduleBlink('isTallBlinking')
    scheduleBlink('isMediumBlinking')
    render()

    return () => {
      cancelAnimationFrame(rafRef.current)
      typeObserver?.disconnect()
      window.clearTimeout(lookTimer)
      window.clearTimeout(peekTimer)
      window.clearTimeout(peekResetTimer)
      for (const id of timersRef.current) window.clearTimeout(id)
      timersRef.current = []
      window.removeEventListener('mousemove', onMouseMove)
      if (root) {
        root.removeEventListener('focusin', onFocusIn)
        root.removeEventListener('focusout', onFocusOut)
        root.removeEventListener('input', onInput)
        root.removeEventListener('click', onClick)
      }
    }
  }, [formRef])

  return (
    <div
      aria-hidden='true'
      style={{ position: 'relative', width: 550, height: 400 }}
    >
      {CHARACTERS.map((c) => (
        <div
          key={c.role}
          ref={(el) => {
            elsRef.current[c.role] = el
          }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: c.left,
            width: c.width,
            height: c.height,
            background: c.color,
            borderRadius: c.radius,
            zIndex: c.zIndex,
            transformOrigin: 'bottom center',
            willChange: 'transform',
            transition: reducedMotion ? undefined : BODY_T,
          }}
        >
          <div
            ref={(el) => {
              elsRef.current[c.role + '-eyes'] = el
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${c.eyesLeft}px, ${c.eyesTop}px)`,
              display: 'flex',
              gap: c.gap,
              willChange: 'transform',
              transition: reducedMotion
                ? undefined
                : c.fastFace
                  ? FAST_FACE_T
                  : FACE_T,
            }}
          >
            {[1, 2].map((i) =>
              c.eyeSize ? (
                <div
                  key={i}
                  ref={(el) => {
                    elsRef.current[c.role + '-eye-' + i] = el
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: c.eyeSize,
                    height: c.eyeSize,
                    background: '#fff',
                    borderRadius: 9999,
                    overflow: 'hidden',
                    transition: reducedMotion ? undefined : BLINK_T,
                  }}
                >
                  <div
                    ref={(el) => {
                      elsRef.current[c.role + '-pupil-' + i] = el
                    }}
                    style={{
                      width: c.pupilSize,
                      height: c.pupilSize,
                      background: '#2D2D2D',
                      borderRadius: 9999,
                      willChange: 'transform',
                      transition: reducedMotion ? undefined : PUPIL_T,
                    }}
                  />
                </div>
              ) : (
                <div
                  key={i}
                  ref={(el) => {
                    elsRef.current[c.role + '-pupil-' + i] = el
                  }}
                  style={{
                    width: c.pupilSize,
                    height: c.pupilSize,
                    background: '#2D2D2D',
                    borderRadius: 9999,
                    willChange: 'transform',
                    transition: reducedMotion ? undefined : PUPIL_T,
                  }}
                />
              )
            )}
          </div>
          {c.hasMouth && (
            <div
              ref={(el) => {
                elsRef.current['small-mouth'] = el
              }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 80,
                height: 4,
                background: '#2D2D2D',
                borderRadius: 9999,
                transform: 'translate(40px, 88px)',
                willChange: 'transform',
                transition: reducedMotion ? undefined : FAST_FACE_T,
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
