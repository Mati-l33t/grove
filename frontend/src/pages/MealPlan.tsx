import { useState } from 'react'
import { Link } from 'react-router-dom'
import { startOfWeek, addDays, addWeeks, subWeeks, format, isThisWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Pencil, Search, ShoppingCart, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '@/components/layout/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import WeekView from '@/components/mealplan/WeekView'
import { useWeekMealPlan, useSetMealPlan, useDeleteMealPlan } from '@/hooks/useMealPlan'
import { useHouseholdMembers } from '@/hooks/useHousehold'
import { useRecipes } from '@/hooks/useRecipes'
import { useActiveLists } from '@/hooks/useLists'
import { useAuthStore } from '@/stores/authStore'
import pb from '@/lib/pb'
import { cn, memberDisplayName } from '@/lib/utils'
import type { MealPlan, Recipe, ShareMode } from '@/types'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

interface SlotTarget {
  date: string
  mealType: string
}

export default function MealPlanPage() {
  const { user, household, permissions } = useAuthStore()
  const queryClient = useQueryClient()

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )

  const mealsQuery = useWeekMealPlan(weekStart)
  const recipesQuery = useRecipes()
  const listsQuery = useActiveLists()
  const membersQuery = useHouseholdMembers()
  const setMeal = useSetMealPlan()
  const deleteMeal = useDeleteMealPlan()

  const meals = mealsQuery.data ?? []
  const recipes = recipesQuery.data ?? []
  const members = membersQuery.data ?? []
  const shoppingLists = (listsQuery.data ?? []).filter((l) => l.type === 'shopping')

  // Member tab selection — defaults to current user's own plan
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(user?.id ?? null)

  // Meals filtered to the selected member's perspective
  const displayMeals = selectedMemberId
    ? meals.filter((m) =>
        m.household ||
        m.shared_with?.includes(selectedMemberId) ||
        m.user === selectedMemberId
      )
    : meals

  // Slot dialog state
  const [slotTarget, setSlotTarget] = useState<SlotTarget | null>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'form'>('form')
  const [editingMeal, setEditingMeal] = useState<MealPlan | null>(null)
  const [activeTab, setActiveTab] = useState<'recipe' | 'custom'>('recipe')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [recipeSearch, setRecipeSearch] = useState('')
  const [customMeal, setCustomMeal] = useState('')
  const [shareMode, setShareMode] = useState<ShareMode>(household ? 'household' : 'private')
  const [sharedWith, setSharedWith] = useState<string[]>([])

  // Add-to-list dialog state
  const [showAddToList, setShowAddToList] = useState(false)
  const [targetListId, setTargetListId] = useState('')

  const addIngredientsToList = useMutation({
    mutationFn: async ({ listId, items }: { listId: string; items: string[] }) => {
      await Promise.all(
        items.map((text, i) =>
          pb.collection('list_items').create({
            list: listId,
            text,
            checked: false,
            order: i,
            added_by: user!.id,
          })
        )
      )
    },
    onSuccess: (_, { listId }) => {
      queryClient.invalidateQueries({ queryKey: ['list-items', listId] })
    },
  })

  // Derive current slot meals from live query so they update after mutations
  const currentSlotMeals = slotTarget
    ? displayMeals.filter(
        (m) => m.date.startsWith(slotTarget.date) && m.meal_type === slotTarget.mealType
      )
    : []

  function resetForm() {
    setEditingMeal(null)
    setActiveTab('recipe')
    setSelectedRecipeId(null)
    setRecipeSearch('')
    setCustomMeal('')
    setShareMode(household ? 'household' : 'private')
    setSharedWith([])
  }

  function openSlot(date: string, mealType: string) {
    const existingMeals = displayMeals.filter(
      (m) => m.date.startsWith(date) && m.meal_type === mealType
    )
    setSlotTarget({ date, mealType })
    setDialogMode(existingMeals.length > 0 ? 'view' : 'form')
    setEditingMeal(null)
    setActiveTab('recipe')
    setSelectedRecipeId(null)
    setRecipeSearch('')
    setCustomMeal('')
    if (selectedMemberId && selectedMemberId !== user?.id) {
      setShareMode('members')
      setSharedWith([selectedMemberId])
    } else {
      setShareMode(household ? 'household' : 'private')
      setSharedWith([])
    }
  }

  function closeSlot() {
    setSlotTarget(null)
    setDialogMode('form')
    resetForm()
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
    if (!slotTarget) return
    const hasRecipe = activeTab === 'recipe' && selectedRecipeId
    const hasCustom = activeTab === 'custom' && customMeal.trim()
    if (!hasRecipe && !hasCustom) return
    try {
      await setMeal.mutateAsync({
        id: editingMeal?.id,
        date: slotTarget.date,
        meal_type: slotTarget.mealType,
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

  async function handleRemoveMeal(id: string) {
    const isLast = currentSlotMeals.length === 1
    try {
      await deleteMeal.mutateAsync(id)
      toast.success('Meal removed.')
      if (editingMeal?.id === id) resetForm()
      if (isLast) closeSlot()
    } catch {
      toast.error('Failed to remove meal.')
    }
  }

  function getWeekIngredients(): string[] {
    const result: string[] = []
    for (const meal of meals) {
      const recipe = meal.expand?.recipe
      if (!recipe?.ingredients) continue
      for (const ing of recipe.ingredients) {
        const parts = [ing.amount, ing.unit, ing.name].filter(Boolean)
        result.push(parts.join(' ').trim())
      }
    }
    return result
  }

  async function handleAddToList() {
    const items = getWeekIngredients()
    if (items.length === 0 || !targetListId) return
    try {
      await addIngredientsToList.mutateAsync({ listId: targetListId, items })
      toast.success(`Added ${items.length} ingredient${items.length !== 1 ? 's' : ''} to list.`)
      setShowAddToList(false)
      setTargetListId('')
    } catch {
      toast.error('Failed to add ingredients.')
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

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
  const isCurrentWeek = isThisWeek(weekStart, { weekStartsOn: 1 })
  const weekIngredientCount = getWeekIngredients().length
  const recipeCount = meals.filter((m) => m.recipe).length

  return (
    <>
      <TopBar
        title="Meal Plan"
        actions={
          weekIngredientCount > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1 px-2 text-xs"
              onClick={() => { setTargetListId(''); setShowAddToList(true) }}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add to list</span>
            </Button>
          ) : undefined
        }
      />

      <div className="max-w-5xl mx-auto w-full p-4 md:px-8 space-y-4">
        {/* Desktop page header */}
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-xl font-semibold">Meal Plan</h1>
          {weekIngredientCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setTargetListId(''); setShowAddToList(true) }}
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Add to shopping list
            </Button>
          )}
        </div>

        {/* Member tabs */}
        {members.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-0.5 -mb-1">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors flex-shrink-0',
                  selectedMemberId === member.id
                    ? 'bg-primary/10 text-primary border-primary/40'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: member.color || '#22c55e' }}
                />
                {memberDisplayName(member.id, members)}
                {member.id === user?.id && (
                  <span className="opacity-60">(me)</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium flex-1 text-center">{weekLabel}</span>
          {!isCurrentWeek ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-shrink-0"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              This week
            </Button>
          ) : (
            <div className="w-[72px] flex-shrink-0" />
          )}
        </div>

        {/* Week grid */}
        {mealsQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <WeekView
            weekStart={weekStart}
            meals={displayMeals}
            onSlotClick={(date, mealType) => openSlot(date, mealType)}
            readOnly={!permissions.meal_plan}
          />
        )}
      </div>

      {/* Slot dialog */}
      <Dialog open={!!slotTarget} onOpenChange={(o) => { if (!o) closeSlot() }}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 flex-shrink-0">
            <DialogTitle>
              {slotTarget
                ? `${MEAL_LABELS[slotTarget.mealType]} · ${format(new Date(`${slotTarget.date}T00:00:00`), 'EEE, MMM d')}`
                : ''}
            </DialogTitle>
          </DialogHeader>

          {dialogMode === 'view' ? (
            <>
              {/* View mode: full meal details */}
              <div className="px-6 pb-4 space-y-2 flex-1 overflow-y-auto">
                {currentSlotMeals.map((meal) => {
                  const label = meal.expand?.recipe?.title || meal.custom_meal || '—'
                  const scopeLabel = getScopeLabel(meal)
                  const canEditMeal = meal.user === user?.id || user?.is_admin
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
                            onClick={() => handleRemoveMeal(meal.id)}
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
                <Button variant="outline" onClick={closeSlot} className="ml-auto">
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Form mode: add or edit */}
              {currentSlotMeals.length > 0 && (
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

              {/* Tabs */}
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

              {/* Form body */}
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

              {/* Footer */}
              <div className="px-6 py-4 border-t flex-shrink-0 flex justify-end gap-2">
                <Button variant="outline" onClick={currentSlotMeals.length > 0 ? backToView : closeSlot}>
                  Cancel
                </Button>
                <Button
                  disabled={!canSave || setMeal.isPending}
                  onClick={handleSave}
                >
                  {setMeal.isPending
                    ? 'Saving…'
                    : editingMeal ? 'Save changes' : 'Add meal'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add to list dialog */}
      <Dialog
        open={showAddToList}
        onOpenChange={(o) => { if (!o) { setShowAddToList(false); setTargetListId('') } }}
      >
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add ingredients to list</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Adds ingredients from {recipeCount} recipe{recipeCount !== 1 ? 's' : ''} planned
            this week ({weekIngredientCount} item{weekIngredientCount !== 1 ? 's' : ''}).
          </p>
          {shoppingLists.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No shopping lists found.{' '}
              <Link to="/lists" className="text-primary hover:underline">
                Create one first.
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              <Select value={targetListId} onValueChange={setTargetListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shopping list" />
                </SelectTrigger>
                <SelectContent>
                  {shoppingLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowAddToList(false); setTargetListId('') }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!targetListId || addIngredientsToList.isPending}
                  onClick={handleAddToList}
                >
                  {addIngredientsToList.isPending
                    ? 'Adding…'
                    : `Add ${weekIngredientCount} items`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
