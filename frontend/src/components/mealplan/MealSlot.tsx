import { Plus } from 'lucide-react'
import type { MealPlan } from '@/types'

interface Props {
  meals: MealPlan[]
  onClick: () => void
  readOnly?: boolean
}

export default function MealSlot({ meals, onClick, readOnly }: Props) {
  if (meals.length === 0) {
    if (readOnly) {
      return <div className="w-full h-full min-h-[60px] rounded-lg border border-dashed opacity-30" />
    }
    return (
      <button
        onClick={onClick}
        className="w-full h-full min-h-[60px] flex items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:border-border transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
    )
  }

  if (readOnly) {
    return (
      <div className="w-full min-h-[60px] rounded-lg border bg-card p-2 space-y-0.5">
        {meals.map((meal) => (
          <p key={meal.id} className="text-xs font-medium line-clamp-1 leading-snug">
            {meal.expand?.recipe?.title || meal.custom_meal || '—'}
          </p>
        ))}
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full min-h-[60px] rounded-lg border bg-card p-2 text-left hover:bg-accent/50 transition-colors space-y-0.5"
    >
      {meals.map((meal) => (
        <p key={meal.id} className="text-xs font-medium line-clamp-1 leading-snug">
          {meal.expand?.recipe?.title || meal.custom_meal || '—'}
        </p>
      ))}
    </button>
  )
}
