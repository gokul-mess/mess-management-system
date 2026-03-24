/** Pricing and mess-cycle utilities */

export interface MealPlanPricing {
  lunch_price: number
  dinner_price: number
  both_price: number
}

export const DEFAULT_PRICING: MealPlanPricing = {
  lunch_price: 1500,
  dinner_price: 1500,
  both_price: 3000,
}

/** Returns the monthly payable amount for a student's meal plan */
export function getPayableAmount(
  mealPlan: 'L' | 'D' | 'DL' | string | null | undefined,
  pricing: MealPlanPricing
): number {
  if (mealPlan === 'L') return pricing.lunch_price
  if (mealPlan === 'D') return pricing.dinner_price
  return pricing.both_price
}

export interface MessCycle {
  startDate: Date
  endDate: Date
  totalDays: number
  daysCompleted: number
  daysRemaining: number
  progressPercent: number
}

/** Computes a rolling 30-day cycle from the given start date.
 *  Accepts both plain YYYY-MM-DD strings and full ISO timestamps. */
export function computeMessCycle(startDateStr: string): MessCycle {
  // Strip any time/timezone component — take only the YYYY-MM-DD portion
  const datePart = startDateStr.split('T')[0]
  const [y, m, d] = datePart.split('-').map(Number)
  const startDate = new Date(y, m - 1, d)
  const endDate = new Date(startDate)
  // +29 gives exactly 30 inclusive days (start day counts as day 1)
  endDate.setDate(endDate.getDate() + 29)

  const now = new Date()
  const totalDays = 30
  const msElapsed = Math.max(0, now.getTime() - startDate.getTime())
  const daysCompleted = Math.min(totalDays, Math.floor(msElapsed / 86400000))
  const daysRemaining = Math.max(0, totalDays - daysCompleted)
  const progressPercent = Math.round((daysCompleted / totalDays) * 100)

  return { startDate, endDate, totalDays, daysCompleted, daysRemaining, progressPercent }
}
