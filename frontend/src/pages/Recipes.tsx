import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, Plus, Search, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { useRecipes } from '@/hooks/useRecipes'
import { useAuthStore } from '@/stores/authStore'
import pb from '@/lib/pb'
import TopBar from '@/components/layout/TopBar'
import RecipeCard from '@/components/recipes/RecipeCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Filter = 'all' | 'mine' | 'shared'

export default function Recipes() {
  const navigate = useNavigate()
  const { user, permissions } = useAuthStore()
  const { data: recipes, isLoading } = useRecipes()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!importUrl.trim()) return
    setImporting(true)
    try {
      const data = await pb.send('/api/grove/import-recipe', {
        method: 'POST',
        body: JSON.stringify({ url: importUrl.trim() }),
        headers: { 'Content-Type': 'application/json' },
      })
      setShowImport(false)
      setImportUrl('')
      navigate('/recipes/new', { state: { imported: data } })
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
        || 'Could not import recipe from that URL.'
      toast.error(msg)
    } finally {
      setImporting(false)
    }
  }

  const filtered = (recipes ?? []).filter((r) => {
    if (filter === 'mine' && r.user !== user?.id) return false
    if (filter === 'shared' && !r.household) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'Mine' },
    { key: 'shared', label: 'Shared' },
  ]

  const chipClass = (key: Filter) =>
    `rounded-full border px-3 py-1 text-sm transition-colors ${
      filter === key
        ? 'bg-primary/10 text-primary border-primary/40'
        : 'border-transparent text-muted-foreground hover:text-foreground'
    }`

  const mobileActions = permissions.recipes ? (
    <div className="flex items-center gap-0.5">
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowImport(true)} aria-label="Import from link">
        <Link2 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate('/recipes/new')} aria-label="New recipe">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ) : null

  const desktopActions = permissions.recipes ? (
    <div className="flex items-center gap-2">
      <Button size="sm" className="gap-1" onClick={() => setShowImport(true)}>
        <Link2 className="h-4 w-4" />
        Import from link
      </Button>
      <Button size="sm" className="gap-1" onClick={() => navigate('/recipes/new')}>
        <Plus className="h-4 w-4" />
        New recipe
      </Button>
    </div>
  ) : null

  return (
    <>
      <TopBar title="Recipes" actions={mobileActions ?? undefined} />

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-2xl font-bold">Recipes</h1>
          {desktopActions}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {chips.map(({ key, label }) => (
              <button key={key} type="button" className={chipClass(key)} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="font-medium">{search || filter !== 'all' ? 'No recipes found' : 'No recipes yet'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || filter !== 'all'
                  ? 'Try a different search or filter.'
                  : 'Add your first recipe to get started.'}
              </p>
            </div>
            {!search && filter === 'all' && (
              <Button onClick={() => navigate('/recipes/new')}>Add recipe</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showImport} onOpenChange={(open) => { setShowImport(open); if (!open) setImportUrl('') }}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import recipe from URL</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImport} className="space-y-4">
            <Input
              placeholder="https://…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Works with sites that embed structured recipe data (most English-language recipe sites and food blogs).
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowImport(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!importUrl.trim() || importing}>
                {importing ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
