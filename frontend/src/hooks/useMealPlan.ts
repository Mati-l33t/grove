import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfToday, addDays } from 'date-fns'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import type { MealPlan, ShareMode } from '@/types'

function buildScope(userId: string, householdId?: string): string {
  const base = `(user = "${userId}" || shared_with ~ "${userId}")`
  return householdId ? `(${base} || household = "${householdId}")` : base
}

export function useTodayMealPlan() {
  const { user, household } = useAuthStore()

  return useQuery({
    queryKey: ['meal-plan', 'today', user?.id, household?.id],
    queryFn: async () => {
      const today = startOfToday()
      const todayStr = format(today, 'yyyy-MM-dd')
      const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd')
      const scope = buildScope(user!.id, household?.id)
      const records = await pb.collection('meal_plans').getFullList({
        filter: `${scope} && date >= "${todayStr} 00:00:00.000Z" && date < "${tomorrowStr} 00:00:00.000Z"`,
        expand: 'recipe,user',
      })
      return records as unknown as MealPlan[]
    },
    enabled: !!user,
  })
}

export function useWeekMealPlan(weekStart: Date) {
  const { user, household } = useAuthStore()

  return useQuery({
    queryKey: ['meal-plan', 'week', format(weekStart, 'yyyy-MM-dd'), user?.id, household?.id],
    queryFn: async () => {
      const startStr = format(weekStart, 'yyyy-MM-dd')
      const endStr = format(addDays(weekStart, 7), 'yyyy-MM-dd')
      const scope = buildScope(user!.id, household?.id)
      const records = await pb.collection('meal_plans').getFullList({
        filter: `${scope} && date >= "${startStr} 00:00:00.000Z" && date < "${endStr} 00:00:00.000Z"`,
        expand: 'recipe,user',
      })
      return records as unknown as MealPlan[]
    },
    enabled: !!user,
  })
}

export function useSetMealPlan() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      id,
      date,
      meal_type,
      recipe,
      custom_meal,
      shareMode = 'household',
      sharedWith = [],
    }: {
      id?: string
      date: string
      meal_type: string
      recipe?: string | null
      custom_meal?: string
      shareMode?: ShareMode
      sharedWith?: string[]
    }) => {
      const payload = {
        date: `${date} 00:00:00.000Z`,
        meal_type,
        recipe: recipe || null,
        custom_meal: custom_meal || '',
        user: user!.id,
        household: shareMode === 'household' && household?.id ? household.id : null,
        shared_with: shareMode === 'members' ? sharedWith : [],
      }
      if (id) {
        return pb.collection('meal_plans').update(id, payload)
      }
      return pb.collection('meal_plans').create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] })
    },
  })
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => pb.collection('meal_plans').delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] })
    },
  })
}
