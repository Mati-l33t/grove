import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'

/**
 * Subscribes to PocketBase realtime events for all data collections and
 * invalidates the matching TanStack Query caches so every open tab/device
 * sees changes from other household members immediately.
 */
export function useRealtimeSync() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const unsubs: Array<() => void> = []

    pb.collection('events').subscribe('*', () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    pb.collection('lists').subscribe('*', () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    pb.collection('list_items').subscribe('*', (data) => {
      queryClient.invalidateQueries({ queryKey: ['list-items', data.record.list] })
      // Today dashboard and list overview also show item counts
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    pb.collection('recipes').subscribe('*', () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    pb.collection('meal_plans').subscribe('*', () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] })
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    pb.collection('school_lunches').subscribe('*', () => {
      queryClient.invalidateQueries({ queryKey: ['school', 'lunches'] })
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    pb.collection('school_assignments').subscribe('*', () => {
      queryClient.invalidateQueries({ queryKey: ['school', 'assignments'] })
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    pb.collection('school_children').subscribe('*', () => {
      queryClient.invalidateQueries({ queryKey: ['school', 'children'] })
    }).then((fn) => unsubs.push(fn)).catch(() => {})

    return () => unsubs.forEach((fn) => fn())
  }, [user?.id])
}
