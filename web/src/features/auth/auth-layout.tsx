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
import { Link } from '@tanstack/react-router'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/context/theme-provider'
import { useSystemConfig } from '@/hooks/use-system-config'

import { EyeCharacters } from './eye-characters'

type AuthLayoutProps = {
  children: React.ReactNode
}

// Theme-aware starfield panel (same composition in both themes):
// dark  = deep-space gradient + white stars (home-page mood)
// light = soft sky gradient + faint slate stars
const DARK_BASE =
  'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(139,92,246,0.16), transparent 65%), ' +
  'linear-gradient(150deg, #0B0B12 0%, #171233 52%, #2A1650 100%)'
const LIGHT_BASE =
  'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(139,92,246,0.10), transparent 65%), ' +
  'linear-gradient(150deg, #F4F6FB 0%, #E7EDF6 52%, #D8E1EF 100%)'
const buildStars = (rgb: string, alphaScale: number) => {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const dots: string[] = []
  for (let i = 0; i < 52; i++) {
    const x = (rnd() * 100).toFixed(1)
    const y = (rnd() * 100).toFixed(1)
    const size = rnd() > 0.78 ? 2 : 1
    const opacity = ((0.22 + rnd() * 0.55) * alphaScale).toFixed(2)
    dots.push(
      `radial-gradient(${size}px ${size}px at ${x}% ${y}%, rgba(${rgb},${opacity}), transparent)`
    )
  }
  return dots.join(', ')
}
const STARS_DARK = buildStars('255,255,255', 1)
const STARS_LIGHT = buildStars('90,110,160', 0.55)

/**
 * Shared auth shell (sign-in / sign-up / forgot / OTP / passkey).
 * Left: RainMind brand panel with the eye-following characters (desktop).
 * Right: the untouched auth form flows.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()
  const { resolvedTheme } = useTheme()
  const formRef = useRef<HTMLDivElement>(null)
  const isDark = resolvedTheme === 'dark'

  return (
    <div className='relative grid h-svh max-w-none lg:grid-cols-2'>
      {/* Theme-aware starfield brand panel (desktop only) */}
      <div
        className='relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between'
        style={{
          background: isDark
            ? STARS_DARK + ', ' + DARK_BASE
            : STARS_LIGHT + ', ' + LIGHT_BASE,
        }}
      >
        <div className='relative z-20 flex items-center gap-2.5 p-10'>
          <Link to='/' className='flex items-center gap-2.5'>
            <div
              className={`relative h-9 w-9 overflow-hidden rounded-lg p-1 ${isDark ? 'bg-white/10' : 'bg-slate-900/5'}`}
            >
              {loading ? (
                <Skeleton className='absolute inset-0 rounded-lg' />
              ) : (
                <img
                  src={logo}
                  alt={t('Logo')}
                  className='h-full w-full object-contain'
                />
              )}
            </div>
            <span
              className={`text-lg font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}
            >
              {loading ? <Skeleton className='h-6 w-24' /> : systemName}
            </span>
          </Link>
        </div>

        <div className='relative z-20 flex items-end justify-center pb-0'>
          <div className='origin-bottom scale-90 xl:scale-100'>
            <EyeCharacters formRef={formRef} />
          </div>
        </div>

        <div
          className={`relative z-20 flex items-center gap-6 px-10 pb-8 text-xs ${isDark ? 'text-white/60' : 'text-slate-500'}`}
        >
          <Link
            to='/privacy-policy'
            className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-800'}`}
          >
            {t('Privacy Policy')}
          </Link>
          <Link
            to='/user-agreement'
            className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-slate-800'}`}
          >
            {t('User Agreement')}
          </Link>
        </div>
      </div>

      {/* Form column (all auth flows render here, logic untouched) */}
      <div ref={formRef} className='relative flex items-center'>
        <Link
          to='/'
          className='absolute top-4 left-4 z-10 flex items-center gap-2 transition-opacity hover:opacity-80 sm:top-8 sm:left-8 lg:hidden'
        >
          <div className='relative h-8 w-8'>
            {loading ? (
              <Skeleton className='absolute inset-0 rounded-full' />
            ) : (
              <img
                src={logo}
                alt={t('Logo')}
                className='h-8 w-8 rounded-full object-cover'
              />
            )}
          </div>
          {loading ? (
            <Skeleton className='h-6 w-24' />
          ) : (
            <h1 className='text-xl font-medium'>{systemName}</h1>
          )}
        </Link>
        <div className='container flex items-center pt-16 sm:pt-0'>
          <div className='mx-auto flex w-full flex-col justify-center space-y-2 px-4 py-8 sm:w-[480px] sm:p-8'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
