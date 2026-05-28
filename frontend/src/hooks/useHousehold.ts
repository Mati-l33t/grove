import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import pb from '@/lib/pb'
import type { Household, User } from '@/types'

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function useHouseholdMembers() {
  const { household } = useAuthStore()
  return useQuery({
    queryKey: ['household-members', household?.id],
    queryFn: async () => {
      const records = await pb.collection('users').getFullList({
        filter: `household = "${household!.id}"`,
      })
      return records as unknown as User[]
    },
    enabled: !!household,
    staleTime: 60_000,
  })
}

export function useHousehold() {
  const { user, setHousehold, setUser } = useAuthStore()

  async function createHousehold(name: string): Promise<Household> {
    const household = await pb.collection('households').create({
      name,
      invite_code: generateInviteCode(),
      owner: user!.id,
    }) as unknown as Household

    await pb.collection('users').update(user!.id, { household: household.id })
    setUser({ ...user!, household: household.id })
    setHousehold(household)
    return household
  }

  async function joinHousehold(code: string): Promise<Household> {
    const sanitized = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const household = await pb.collection('households').getFirstListItem(
      `invite_code = "${sanitized}"`
    ) as unknown as Household

    await pb.collection('users').update(user!.id, { household: household.id })
    setUser({ ...user!, household: household.id })
    setHousehold(household)
    return household
  }

  async function leaveHousehold(): Promise<void> {
    await pb.collection('users').update(user!.id, { household: null })
    setUser({ ...user!, household: '' })
    setHousehold(null)
  }

  async function fetchHousehold(id: string): Promise<Household> {
    return await pb.collection('households').getOne(id, {
      expand: 'owner',
    }) as unknown as Household
  }

  return { createHousehold, joinHousehold, leaveHousehold, fetchHousehold }
}
