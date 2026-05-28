import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useInstanceSettings } from '@/hooks/useAdmin'
import pb from '@/lib/pb'
import type { Household as HouseholdType } from '@/types'
import AppShell from '@/components/layout/AppShell'
import InstallPrompt from '@/components/layout/InstallPrompt'
import Today from '@/pages/Today'
import Calendar from '@/pages/Calendar'
import Lists from '@/pages/Lists'
import ListDetail from '@/pages/ListDetail'
import Recipes from '@/pages/Recipes'
import RecipeDetail from '@/pages/RecipeDetail'
import MealPlan from '@/pages/MealPlan'
import Household from '@/pages/Household'
import Settings from '@/pages/Settings'
import Chat from '@/pages/Chat'
import School from '@/pages/School'
import Admin from '@/pages/Admin'
import Login from '@/pages/Login'
import Register from '@/pages/Register'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <AppShell>{children}</AppShell> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (!user.is_admin) return <Navigate to="/" replace />
  return <AppShell>{children}</AppShell>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  const { user, household, setHousehold } = useAuthStore()
  const theme = useThemeStore((s) => s.theme)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: appSettings } = useInstanceSettings()

  useEffect(() => {
    if (user?.household && !household) {
      pb.collection('households')
        .getOne(user.household, { expand: 'owner' })
        .then((h) => setHousehold(h as unknown as HouseholdType))
        .catch(() => {})
    }
  }, [user?.household])

  useEffect(() => {
    const url = appSettings?.logo
      ? pb.files.getUrl(appSettings as never, appSettings.logo)
      : null
    document.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="apple-touch-icon"]')
      .forEach((el) => {
        el.href = url ?? (el.type === 'image/svg+xml' ? '/logo.svg' : '/icons/icon-192.png')
      })
  }, [appSettings?.logo])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE') navigate(event.data.url)
      if (event.data?.type === 'REFRESH') queryClient.invalidateQueries()
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  return (
    <>
    <Toaster richColors theme={theme} position="top-right" />
    <InstallPrompt />
    <Routes>
      <Route path="/login"    element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

      <Route path="/"                   element={<ProtectedRoute><Today /></ProtectedRoute>} />
      <Route path="/calendar"           element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/lists"              element={<ProtectedRoute><Lists /></ProtectedRoute>} />
      <Route path="/lists/:id"          element={<ProtectedRoute><ListDetail /></ProtectedRoute>} />
      <Route path="/recipes"            element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
      <Route path="/recipes/new"        element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
      <Route path="/recipes/:id"        element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
      <Route path="/recipes/:id/edit"   element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
      <Route path="/meal-plan"          element={<ProtectedRoute><MealPlan /></ProtectedRoute>} />
      <Route path="/household"          element={<ProtectedRoute><Household /></ProtectedRoute>} />
      <Route path="/settings"                  element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/household"       element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/notifications"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/chat"               element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/school"             element={<ProtectedRoute><School /></ProtectedRoute>} />

      <Route path="/admin"          element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="/admin/users"    element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><Admin /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
