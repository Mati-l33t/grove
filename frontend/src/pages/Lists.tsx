import { useState, useRef } from 'react'
import { Plus, Check } from 'lucide-react'
import { toast } from 'sonner'
import TopBar from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import ListCard from '@/components/lists/ListCard'
import { useActiveLists, useCreateList, useCreateListItem } from '@/hooks/useLists'
import { useAuthStore } from '@/stores/authStore'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import SharePicker from '@/components/ui/SharePicker'
import { MEMBER_COLORS } from '@/lib/constants'
import { cn, memberDisplayName } from '@/lib/utils'
import type { ShareMode } from '@/types'

type FilterType = 'all' | 'todo' | 'shopping'

const FILTER_LABELS: Record<FilterType, string> = { all: 'All', todo: 'To-do', shopping: 'Shopping' }

export default function Lists() {
  const listsQuery = useActiveLists()
  const createList = useCreateList()
  const createItem = useCreateListItem()
  const { user, household, permissions } = useAuthStore()
  const { data: members = [] } = useHouseholdMembers()

  const [filter, setFilter] = useState<FilterType>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'todo' | 'shopping'>('todo')
  const [newColor, setNewColor] = useState(MEMBER_COLORS[0])
  const [newShareMode, setNewShareMode] = useState<ShareMode>('private')
  const [newSharedWith, setNewSharedWith] = useState<string[]>([])
  const [newAssignedTo, setNewAssignedTo] = useState<string>('')

  const [createdListId, setCreatedListId] = useState<string | null>(null)
  const [addedItems, setAddedItems] = useState<string[]>([])
  const [itemText, setItemText] = useState('')
  const itemInputRef = useRef<HTMLInputElement>(null)

  const lists = listsQuery.data ?? []
  const filtered = filter === 'all' ? lists : lists.filter((l) => l.type === filter)

  function openCreate() {
    setNewName('')
    setNewType('todo')
    setNewColor(MEMBER_COLORS[0])
    setNewShareMode('private')
    setNewSharedWith([])
    setNewAssignedTo('')
    setCreatedListId(null)
    setAddedItems([])
    setItemText('')
    setShowCreate(true)
  }

  function closeCreate() {
    setShowCreate(false)
    setCreatedListId(null)
    setAddedItems([])
    setItemText('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const result = await createList.mutateAsync({
        name: newName.trim(),
        type: newType,
        color: newColor,
        shareMode: newShareMode,
        sharedWith: newSharedWith,
        assignedTo: newAssignedTo || undefined,
      })
      setCreatedListId(result.id)
      setAddedItems([])
      setItemText('')
      setTimeout(() => itemInputRef.current?.focus(), 50)
    } catch {
      toast.error('Failed to create list.')
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemText.trim() || !createdListId) return
    try {
      await createItem.mutateAsync({ listId: createdListId, text: itemText.trim() })
      setAddedItems((prev) => [...prev, itemText.trim()])
      setItemText('')
      itemInputRef.current?.focus()
    } catch {
      toast.error('Failed to add item.')
    }
  }

  return (
    <>
      <TopBar
        title="Lists"
        actions={permissions.lists ? (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={openCreate}>
            <Plus className="h-4 w-4" />
          </Button>
        ) : undefined}
      />

      <div className="max-w-5xl mx-auto w-full p-4 md:px-8 space-y-4">
        {/* Desktop page header */}
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-xl font-semibold">Lists</h1>
          {permissions.lists && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              New list
            </Button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filter === f
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* List grid */}
        {listsQuery.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {filter === 'all' ? 'No lists yet' : `No ${FILTER_LABELS[filter].toLowerCase()} lists`}
            </p>
            {filter === 'all' && (
              <button
                className="mt-2 text-xs text-primary hover:underline"
                onClick={openCreate}
              >
                + Create a list
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}
      </div>

      {/* Create list dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { if (!o) closeCreate() }}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{createdListId ? `Add items to "${newName}"` : 'New list'}</DialogTitle>
          </DialogHeader>

          {!createdListId ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                placeholder="List name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                {(['todo', 'shopping'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className={cn(
                      'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                      newType === t
                        ? 'bg-primary/10 text-primary border-primary/40'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t === 'todo' ? 'To-do' : 'Shopping'}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {MEMBER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        'h-7 w-7 rounded-full border-2 transition-all',
                        newColor === c ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>
              {household && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Assign to member</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAssignedTo('')}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                        !newAssignedTo
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
                        onClick={() => setNewAssignedTo(m.id)}
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                          newAssignedTo === m.id
                            ? 'bg-primary/10 text-primary border-primary/40'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {m.id === user?.id ? 'Me' : memberDisplayName(m.id, members)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {household && (
                <SharePicker
                  mode={newShareMode}
                  selectedMembers={newSharedWith}
                  onChange={(m, members) => { setNewShareMode(m); setNewSharedWith(members) }}
                />
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeCreate}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!newName.trim() || createList.isPending}>
                  {createList.isPending ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleAddItem} className="flex gap-2">
                <Input
                  ref={itemInputRef}
                  placeholder="Add an item…"
                  value={itemText}
                  onChange={(e) => setItemText(e.target.value)}
                  autoFocus
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!itemText.trim() || createItem.isPending}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              {addedItems.length > 0 && (
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {addedItems.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex justify-end pt-2 border-t border-border">
                <Button onClick={closeCreate}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
