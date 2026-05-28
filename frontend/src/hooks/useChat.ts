import { useQuery } from '@tanstack/react-query'
import pb from '@/lib/pb'

export type AiModelsResponse = {
  models: string[]
  enabled: boolean
  default: string
}

export function useAiModels() {
  return useQuery({
    queryKey: ['ai-models'],
    queryFn: async () => {
      const res = await pb.send('/api/grove/ai-models', { method: 'GET' })
      return res as AiModelsResponse
    },
    staleTime: 5 * 60 * 1000,
  })
}
