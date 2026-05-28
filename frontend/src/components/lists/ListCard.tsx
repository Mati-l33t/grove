import { Link } from 'react-router-dom'
import { CheckSquare, ShoppingCart } from 'lucide-react'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useAuthStore } from '@/stores/authStore'
import type { List, User } from '@/types'

function getSharingLabel(list: List, members: User[]): string | null {
  if (list.household) return 'Everyone'
  if (list.shared_with?.length) {
    return list.shared_with
      .map((id) => members.find((m) => m.id === id)?.name?.split(' ')[0] || '?')
      .join(', ')
  }
  return null
}

export default function ListCard({ list }: { list: List }) {
  const Icon = list.type === 'shopping' ? ShoppingCart : CheckSquare
  const color = list.color || '#22c55e'
  const { data: members = [] } = useHouseholdMembers()
  const { user } = useAuthStore()
  const sharingLabel = getSharingLabel(list, members)

  const assignedToName = list.expand?.assigned_to?.name?.split(' ')[0]
    ?? (list.assigned_to ? members.find((m) => m.id === list.assigned_to)?.name?.split(' ')[0] : null)
  const creatorName = list.expand?.user?.name?.split(' ')[0]
    ?? members.find((m) => m.id === list.user)?.name?.split(' ')[0]

  const assignedLabel =
    list.assigned_to && list.assigned_to !== user?.id
      ? `For: ${assignedToName ?? '?'}`
      : list.assigned_to === user?.id && list.user !== user?.id
      ? `From: ${creatorName ?? '?'}`
      : null

  return (
    <Link
      to={`/lists/${list.id}`}
      className="block rounded-xl border bg-card p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-4 w-4 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{list.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {list.type === 'todo' ? 'To-do' : 'Shopping'}
            {assignedLabel
              ? ` · ${assignedLabel}`
              : sharingLabel
              ? ` · ${sharingLabel}`
              : ''}
          </p>
        </div>
      </div>
    </Link>
  )
}
