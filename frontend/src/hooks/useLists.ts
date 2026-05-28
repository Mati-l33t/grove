import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import type { List, ListItem, ShareMode } from '@/types'

function buildScope(userId: string, householdId?: string): string {
  const base = `(user = "${userId}" || shared_with ~ "${userId}" || assigned_to = "${userId}")`
  return householdId ? `(${base} || household = "${householdId}")` : base
}

export function useActiveLists() {
  const { user, household } = useAuthStore()

  return useQuery({
    queryKey: ['lists', 'active', user?.id, household?.id],
    queryFn: async () => {
      const scope = buildScope(user!.id, household?.id)
      const records = await pb.collection('lists').getFullList({
        filter: `${scope} && archived = false`,
        sort: 'name',
        expand: 'user,assigned_to',
      })
      return records as unknown as List[]
    },
    enabled: !!user,
  })
}

export function useList(id: string | undefined) {
  return useQuery({
    queryKey: ['lists', 'detail', id],
    queryFn: async () => {
      const record = await pb.collection('lists').getOne(id!, { expand: 'user,assigned_to' })
      return record as unknown as List
    },
    enabled: !!id,
  })
}

export function useListItems(listId: string | undefined) {
  return useQuery({
    queryKey: ['list-items', listId],
    queryFn: async () => {
      const records = await pb.collection('list_items').getFullList({
        filter: `list = "${listId!}"`,
        sort: 'order,created',
        expand: 'added_by',
      })
      return records as unknown as ListItem[]
    },
    enabled: !!listId,
  })
}

export function useCreateList() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()

  return useMutation({
    mutationFn: async ({ name, type, color, shareMode, sharedWith, assignedTo }: {
      name: string
      type: 'todo' | 'shopping'
      color: string
      shareMode: ShareMode
      sharedWith: string[]
      assignedTo?: string
    }) => {
      return pb.collection('lists').create({
        name,
        type,
        color,
        user: user!.id,
        household: shareMode === 'household' && household?.id ? household.id : null,
        shared_with: shareMode === 'members' ? sharedWith : [],
        assigned_to: assignedTo || null,
        archived: false,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
  })
}

export function useUpdateList() {
  const queryClient = useQueryClient()
  const { household } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string
      data: Partial<Pick<List, 'name' | 'color' | 'type'>> & {
        shareMode?: ShareMode
        sharedWith?: string[]
        assignedTo?: string | null
      }
    }) => {
      const { shareMode, sharedWith, assignedTo, ...rest } = data
      const sharingFields = shareMode !== undefined ? {
        household: shareMode === 'household' && household?.id ? household.id : null,
        shared_with: shareMode === 'members' ? (sharedWith ?? []) : [],
      } : {}
      const assignFields = assignedTo !== undefined ? { assigned_to: assignedTo } : {}
      return pb.collection('lists').update(id, { ...rest, ...sharingFields, ...assignFields })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
  })
}

export function useArchiveList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return pb.collection('lists').update(id, { archived: true })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
  })
}

export function useDeleteList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return pb.collection('lists').delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
  })
}

export function useCreateListItem() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ listId, text }: { listId: string; text: string }) => {
      return pb.collection('list_items').create({
        list: listId,
        text: text.trim(),
        checked: false,
        order: 0,
        added_by: user!.id,
      })
    },
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
    },
  })
}

export function useToggleListItem(listId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      return pb.collection('list_items').update(id, { checked })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
    },
  })
}

export function useDeleteListItem(listId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      return pb.collection('list_items').delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
    },
  })
}
