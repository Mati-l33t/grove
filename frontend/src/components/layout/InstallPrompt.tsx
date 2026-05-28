import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'grove-install-dismissed'
const DISMISS_DAYS = 14

type DeferredPrompt = { prompt(): Promise<void> }

function isDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  return Date.now() - parseInt(raw, 10) < DISMISS_DAYS * 86_400_000
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

function isIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as { MSStream?: unknown }).MSStream
  )
}

function isMobileViewport(): boolean {
  return window.innerWidth < 768 || /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<DeferredPrompt | null>(null)
  const [ios, setIos] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || isDismissed() || !isMobileViewport()) return

    // Check if the event was already captured before React mounted
    const existing = (window as unknown as Record<string, unknown>).__pwaPrompt as DeferredPrompt | undefined
    if (existing) {
      setPrompt(existing)
      setVisible(true)
      return
    }

    if (isIOS()) {
      setIos(true)
      setVisible(true)
      return
    }

    // Still listen in case the event fires after mount
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as unknown as DeferredPrompt)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 p-4 animate-in slide-in-from-bottom-4 duration-300"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-md mx-auto rounded-2xl border bg-card shadow-xl p-4">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="Grove" className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Install Grove</p>
            {ios ? (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Tap <Share className="inline h-3.5 w-3.5 mx-0.5 -mt-0.5" /> at the bottom of your
                screen, then{' '}
                <span className="font-medium text-foreground">Add to Home Screen</span>.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                Add to your home screen for quick access — no app store needed.
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!ios && (
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" className="flex-1" onClick={dismiss}>
              Not now
            </Button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={install}>
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
