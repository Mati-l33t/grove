import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import type { SchoolChild, SchoolSchedule, SchoolLunch, SchoolAssignment, WeekDay, AssignmentType } from '@/types'

function buildScope(userId: string, householdId?: string): string {
  return householdId
    ? `(user = "${userId}" || household = "${householdId}")`
    : `user = "${userId}"`
}

export function useSchoolChildren() {
  const { user, household } = useAuthStore()
  return useQuery({
    queryKey: ['school', 'children', user?.id, household?.id],
    queryFn: async () => {
      const scope = buildScope(user!.id, household?.id)
      const records = await pb.collection('school_children').getFullList({ filter: scope, sort: 'name', expand: 'user' })
      return records as unknown as SchoolChild[]
    },
    enabled: !!user,
  })
}

export function useCreateChild() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()
  return useMutation({
    mutationFn: async ({ userId, ...data }: { name: string; school_name: string; grade: string; color: string; userId?: string }) => {
      return pb.collection('school_children').create({
        ...data, user: userId || user!.id, household: household?.id || null,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school', 'children'] }),
  })
}

export function useUpdateChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId, ...data }: { id: string; name: string; school_name: string; grade: string; color: string; userId?: string }) => {
      return pb.collection('school_children').update(id, { ...data, ...(userId ? { user: userId } : {}) })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school', 'children'] }),
  })
}

export function useDeleteChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => pb.collection('school_children').delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['school'] }),
  })
}

export function useSchoolSchedule(childId: string | null) {
  return useQuery({
    queryKey: ['school', 'schedule', childId],
    queryFn: async () => {
      const records = await pb.collection('school_schedule').getFullList({
        filter: `child = "${childId}"`,
      })
      return records as unknown as SchoolSchedule[]
    },
    enabled: !!childId,
  })
}

export function useUpsertSchedule() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()
  return useMutation({
    mutationFn: async ({ childId, day, start_time, end_time, existingId }: {
      childId: string; day: WeekDay; start_time: string; end_time: string; existingId?: string
    }) => {
      const payload = { child: childId, day, start_time, end_time, user: user!.id, household: household?.id || null }
      return existingId
        ? pb.collection('school_schedule').update(existingId, payload)
        : pb.collection('school_schedule').create(payload)
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['school', 'schedule', vars.childId] }),
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; childId: string }) => {
      return pb.collection('school_schedule').delete(id)
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['school', 'schedule', vars.childId] }),
  })
}

export function useSchoolLunches(childId: string | null, weekDates: string[]) {
  return useQuery({
    queryKey: ['school', 'lunches', childId, weekDates[0]],
    queryFn: async () => {
      const dateFilter = weekDates.map((d) => `date = "${d}"`).join(' || ')
      const records = await pb.collection('school_lunches').getFullList({
        filter: `child = "${childId}" && (${dateFilter})`,
      })
      return records as unknown as SchoolLunch[]
    },
    enabled: !!childId && weekDates.length > 0,
  })
}

export function useUpsertLunch() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()
  return useMutation({
    mutationFn: async ({ childId, date, meal, existingId }: {
      childId: string; date: string; meal: string; existingId?: string
    }) => {
      const payload = { child: childId, date, meal, user: user!.id, household: household?.id || null }
      return existingId
        ? pb.collection('school_lunches').update(existingId, payload)
        : pb.collection('school_lunches').create(payload)
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['school', 'lunches', vars.childId] }),
  })
}

export function useDeleteLunch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; childId: string }) => {
      return pb.collection('school_lunches').delete(id)
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['school', 'lunches', vars.childId] }),
  })
}

export function useSchoolAssignments(childId: string | null) {
  return useQuery({
    queryKey: ['school', 'assignments', childId],
    queryFn: async () => {
      const records = await pb.collection('school_assignments').getFullList({
        filter: `child = "${childId}"`,
        sort: 'due_date,title',
      })
      return records as unknown as SchoolAssignment[]
    },
    enabled: !!childId,
  })
}

export function useCreateAssignment() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()
  return useMutation({
    mutationFn: async (data: { childId: string; subject: string; title: string; type: AssignmentType; due_date: string; notes: string }) => {
      return pb.collection('school_assignments').create({
        child: data.childId, subject: data.subject, title: data.title,
        type: data.type, due_date: data.due_date, notes: data.notes,
        done: false, user: user!.id, household: household?.id || null,
      })
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['school', 'assignments', vars.childId] }),
  })
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, childId, ...data }: {
      id: string; childId: string; subject: string; title: string; type: AssignmentType; due_date: string; notes: string
    }) => {
      return pb.collection('school_assignments').update(id, data)
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['school', 'assignments', vars.childId] }),
  })
}

export function useToggleAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; childId: string; done: boolean }) => {
      return pb.collection('school_assignments').update(id, { done })
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['school', 'assignments', vars.childId] }),
  })
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; childId: string }) => {
      return pb.collection('school_assignments').delete(id)
    },
    onSuccess: (_data, vars) => queryClient.invalidateQueries({ queryKey: ['school', 'assignments', vars.childId] }),
  })
}
