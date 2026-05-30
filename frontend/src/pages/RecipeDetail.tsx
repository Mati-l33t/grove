import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Edit2, Trash2, Plus, X, Clock, Users, ShoppingCart, Camera,
} from 'lucide-react'
import { useRecipe, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { useActiveLists } from '@/hooks/useLists'
import { useAuthStore } from '@/stores/authStore'
import pb from '@/lib/pb'
import TopBar from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import SharePicker from '@/components/ui/SharePicker'
import type { Ingredient, ShareMode } from '@/types'

function parseIngredients(raw: unknown): Ingredient[] {
  if (Array.isArray(raw)) return raw as Ingredient[]
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return []
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
  return []
}

function formatIngredient(ing: Ingredient): string {
  return [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, household, permissions } = useAuthStore()

  const isNew = location.pathname === '/recipes/new'
  const isEditing = isNew || location.pathname.endsWith('/edit')

  const { data: recipe, isLoading } = useRecipe(isNew ? undefined : id)
  const { data: allLists } = useActiveLists()
  const shoppingLists = (allLists ?? []).filter((l) => l.type === 'shopping')

  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const deleteRecipe = useDeleteRecipe()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ amount: '', unit: '', name: '' }])
  const [instructions, setInstructions] = useState('')
  const [prepTime, setPrepTime] = useState(0)
  const [cookTime, setCookTime] = useState(0)
  const [servings, setServings] = useState(4)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [shareMode, setShareMode] = useState<ShareMode>('private')
  const [sharedWith, setSharedWith] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAddToList, setShowAddToList] = useState(false)
  const [selectedListId, setSelectedListId] = useState('')
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set())
  const [addingToList, setAddingToList] = useState(false)

  const imageRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (recipe && isEditing && !isNew) {
      setTitle(recipe.title)
      setDescription(recipe.description || '')
      const ings = parseIngredients(recipe.ingredients)
      setIngredients(ings.length > 0 ? ings : [{ amount: '', unit: '', name: '' }])
      setInstructions(recipe.instructions || '')
      setPrepTime(recipe.prep_time || 0)
      setCookTime(recipe.cook_time || 0)
      setServings(recipe.servings || 4)
      setTags(parseTags(recipe.tags))
      if (recipe.household) {
        setShareMode('household')
        setSharedWith([])
      } else if (recipe.shared_with?.length) {
        setShareMode('members')
        setSharedWith(recipe.shared_with)
      } else {
        setShareMode('private')
        setSharedWith([])
      }
    }
  }, [recipe?.id, isEditing, isNew])

  useEffect(() => {
    if (!isNew) return
    const imp = (location.state as { imported?: {
      title?: string; description?: string; ingredients?: Ingredient[]
      instructions?: string; prep_time?: number; cook_time?: number; servings?: number
      image_url?: string
    } } | null)?.imported
    if (!imp) return
    if (imp.title) setTitle(imp.title)
    if (imp.description) setDescription(imp.description)
    if (imp.ingredients?.length) setIngredients(imp.ingredients)
    if (imp.instructions) setInstructions(imp.instructions)
    if (imp.prep_time) setPrepTime(imp.prep_time)
    if (imp.cook_time) setCookTime(imp.cook_time)
    if (imp.servings) setServings(imp.servings)
    if (imp.image_url) {
      const proxyUrl = `/api/grove/proxy-image?url=${encodeURIComponent(imp.image_url)}`
      fetch(proxyUrl, { headers: { Authorization: pb.authStore.token } })
        .then((r) => { if (!r.ok) throw new Error(); return r.blob() })
        .then((blob) => {
          const ext = imp.image_url!.split('?')[0].split('.').pop() || 'jpg'
          const file = new File([blob], `recipe.${ext}`, { type: blob.type || 'image/jpeg' })
          setImageFile(file)
          setImagePreview(URL.createObjectURL(blob))
        })
        .catch(() => {})
    }
  }, [isNew])

  function openAddToList() {
    const ings = parseIngredients(recipe?.ingredients)
    setSelectedIngredients(new Set(ings.map((_, i) => i)))
    setSelectedListId(shoppingLists[0]?.id ?? '')
    setShowAddToList(true)
  }

  async function handleAddToList() {
    if (!selectedListId) return
    const ings = parseIngredients(recipe?.ingredients)
    const toAdd = ings.filter((_, i) => selectedIngredients.has(i))
    if (toAdd.length === 0) return

    setAddingToList(true)
    try {
      await Promise.all(
        toAdd.map((ing) =>
          pb.collection('list_items').create({
            list: selectedListId,
            text: formatIngredient(ing),
            checked: false,
            order: 0,
            added_by: user!.id,
          })
        )
      )
      toast.success(`${toAdd.length} ingredient${toAdd.length > 1 ? 's' : ''} added to list.`)
      setShowAddToList(false)
      navigate(`/lists/${selectedListId}`)
    } catch {
      toast.error('Failed to add ingredients.')
    } finally {
      setAddingToList(false)
    }
  }

  function toggleIngredientSelection(i: number) {
    setSelectedIngredients((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function updateIngredient(i: number, field: keyof Ingredient, value: string) {
    setIngredients((prev) => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing))
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { amount: '', unit: '', name: '' }])
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (!tags.includes(tag)) setTags((prev) => [...prev, tag])
      setTagInput('')
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    const validIngredients = ingredients.filter((i) => i.name.trim())
    try {
      if (isNew) {
        const result = await createRecipe.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          ingredients: validIngredients,
          instructions: instructions.trim(),
          prep_time: prepTime,
          cook_time: cookTime,
          servings,
          tags,
          shareMode,
          sharedWith,
          imageFile: imageFile ?? undefined,
        })
        toast.success('Recipe created.')
        navigate(`/recipes/${result.id}`)
      } else {
        await updateRecipe.mutateAsync({
          id: id!,
          data: {
            title: title.trim(),
            description: description.trim(),
            ingredients: validIngredients,
            instructions: instructions.trim(),
            prep_time: prepTime,
            cook_time: cookTime,
            servings,
            tags,
            shareMode,
            sharedWith,
            imageFile: imageFile ?? undefined,
          },
        })
        toast.success('Recipe saved.')
        navigate(`/recipes/${id}`)
      }
    } catch (err) {
      const pbErr = err as { message?: string; data?: { message?: string; data?: Record<string, { message: string }> } }
      const fieldErrors = pbErr.data?.data
      const fieldMsgs = fieldErrors
        ? Object.values(fieldErrors).map((v) => v.message).join('; ')
        : ''
      toast.error(fieldMsgs || pbErr.data?.message || pbErr.message || 'Failed to save recipe.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteRecipe.mutateAsync(id!)
      toast.success('Recipe deleted.')
      navigate('/recipes')
    } catch {
      toast.error('Failed to delete recipe.')
    }
  }

  const canEdit =
    !recipe ||
    recipe.user === user?.id ||
    user?.is_admin ||
    (!!recipe.household && recipe.household === household?.id) ||
    !!(recipe.shared_with?.includes(user?.id ?? ''))

  // ── Edit / Create form ─────────────────────────────────────────────────────
  if (isEditing) {
    const existingImageUrl = recipe?.image
      ? pb.files.getURL(recipe as never, recipe.image, { thumb: '800x600' })
      : null
    const displayImage = imagePreview ?? existingImageUrl

    return (
      <>
        <TopBar
          title={isNew ? 'New recipe' : 'Edit recipe'}
          actions={
            <Button size="sm" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          }
        />

        <div className="max-w-2xl mx-auto p-4 space-y-6 pb-20">
          {/* Image upload */}
          <button
            type="button"
            className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted border border-dashed flex items-center justify-center hover:bg-accent/50 transition-colors group"
            onClick={() => imageRef.current?.click()}
          >
            {displayImage ? (
              <img src={displayImage} alt="Recipe" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-8 w-8" />
                <span className="text-sm">Add photo</span>
              </div>
            )}
            {displayImage && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6 text-white" />
              </div>
            )}
          </button>
          <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="recipe-title">Title</Label>
            <Input
              id="recipe-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Recipe name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="recipe-desc">Description</Label>
            <Input
              id="recipe-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description (optional)"
            />
          </div>

          {/* Times + servings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prep-time">Prep (min)</Label>
              <Input
                id="prep-time"
                type="number"
                min={0}
                value={prepTime || ''}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cook-time">Cook (min)</Label>
              <Input
                id="cook-time"
                type="number"
                min={0}
                value={cookTime || ''}
                onChange={(e) => setCookTime(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min={1}
                value={servings || ''}
                onChange={(e) => setServings(Number(e.target.value))}
                placeholder="4"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-3">
            <Label>Ingredients</Label>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  placeholder="Amt"
                  value={ing.amount}
                  onChange={(e) => updateIngredient(i, 'amount', e.target.value)}
                  className="w-16 shrink-0"
                />
                <Input
                  placeholder="Unit"
                  value={ing.unit}
                  onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                  className="w-20 shrink-0"
                />
                <Input
                  placeholder="Ingredient"
                  value={ing.name}
                  onChange={(e) => updateIngredient(i, 'name', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => removeIngredient(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addIngredient}>
              <Plus className="h-4 w-4" />
              Add ingredient
            </Button>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Step-by-step instructions…"
              className="min-h-[160px]"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tag-input">Tags</Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              id="tag-input"
              placeholder="Add tag, press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
            />
          </div>

          <SharePicker
            mode={shareMode}
            selectedMembers={sharedWith}
            onChange={(m, members) => { setShareMode(m); setSharedWith(members) }}
          />

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : isNew ? 'Create recipe' : 'Save changes'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(isNew ? '/recipes' : `/recipes/${id}`)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </>
    )
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <TopBar title="Recipe" />
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    )
  }

  if (!recipe) {
    return (
      <>
        <TopBar title="Recipe" />
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Recipe not found.
        </div>
      </>
    )
  }

  const imageUrl = recipe.image
    ? pb.files.getURL(recipe as never, recipe.image, { thumb: '800x600' })
    : null

  const viewIngredients = parseIngredients(recipe.ingredients)
  const viewTags = parseTags(recipe.tags)
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  const actionButtons = (
    <div className="flex items-center gap-1">
      {shoppingLists.length > 0 && (
        <Button variant="outline" size="sm" className="gap-1" onClick={openAddToList}>
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">Add to list</span>
        </Button>
      )}
      {canEdit && permissions.recipes && (
        <>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/recipes/${id}/edit`)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )

  return (
    <>
      <TopBar title={recipe.title} actions={actionButtons} />

      <div className="max-w-2xl mx-auto pb-20">
        {/* Back button (desktop) */}
        <div className="hidden md:flex items-center gap-2 p-4 pb-0">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => navigate('/recipes')}>
            <ArrowLeft className="h-4 w-4" />
            Recipes
          </Button>
        </div>

        {/* Hero image */}
        {imageUrl && (
          <div className="aspect-video overflow-hidden md:mx-4 md:mt-4 md:rounded-xl">
            <img src={imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-4 space-y-5">
          {/* Title + meta */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="hidden md:block text-2xl font-bold leading-tight">{recipe.title}</h1>
              <div className="md:flex hidden items-center gap-1 shrink-0">{actionButtons}</div>
            </div>
            {recipe.description && (
              <p className="text-muted-foreground mt-1">{recipe.description}</p>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 text-sm">
            {recipe.prep_time > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Prep: {recipe.prep_time}m</span>
              </div>
            )}
            {recipe.cook_time > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Cook: {recipe.cook_time}m</span>
              </div>
            )}
            {totalTime > 0 && recipe.prep_time > 0 && recipe.cook_time > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4" />
                <span>Total: {totalTime}m</span>
              </div>
            )}
            {recipe.servings > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{recipe.servings} servings</span>
              </div>
            )}
            {recipe.household && (
              <Badge variant="secondary">Shared</Badge>
            )}
          </div>

          {/* Tags */}
          {viewTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {viewTags.map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Add to list button (mobile) */}
          {shoppingLists.length > 0 && (
            <div className="md:hidden">
              <Button variant="outline" className="gap-2 w-full" onClick={openAddToList}>
                <ShoppingCart className="h-4 w-4" />
                Add ingredients to shopping list
              </Button>
            </div>
          )}

          <Separator />

          {/* Ingredients */}
          {viewIngredients.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Ingredients</h2>
              <ul className="space-y-2">
                {viewIngredients.map((ing, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <span>
                      {ing.amount && <span className="font-medium">{ing.amount} </span>}
                      {ing.unit && <span className="text-muted-foreground">{ing.unit} </span>}
                      {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <>
              <Separator />
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Instructions</h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{recipe.instructions}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete recipe?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete "{recipe.title}". This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to shopping list dialog */}
      <Dialog open={showAddToList} onOpenChange={setShowAddToList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add ingredients to list</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shopping list</Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a list…" />
                </SelectTrigger>
                <SelectContent>
                  {shoppingLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {viewIngredients.map((ing, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleIngredientSelection(i)}
                  className="flex items-center gap-3 w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <span
                    className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selectedIngredients.has(i) ? 'bg-primary border-primary' : 'border-input'
                    }`}
                  >
                    {selectedIngredients.has(i) && (
                      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
                        <polyline points="1.5,5 4,7.5 8.5,2.5" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm">{formatIngredient(ing)}</span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddToList(false)}>Cancel</Button>
            <Button
              onClick={handleAddToList}
              disabled={addingToList || selectedIngredients.size === 0 || !selectedListId}
            >
              {addingToList ? 'Adding…' : `Add ${selectedIngredients.size} item${selectedIngredients.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
