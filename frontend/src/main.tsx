import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { NotificationProvider } from './hooks/useNotifications'
import pb from './lib/pb'
import { useAuthStore } from './stores/authStore'
import type { User } from './types'
import './index.css'

const stored = localStorage.getItem('grove-theme')
const savedTheme = stored ? JSON.parse(stored)?.state?.theme : null
document.documentElement.classList.toggle('dark', savedTheme !== 'light')

// If no saved preference, check instance settings for the configured default
if (!savedTheme) {
  fetch('/api/collections/instance_settings/records?perPage=1')
    .then((r) => r.json())
    .then((data) => {
      const defaultTheme = data?.items?.[0]?.default_theme
      if (defaultTheme === 'light') {
        document.documentElement.classList.remove('dark')
        const current = localStorage.getItem('grove-theme')
        if (!current) {
          localStorage.setItem('grove-theme', JSON.stringify({ state: { theme: 'light' } }))
        }
      }
    })
    .catch(() => {})
}

// Capture beforeinstallprompt before React mounts — the event fires early and
// would be missed if we only listen inside a component's useEffect.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as unknown as Record<string, unknown>).__pwaPrompt = e
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // staleTime: 0 — data is always stale so every mount/focus triggers a
      // background refetch while the cached value is shown instantly.
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

// Invalidate everything when the PWA is brought back to the foreground.
// visibilitychange is more reliable than window focus in standalone PWA mode.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    queryClient.invalidateQueries()
  }
})

// Register Periodic Background Sync so Android Chrome can wake the service
// worker every ~15 minutes to push a REFRESH message to open clients.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(async (reg) => {
    try {
      const ps = (reg as ServiceWorkerRegistration & {
        periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> }
      }).periodicSync
      if (ps) {
        await ps.register('grove-refresh', { minInterval: 15 * 60 * 1000 })
      }
    } catch {
      // Periodic Background Sync not supported on this platform — no-op
    }
  })
}

// Keep the auth store in sync with PocketBase's own auth state (token refresh, expiry, etc.)
// Only sync Zustand state here — do not call logout(), which calls pb.authStore.clear()
// and would re-trigger this callback recursively.
pb.authStore.onChange((_, model) => {
  const { setUser, setHousehold } = useAuthStore.getState()
  if (model) {
    setUser(model as unknown as User)
  } else {
    setUser(null)
    setHousehold(null)
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
