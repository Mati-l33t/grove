import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import pb from '@/lib/pb'
import type { AdminUser, AiSettings, InstanceSettings, SmtpSettings, UserPermissions } from '@/types'

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [users, households, events, lists, recipes] = await Promise.all([
        pb.collection('users').getList(1, 1),
        pb.collection('households').getList(1, 1),
        pb.collection('events').getList(1, 1),
        pb.collection('lists').getList(1, 1),
        pb.collection('recipes').getList(1, 1),
      ])
      return {
        users: users.totalItems,
        households: households.totalItems,
        events: events.totalItems,
        lists: lists.totalItems,
        recipes: recipes.totalItems,
      }
    },
  })
}

export function useAdminHouseholds() {
  return useQuery({
    queryKey: ['admin', 'households'],
    queryFn: async () => {
      const result = await pb.collection('households').getList(1, 50, { sort: 'name' })
      return result.items as unknown as Array<{ id: string; name: string; invite_code: string }>
    },
  })
}

export function useAdminUsers(page: number, search: string) {
  return useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: async () => {
      const safe = search.trim().replace(/"/g, '')
      const filter = safe ? `name ~ "${safe}" || email ~ "${safe}"` : ''
      const result = await pb.collection('users').getList(page, 20, {
        filter,
        expand: 'household',
        sort: 'name',
      })
      return { ...result, items: result.items as unknown as AdminUser[] }
    },
  })
}

export function useAdminCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string; username: string; email: string; password: string
      color: string; role: 'adult' | 'child'; is_admin: boolean
      permissions: UserPermissions; household: string | null
    }) => {
      const hasEmail = data.email.trim().length > 0
      const email = hasEmail
        ? data.email.trim()
        : `no-email-${Math.random().toString(16).slice(2, 10)}@grove.local`
      return pb.collection('users').create({
        ...data,
        email,
        passwordConfirm: data.password,
        emailVisibility: hasEmail,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useAdminUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, avatar, newPassword, ...data }: {
      id: string; name: string; username: string; color: string
      role: 'adult' | 'child'; is_admin: boolean
      permissions: UserPermissions; household: string | null
      avatar?: File | null; newPassword?: string
    }) => {
      const payload: Record<string, unknown> = { ...data }
      if (newPassword) {
        payload.password = newPassword
        payload.passwordConfirm = newPassword
      }
      if (avatar) {
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) =>
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''))
        )
        fd.append('avatar', avatar)
        return pb.collection('users').update(id, fd)
      }
      return pb.collection('users').update(id, payload)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => pb.collection('users').delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useInstanceSettings() {
  return useQuery({
    queryKey: ['admin', 'instance_settings'],
    queryFn: async () => {
      const result = await pb.collection('instance_settings').getList(1, 1)
      return (result.items[0] as unknown as InstanceSettings) ?? null
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useSmtpSettings() {
  return useQuery({
    queryKey: ['admin', 'smtp_settings'],
    queryFn: async () => {
      const result = await pb.collection('smtp_settings').getList(1, 1)
      return (result.items[0] as unknown as SmtpSettings) ?? null
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useSaveSmtpSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SmtpSettings> & Omit<SmtpSettings, 'id'>) => {
      return id
        ? pb.collection('smtp_settings').update(id, data)
        : pb.collection('smtp_settings').create(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'smtp_settings'] }),
  })
}

export function useAiSettings() {
  return useQuery({
    queryKey: ['admin', 'ai_settings'],
    queryFn: async () => {
      const result = await pb.collection('ai_settings').getList(1, 1)
      return (result.items[0] as unknown as AiSettings) ?? null
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSaveAiSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AiSettings> & Omit<AiSettings, 'id'>) => {
      return id
        ? pb.collection('ai_settings').update(id, data)
        : pb.collection('ai_settings').create(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ai_settings'] }),
  })
}

export function useUploadInstanceLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData()
      fd.append('logo', file)
      return pb.collection('instance_settings').update(id, fd)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'instance_settings'] }),
  })
}

export function useRemoveInstanceLogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, filename }: { id: string; filename: string }) => {
      return pb.collection('instance_settings').update(id, { 'logo-': filename })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'instance_settings'] }),
  })
}

export function useSaveInstanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id, app_name, registration_open, default_theme,
    }: { id?: string; app_name: string; registration_open: boolean; default_theme: 'dark' | 'light' }) => {
      const data = { app_name, registration_open, default_theme }
      return id
        ? pb.collection('instance_settings').update(id, data)
        : pb.collection('instance_settings').create(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'instance_settings'] }),
  })
}

export interface UpdateInfo {
  current: string
  latest: string
  hasUpdate: boolean
  releaseUrl: string
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb2 = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb2[i] ?? 0)) return 1
    if ((pa[i] ?? 0) < (pb2[i] ?? 0)) return -1
  }
  return 0
}

export function useUpdateCheck(enabled = true) {
  return useQuery<UpdateInfo | null>({
    queryKey: ['update-check'],
    enabled,
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const res = await fetch('https://api.github.com/repos/Mati-l33t/grove/releases/latest')
      if (!res.ok) return null
      const data = await res.json() as { tag_name?: string; html_url?: string }
      const latest = data.tag_name?.replace(/^v/, '') ?? ''
      if (!latest) return null
      const current = __APP_VERSION__
      return {
        current,
        latest,
        hasUpdate: compareVersions(latest, current) > 0,
        releaseUrl: data.html_url ?? '',
      }
    },
  })
}

export function useRunUpdate() {
  return useMutation({
    mutationFn: () => pb.send('/api/grove/run-update', { method: 'POST' }),
  })
}

export function useGroveRuntime(enabled = true) {
  return useQuery<'docker' | 'lxc'>({
    queryKey: ['grove-runtime'],
    enabled,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await pb.send('/api/grove/runtime', { method: 'GET' }) as { runtime: string }
      return res.runtime === 'docker' ? 'docker' : 'lxc'
    },
  })
}
