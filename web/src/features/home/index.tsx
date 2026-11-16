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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { RichContent } from '@/components/rich-content'
import { useTheme } from '@/context/theme-provider'
import { isLikelyHtml } from '@/lib/content-format'

import { useHomePageContent } from './hooks'
import { LandingHome } from './landing-home'
import { WordmarkSplash } from './wordmark-splash'

export function Home() {
  const { i18n, t } = useTranslation()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { resolvedTheme } = useTheme()
  const { content, isLoaded, isUrl } = useHomePageContent()
  // Entry splash is rendered from the FIRST paint (below, in every branch) so
  // the interface never flashes before the wordmark appears. Two-phase reveal:
  // the page becomes visible UNDER the fading splash (onReveal) as soon as the
  // glow finishes — never gated on the black hole — and the splash unmounts
  // once the crossfade completes (onDone).
  const [revealed, setRevealed] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const handleReveal = useCallback(() => setRevealed(true), [])
  const handleSplashDone = useCallback(() => setSplashDone(true), [])

  // Custom home content (admin-configured) has no landing splash to run.
  useEffect(() => {
    if (isLoaded && content) {
      setRevealed(true)
      setSplashDone(true)
    }
  }, [isLoaded, content])

  const syncIframePreferences = useCallback(() => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { themeMode: resolvedTheme },
        '*'
      )
      iframeRef.current?.contentWindow?.postMessage(
        { lang: i18n.language },
        '*'
      )
    } catch {
      // Cross-origin frames may reject access while navigating.
    }
  }, [i18n.language, resolvedTheme])

  useEffect(() => {
    if (isUrl) {
      syncIframePreferences()
    }
  }, [isUrl, syncIframePreferences])

  const splash = !splashDone ? (
    <WordmarkSplash onReveal={handleReveal} onDone={handleSplashDone} />
  ) : null

  if (!isLoaded) {
    // Same tree shape as the default branch so LandingHome is NOT remounted
    // when the content query resolves (keeps the black-hole warm-up intact).
    return (
      <>
        {splash}
        <PublicLayout showMainContainer={false}>
          <LandingHome revealed={revealed} />
        </PublicLayout>
      </>
    )
  }

  if (content) {
    if (isUrl) {
      return (
        <PublicLayout showMainContainer={false}>
          {/*
            allow-top-navigation-by-user-activation: the custom home page URL is
            admin-configured (trusted); this lets its target="_top" nav/menu links
            navigate the top-level window on user click. The default sandbox blocks
            this on desktop, while some mobile browsers allow it via allow-popups,
            causing inconsistent behavior. This token only permits user-activated
            top-level navigation and does NOT grant same-origin access.
          */}
          <iframe
            ref={iframeRef}
            src={content}
            className='h-screen w-full border-none'
            title={t('Custom Home Page')}
            sandbox='allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation-by-user-activation'
            onLoad={syncIframePreferences}
          />
        </PublicLayout>
      )
    }

    const contentIsHtml = isLikelyHtml(content)

    if (contentIsHtml) {
      return (
        <PublicLayout showMainContainer={false}>
          <RichContent
            mode='html'
            htmlVariant='isolated'
            content={content}
            className='custom-home-content'
          />
        </PublicLayout>
      )
    }

    return (
      <PublicLayout>
        <div className='mx-auto max-w-6xl px-4 py-8'>
          <RichContent
            mode='markdown'
            content={content}
            className='custom-home-content'
          />
        </div>
      </PublicLayout>
    )
  }

  // Default home: new-api's original PublicHeader on top (the contract — its
  // layout/design must not be replaced), RainMind landing content below.
  return (
    <>
      {splash}
      <PublicLayout showMainContainer={false}>
        <LandingHome revealed={revealed} />
      </PublicLayout>
    </>
  )
}
