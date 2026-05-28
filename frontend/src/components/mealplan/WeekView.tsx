import { format, addDays, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { MEAL_TYPES } from '@/lib/constants'
import MealSlot from './MealSlot'
import type { MealPlan } from '@/types'

interface Props {
  weekStart: Date
  meals: MealPlan[]
  onSlotClick: (date: string, mealType: string, meals: MealPlan[]) => void
  readOnly?: boolean
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export default function WeekView({ weekStart, meals, onSlotClick, readOnly }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="min-w-[580px]">
        {/* Day headers */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center py-1.5">
              <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
              <p
                className={cn(
                  'text-sm font-medium leading-tight',
                  isToday(day) && 'text-primary'
                )}
              >
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Meal type rows */}
        {MEAL_TYPES.map((mealType) => (
          <div
            key={mealType}
            className="grid gap-1 mb-1"
            style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}
          >
            <div className="flex items-center pr-1">
              <span className="text-xs font-medium text-muted-foreground">
                {MEAL_LABELS[mealType]}
              </span>
            </div>
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const slotMeals = meals.filter(
                (m) => m.date.startsWith(dateStr) && m.meal_type === mealType
              )
              return (
                <div key={dateStr} className="min-h-[64px]">
                  <MealSlot
                    meals={slotMeals}
                    onClick={() => onSlotClick(dateStr, mealType, slotMeals)}
                    readOnly={readOnly}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
