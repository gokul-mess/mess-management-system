export interface BalanceDaysInput {
  totalDays: number | null
  consumedDays: number | null
  leaveDays: number | null
  extraMeals?: number | null
}

export interface BalanceDaysResult {
  totalDays: number
  consumedDays: number
  leaveDays: number
  extraMeals: number
  balanceDays: number // can be negative if extra meals consumed
}

/**
 * Calculates remaining usable balance days for a student's subscription.
 *
 * Formula: balanceDays = totalDays - consumedDays - leaveDays - extraMeals
 *
 * - totalDays   : always 30 (base subscription, from original_end_date)
 * - consumedDays: meals actually eaten (CONSUMED logs)
 * - leaveDays   : approved leave days within the base 30-day window
 * - extraMeals  : meals consumed after subscription expired (debt)
 *
 * Leave days are subtracted because the student is absent on those days —
 * they are neither consumed nor available as usable mess days.
 * The leave extension to end_date is a calendar extension only and is
 * reflected separately in "Days Remaining" (not in balance).
 *
 * Extra meals create debt and can make balance negative.
 * SKIPPED meals (unconsumed without leave) do NOT affect balance.
 *
 * Result can be negative if extra meals consumed.
 */
export function calculateBalanceDays(input: BalanceDaysInput): BalanceDaysResult {
  const totalDays = Math.max(0, input.totalDays ?? 0)
  const consumedDays = Math.max(0, input.consumedDays ?? 0)
  const leaveDays = Math.max(0, input.leaveDays ?? 0)
  const extraMeals = Math.max(0, input.extraMeals ?? 0)

  // Allow negative balance if extra meals consumed
  const balanceDays = totalDays - consumedDays - leaveDays - extraMeals

  return { totalDays, consumedDays, leaveDays, extraMeals, balanceDays }
}
