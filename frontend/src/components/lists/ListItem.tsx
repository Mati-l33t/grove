import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToggleListItem, useDeleteListItem } from '@/hooks/useLists'
import { useAuthStore } from '@/stores/authStore'
import type { ListItem as ListItemType } from '@/types'

interface Props {
  item: ListItemType
  listId: string
}

export default function ListItem({ item, listId }: Props) {
  const toggle = useToggleListItem(listId)
  const deleteItem = useDeleteListItem(listId)
  const { user } = useAuthStore()
  const canDelete = item.added_by === user?.id || user?.is_admin

  async function handleToggle() {
    try {
      await toggle.mutateAsync({ id: item.id, checked: !item.checked })
    } catch {
      toast.error('Failed to update item.')
    }
  }

  async function handleDelete() {
    try {
      await deleteItem.mutateAsync(item.id)
    } catch {
      toast.error('Failed to delete item.')
    }
  }

  return (
    <div className="group flex items-center gap-3 py-2.5 border-b last:border-0">
      <button
        type="button"
        onClick={handleToggle}
        disabled={toggle.isPending}
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
          item.checked
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/40 hover:border-primary'
        )}
        aria-label={item.checked ? 'Uncheck item' : 'Check item'}
      >
        {item.checked && (
          <svg viewBox="0 0 10 10" className="h-3 w-3 text-primary-foreground" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span className={cn('flex-1 text-sm', item.checked && 'line-through text-muted-foreground')}>
        {item.text}
      </span>

      {item.expand?.added_by && (
        <span
          className="h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-semibold text-white select-none opacity-60"
          style={{ backgroundColor: item.expand.added_by.color || '#22c55e' }}
          title={item.expand.added_by.name || item.expand.added_by.email}
        >
          {(item.expand.added_by.name || item.expand.added_by.email || '?')[0].toUpperCase()}
        </span>
      )}

      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteItem.isPending}
          className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-all"
          aria-label="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
