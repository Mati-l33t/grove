import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import pb from '@/lib/pb'
import { useAuthStore } from '@/stores/authStore'
import type { Ingredient, Recipe, ShareMode } from '@/types'

function buildScope(userId: string, householdId?: string): string {
  const base = `(user = "${userId}" || shared_with ~ "${userId}")`
  return householdId ? `(${base} || household = "${householdId}")` : base
}

export function useRecipes() {
  const { user, household } = useAuthStore()

  return useQuery({
    queryKey: ['recipes', user?.id, household?.id],
    queryFn: async () => {
      const scope = buildScope(user!.id, household?.id)
      const records = await pb.collection('recipes').getFullList({
        filter: scope,
        sort: '-created',
        expand: 'user',
      })
      return records as unknown as Recipe[]
    },
    enabled: !!user,
  })
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipes', 'detail', id],
    queryFn: async () => {
      const record = await pb.collection('recipes').getOne(id!, { expand: 'user' })
      return record as unknown as Recipe
    },
    enabled: !!id,
  })
}

type RecipePayload = {
  title: string
  description: string
  ingredients: Ingredient[]
  instructions: string
  prep_time: number
  cook_time: number
  servings: number
  tags: string[]
  shareMode: ShareMode
  sharedWith: string[]
  imageFile?: File
}

type RecipeUpdatePayload = Partial<Omit<RecipePayload, 'imageFile'>> & { imageFile?: File }

export function useCreateRecipe() {
  const queryClient = useQueryClient()
  const { user, household } = useAuthStore()

  return useMutation({
    mutationFn: async (data: RecipePayload) => {
      const base = {
        title: data.title,
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions,
        prep_time: data.prep_time,
        cook_time: data.cook_time,
        servings: data.servings,
        tags: data.tags,
        user: user!.id,
        household: data.shareMode === 'household' && household?.id ? household.id : null,
        shared_with: data.shareMode === 'members' ? data.sharedWith : [],
      }

      if (data.imageFile) {
        const fd = new FormData()
        Object.entries(base).forEach(([k, v]) => {
          if (v === null || v === undefined) return
          if (k === 'shared_with') {
            (v as string[]).forEach((id) => fd.append('shared_with', id))
          } else {
            fd.append(k, Array.isArray(v) || typeof v === 'object' ? JSON.stringify(v) : String(v))
          }
        })
        fd.append('image', data.imageFile)
        return pb.collection('recipes').create(fd)
      }

      return pb.collection('recipes').create(base)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()
  const { household } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RecipeUpdatePayload }) => {
      const { imageFile, shareMode, sharedWith, ...rest } = data
      const sharingFields = shareMode !== undefined ? {
        household: shareMode === 'household' && household?.id ? household.id : null,
        shared_with: shareMode === 'members' ? (sharedWith ?? []) : [],
      } : {}

      if (imageFile) {
        const fd = new FormData()
        Object.entries({ ...rest, ...sharingFields }).forEach(([k, v]) => {
          if (v === null || v === undefined) return
          if (k === 'shared_with') {
            (v as string[]).forEach((id) => fd.append('shared_with', id))
          } else {
            fd.append(k, Array.isArray(v) || typeof v === 'object' ? JSON.stringify(v) : String(v))
          }
        })
        fd.append('image', imageFile)
        return pb.collection('recipes').update(id, fd)
      }

      return pb.collection('recipes').update(id, { ...rest, ...sharingFields })
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipes', 'detail', id] })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => pb.collection('recipes').delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
