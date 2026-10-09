import type { TFunction } from 'i18next'

/** Localized meal-type label; unknown types fall back to the raw value. */
export function mealLabel(t: TFunction, type: string): string {
  switch (type) {
    case 'breakfast': return t('meals.breakfast')
    case 'lunch':     return t('meals.lunch')
    case 'dinner':    return t('meals.dinner')
    case 'snack':     return t('meals.snack')
    default:          return type
  }
}
