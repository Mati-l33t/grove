import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import pb from '@/lib/pb'
import type { User, Household, UserPermissions } from '@/types'

export interface ResolvedPermissions {
  events: boolean
  lists: boolean
  recipes: boolean
  meal_plan: boolean
}

function resolvePermissions(user: User | null): ResolvedPermissions {
  const p: UserPermissions = user?.permissions ?? {}
  return {
    events:   p.events   !== false,
    lists:    p.lists    !== false,
    recipes:  p.recipes  !== false,
    meal_plan: p.meal_plan !== false,
  }
}

interface AuthState {
  user: User | null
  household: Household | null
  isAuthenticated: boolean
  permissions: ResolvedPermissions
  setUser: (user: User | null) => void
  setHousehold: (household: Household | null) => void
  logout: () => void
}

const defaultPermissions: ResolvedPermissions = {
  events: true, lists: true, recipes: true, meal_plan: true,
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      household: null,
      isAuthenticated: false,
      permissions: defaultPermissions,
      setUser: (user) => set({
        user,
        isAuthenticated: !!user,
        permissions: resolvePermissions(user),
      }),
      setHousehold: (household) => set({ household }),
      logout: () => {
        pb.authStore.clear()
        set({ user: null, household: null, isAuthenticated: false, permissions: defaultPermissions })
      },
    }),
    {
      name: 'grove-auth',
      partialize: (state) => ({ user: state.user, household: state.household }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (pb.authStore.isValid && pb.authStore.model) {
          const u = pb.authStore.model as unknown as User
          state.user = u
          state.isAuthenticated = true
          state.permissions = resolvePermissions(u)
        } else {
          state.user = null
          state.household = null
          state.isAuthenticated = false
          state.permissions = defaultPermissions
        }
      },
    }
  )
)
