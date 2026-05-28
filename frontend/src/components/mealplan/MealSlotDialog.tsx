import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Pencil, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSetMealPlan, useDeleteMealPlan } from '@/hooks/useMealPlan'
import { useRecipes } from '@/hooks/useRecipes'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useAuthStore } from '@/stores/authStore'
import { cn, memberDisplayName } from '@/lib/utils'
import type { MealPlan, Recipe, ShareMode } from '@/types'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

interface Props {
  open: boolean
  onClose: () => void
  date: string
  mealType: string
  meals: MealPlan[]
}

export default function MealSlotDialog({ open, onClose, date, mealType, meals }: Props) {
  const { user, household, permissions } = useAuthStore()
  const { data: members = [] } = useHouseholdMembers()
  const { data: recipes = [] } = useRecipes()
  const setMeal = useSetMealPlan()
  const deleteMeal = useDeleteMealPlan()

  const [dialogMode, setDialogMode] = useState<'view' | 'form'>('view')
  const [editingMeal, setEditingMeal] = useState<MealPlan | null>(null)
  const [activeTab, setActiveTab] = useState<'recipe' | 'custom'>('recipe')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [customMeal, setCustomMeal] = useState('')
  const [shareMode, setShareMode] = useState<ShareMode>(household ? 'household' : 'private')
  const [sharedWith, setSharedWith] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setDialogMode(meals.length > 0 ? 'view' : 'form')
      resetForm()
    }
  }, [open])

  useEffect(() => {
    if (open && dialogMode === 'view' && meals.length === 0) {
      onClose()
    }
  }, [meals.length, open, dialogMode])

  function resetForm() {
    setEditingMeal(null)
    setActiveTab('recipe')
    setSelectedRecipeId(null)
    setRecipeSearch('')
    setCustomMeal('')
    setShareMode(household ? 'household' : 'private')
    setSharedWith([])
  }

  function startEdit(meal: MealPlan) {
    setEditingMeal(meal)
    if (meal.recipe) {
      setActiveTab('recipe')
      setSelectedRecipeId(meal.recipe)
      setRecipeSearch('')
    } else {
      setActiveTab('custom')
      setCustomMeal(meal.custom_meal || '')
    }
    if (meal.household) {
      setShareMode('household')
      setSharedWith([])
    } else if (meal.shared_with?.length) {
      setShareMode('members')
      setSharedWith(meal.shared_with)
    } else {
      setShareMode('private')
      setSharedWith([])
    }
    setDialogMode('form')
  }

  function startAdd() {
    resetForm()
    setDialogMode('form')
  }

  function backToView() {
    resetForm()
    setDialogMode('view')
  }

  async function handleSave() {
    const hasRecipe = activeTab === 'recipe' && selectedRecipeId
    const hasCustom = activeTab === 'custom' && customMeal.trim()
    if (!hasRecipe && !hasCustom) return
    try {
      await setMeal.mutateAsync({
        id: editingMeal?.id,
        date,
        meal_type: mealType,
        recipe: hasRecipe ? selectedRecipeId : null,
        custom_meal: hasCustom ? customMeal.trim() : '',
        shareMode,
        sharedWith,
      })
      toast.success(editingMeal ? 'Meal updated.' : 'Meal added.')
      resetForm()
      setDialogMode('view')
    } catch {
      toast.error('Failed to save meal.')
    }
  }

  async function handleRemove(meal: MealPlan) {
    const isLast = meals.length === 1
    try {
      await deleteMeal.mutateAsync(meal.id)
      toast.success('Meal removed.')
      if (editingMeal?.id === meal.id) resetForm()
      if (isLast) onClose()
    } catch {
      toast.error('Failed to remove meal.')
    }
  }

  function getScopeLabel(meal: MealPlan): string {
    if (meal.household) return 'Everyone'
    if (meal.shared_with?.length) {
      return meal.shared_with
        .map((id) => members.find((m) => m.id === id)?.name?.split(' ')[0] || '?')
        .join(', ')
    }
    return meal.expand?.user?.name?.split(' ')[0] || 'Just me'
  }

  const filteredRecipes = recipeSearch.trim()
    ? recipes.filter((r) =>
        r.title.toLowerCase().includes(recipeSearch.toLowerCase()) ||
        r.tags?.some((t) => t.toLowerCase().includes(recipeSearch.toLowerCase()))
      )
    : recipes

  const canSave =
    (activeTab === 'recipe' && !!selectedRecipeId) ||
    (activeTab === 'custom' && !!customMeal.trim())

  const title = `${MEAL_LABELS[mealType] ?? mealType} · ${format(new Date(`${date}T00:00:00`), 'EEE, MMM d')}`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {dialogMode === 'view' ? (
          <>
            <div className="px-6 pb-4 space-y-2 flex-1 overflow-y-auto">
              {meals.map((meal) => {
                const label = meal.expand?.recipe?.title || meal.custom_meal || '—'
                const scopeLabel = getScopeLabel(meal)
                const canEditMeal = meal.user === user?.id || !!user?.is_admin
                return (
                  <div key={meal.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{scopeLabel}</p>
                    </div>
                    {canEditMeal && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(meal)}
                          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(meal)}
                          disabled={deleteMeal.isPending}
                          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="px-6 py-4 border-t flex-shrink-0 flex items-center justify-between gap-2">
              {permissions.meal_plan && (
                <Button variant="ghost" size="sm" onClick={startAdd}>
                  + Add meal
                </Button>
              )}
              <Button variant="outline" onClick={onClose} className="ml-auto">
                Close
              </Button>
            </div>
          </>
        ) : (
          <>
            {meals.length > 0 && (
              <div className="px-6 pb-2 flex-shrink-0">
                <button
                  onClick={backToView}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  ← Back
                </button>
              </div>
            )}

            {editingMeal && (
              <p className="px-6 pb-1 text-xs font-medium text-muted-foreground flex-shrink-0">
                Editing: <span className="text-foreground">{editingMeal.expand?.recipe?.title || editingMeal.custom_meal || '—'}</span>
              </p>
            )}

            <div className="flex gap-1 border-b px-6 flex-shrink-0">
              {(['recipe', 'custom'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                    if (tab === 'recipe') setCustomMeal('')
                    if (tab === 'custom') setSelectedRecipeId(null)
                  }}
                  className={`px-3 py-2 text-sm border-b-2 transition-colors -mb-px ${
                    activeTab === tab
                      ? 'border-primary text-primary font-medium'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'recipe' ? 'From recipes' : 'Custom'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 min-h-0">
              {activeTab === 'recipe' ? (
                <>
                  <div className="relative flex-shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search recipes…"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    {recipes.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">No recipes yet.</p>
                        <Link to="/recipes/new" className="text-xs text-primary hover:underline mt-1 block">
                          Add a recipe first
                        </Link>
                      </div>
                    ) : filteredRecipes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No recipes found</p>
                    ) : (
                      filteredRecipes.map((recipe: Recipe) => {
                        const isSelected = selectedRecipeId === recipe.id
                        return (
                          <button
                            key={recipe.id}
                            onClick={() => setSelectedRecipeId(isSelected ? null : recipe.id)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-accent/50'
                            }`}
                          >
                            <p className="font-medium truncate">{recipe.title}</p>
                            {recipe.tags?.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {recipe.tags.join(', ')}
                              </p>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              ) : (
                <Input
                  placeholder="e.g. Leftovers, takeout, sandwiches…"
                  value={customMeal}
                  onChange={(e) => setCustomMeal(e.target.value)}
                  autoFocus
                />
              )}

              {household && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Plan for</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setShareMode('household'); setSharedWith([]) }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        shareMode === 'household'
                          ? 'bg-primary/10 text-primary border-primary/40'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Everyone
                    </button>
                    {members.filter((m) => m.id !== user?.id).map((member) => {
                      const isSelected = shareMode === 'members' && sharedWith.includes(member.id)
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => { setShareMode('members'); setSharedWith([member.id]) }}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary border-primary/40'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <span
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: member.color || '#22c55e' }}
                          />
                          {memberDisplayName(member.id, members)}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => { setShareMode('private'); setSharedWith([]) }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        shareMode === 'private'
                          ? 'bg-primary/10 text-primary border-primary/40'
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Just me
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex-shrink-0 flex justify-end gap-2">
              <Button variant="outline" onClick={meals.length > 0 ? backToView : onClose}>
                Cancel
              </Button>
              <Button disabled={!canSave || setMeal.isPending} onClick={handleSave}>
                {setMeal.isPending ? 'Saving…' : editingMeal ? 'Save changes' : 'Add meal'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
