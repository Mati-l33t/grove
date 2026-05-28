import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Archive, ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import TopBar from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AddItemInput from '@/components/lists/AddItemInput'
import ListItem from '@/components/lists/ListItem'
import SharePicker from '@/components/ui/SharePicker'
import { useList, useListItems, useUpdateList, useArchiveList, useDeleteList } from '@/hooks/useLists'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useAuthStore } from '@/stores/authStore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MEMBER_COLORS } from '@/lib/constants'
import { cn, memberDisplayName } from '@/lib/utils'
import type { ShareMode } from '@/types'

export default function ListDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const listQuery = useList(id)
  const itemsQuery = useListItems(id)
  const { data: members = [] } = useHouseholdMembers()
  const { user: currentUser } = useAuthStore()
  const updateList = useUpdateList()
  const archiveList = useArchiveList()
  const deleteList = useDeleteList()

  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editShareMode, setEditShareMode] = useState<ShareMode>('private')
  const [editSharedWith, setEditSharedWith] = useState<string[]>([])
  const [editAssignedTo, setEditAssignedTo] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [checkedOpen, setCheckedOpen] = useState(false)

  const list = listQuery.data
  const items = itemsQuery.data ?? []
  const canManageList = !!list && (list.user === currentUser?.id || currentUser?.is_admin)

  function getSharingLabel(): string | null {
    if (!list) return null
    if (list.household) return 'Everyone'
    if (list.shared_with?.length) {
      return list.shared_with
        .map((id) => members.find((m) => m.id === id)?.name?.split(' ')[0] || '?')
        .join(', ')
    }
    return null
  }
  const sharingLabel = getSharingLabel()

  const assignedToName = list?.expand?.assigned_to?.name?.split(' ')[0]
    ?? (list?.assigned_to ? members.find((m) => m.id === list.assigned_to)?.name?.split(' ')[0] : null)
  const creatorName = list?.expand?.user?.name?.split(' ')[0]
    ?? members.find((m) => m.id === list?.user)?.name?.split(' ')[0]

  const assignedLabel = list?.assigned_to && list.assigned_to !== currentUser?.id
    ? `For: ${assignedToName ?? '?'}`
    : list?.assigned_to === currentUser?.id && list?.user !== currentUser?.id
    ? `From: ${creatorName ?? '?'}`
    : null
  const unchecked = useMemo(() => items.filter((i) => !i.checked), [items])
  const checked = useMemo(() => items.filter((i) => i.checked), [items])

  const title = list?.name ?? 'List'
  const color = list?.color ?? '#22c55e'

  function openEdit() {
    setEditName(list?.name ?? '')
    setEditColor(list?.color ?? MEMBER_COLORS[0])
    setEditAssignedTo(list?.assigned_to ?? '')
    if (list?.household) {
      setEditShareMode('household')
      setEditSharedWith([])
    } else if (list?.shared_with?.length) {
      setEditShareMode('members')
      setEditSharedWith(list.shared_with)
    } else {
      setEditShareMode('private')
      setEditSharedWith([])
    }
    setShowEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim() || !id) return
    try {
      await updateList.mutateAsync({
        id,
        data: {
          name: editName.trim(),
          color: editColor,
          shareMode: editShareMode,
          sharedWith: editSharedWith,
          assignedTo: editAssignedTo || null,
        },
      })
      toast.success('List updated.')
      setShowEdit(false)
    } catch {
      toast.error('Failed to update list.')
    }
  }

  async function handleArchive() {
    if (!id) return
    try {
      await archiveList.mutateAsync(id)
      toast.success('List archived.')
      navigate('/lists')
    } catch {
      toast.error('Failed to archive list.')
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await deleteList.mutateAsync(id)
      toast.success('List deleted.')
      navigate('/lists')
    } catch {
      toast.error('Failed to delete list.')
    }
  }

  const actionButtons = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={openEdit} aria-label="Edit list">
              <Edit2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleArchive} aria-label="Archive list">
              <Archive className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Archive</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete list"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )

  return (
    <>
      <TopBar title={title} actions={canManageList ? actionButtons : undefined} />

      <div className="max-w-2xl mx-auto w-full p-4 md:px-8 space-y-4">
        {/* Desktop page header */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div>
              <h1 className="text-xl font-semibold">{title}</h1>
              {assignedLabel && (
                <p className="text-sm font-medium text-primary">{assignedLabel}</p>
              )}
              {sharingLabel && (
                <p className="text-sm text-muted-foreground">Shared with {sharingLabel}</p>
              )}
            </div>
          </div>
          {canManageList && actionButtons}
        </div>

        {/* Mobile color bar + sharing label */}
        <div className="md:hidden space-y-1">
          <div className="h-1 w-12 rounded-full" style={{ backgroundColor: color }} />
          {assignedLabel && (
            <p className="text-xs font-medium text-primary">{assignedLabel}</p>
          )}
          {sharingLabel && (
            <p className="text-xs text-muted-foreground">Shared with {sharingLabel}</p>
          )}
        </div>

        {/* Add item */}
        <AddItemInput listId={id!} />

        {/* Items */}
        {itemsQuery.isLoading ? (
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="pt-1">
            {unchecked.length === 0 && checked.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No items yet — add one above.
              </p>
            ) : (
              <>
                <div>
                  {unchecked.map((item) => (
                    <ListItem key={item.id} item={item} listId={id!} />
                  ))}
                </div>

                {checked.length > 0 && (
                  <div className="mt-3">
                    <button
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground py-1 mb-1 transition-colors"
                      onClick={() => setCheckedOpen(!checkedOpen)}
                    >
                      {checkedOpen
                        ? <ChevronDown className="h-3 w-3" />
                        : <ChevronRight className="h-3 w-3" />}
                      Checked ({checked.length})
                    </button>
                    {checkedOpen && (
                      <div>
                        {checked.map((item) => (
                          <ListItem key={item.id} item={item} listId={id!} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit list</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <Input
              placeholder="List name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all',
                      editColor === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>
            </div>
            {members.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Assign to member</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAssignedTo('')}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      !editAssignedTo
                        ? 'bg-primary/10 text-primary border-primary/40'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    No one
                  </button>
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setEditAssignedTo(m.id)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                        editAssignedTo === m.id
                          ? 'bg-primary/10 text-primary border-primary/40'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {m.id === currentUser?.id ? 'Me' : memberDisplayName(m.id, members)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(
              <SharePicker
                mode={editShareMode}
                selectedMembers={editSharedWith}
                onChange={(m, mems) => { setEditShareMode(m); setEditSharedWith(mems) }}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!editName.trim() || updateList.isPending}>
                {updateList.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete list?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete "{list?.name}" and all its items. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteList.isPending}
            >
              {deleteList.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
