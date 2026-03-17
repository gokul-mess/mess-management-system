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
 * Calculates remaining balance days for a student's subscription.
 *
 * Formula: balance_days = total_days - consumed_days - leave_days
 * Null inputs are treated as 0. Result is clamped to minimum 0.
 */
export function calculateBalanceDays(input: BalanceDaysInput): BalanceDaysResult {
  const totalDays = Math.max(0, input.totalDays ?? 0)
  const consumedDays = Math.max(0, input.consumedDays ?? 0)
  const leaveDays = Math.max(0, input.leaveDays ?? 0)

  const balanceDays = Math.max(0, totalDays - consumedDays - leaveDays)

  return { totalDays, consumedDays, leaveDays, balanceDays }
}
