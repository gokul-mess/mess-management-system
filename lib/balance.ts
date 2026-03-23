export interface BalanceDaysInput {
  totalDays: number | null
  consumedDays: number | null
  leaveDays: number | null
}

export interface BalanceDaysResult {
  totalDays: number
  consumedDays: number
  leaveDays: number
  balanceDays: number // never negative
}

/**
 * Calculates remaining usable balance days for a student's subscription.
 *
 * Formula: balanceDays = totalDays - consumedDays - leaveDays
 *
 * - totalDays   : always 30 (base subscription, from original_end_date)
 * - consumedDays: meals actually eaten (CONSUMED logs)
 * - leaveDays   : approved leave days within the base 30-day window
 *
 * Leave days are subtracted because the student is absent on those days —
 * they are neither consumed nor available as usable mess days.
 * The leave extension to end_date is a calendar extension only and is
 * reflected separately in "Days Remaining" (not in balance).
 *
 * Result is clamped to [0, totalDays].
 */
export function calculateBalanceDays(input: BalanceDaysInput): BalanceDaysResult {
  const totalDays = Math.max(0, input.totalDays ?? 0)
  const consumedDays = Math.max(0, input.consumedDays ?? 0)
  const leaveDays = Math.max(0, input.leaveDays ?? 0)

  const balanceDays = Math.max(0, Math.min(totalDays, totalDays - consumedDays - leaveDays))

  return { totalDays, consumedDays, leaveDays, balanceDays }
}
