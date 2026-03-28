import { createClient } from '@/lib/supabase/client'
import type { BalanceDaysInput } from '@/lib/balance'

/**
 * Fetches all data needed to compute balance days for a given student.
 *
 * Key design decisions:
 * - totalDays is ALWAYS 30 (the base subscription length), derived from
 *   original_end_date, NOT end_date. end_date can be extended by approved
 *   leaves, but the usable mess days never exceed 30.
 * - consumedDays = meals with status CONSUMED within the base 30-day window.
 * - leaveDays = approved leave days overlapping the base 30-day window.
 * - extraMeals = meals consumed after subscription expired (debt).
 * - balanceDays = 30 - consumedDays - leaveDays - extraMeals (see lib/balance.ts)
 *   Leave days are excluded from balance because the student is absent —
 *   they neither consume nor have those days available.
 *   Extra meals create debt and can make balance negative.
 * - SKIPPED meals (unconsumed without leave) do NOT affect balance.
 * - daysRemaining (calendar) is computed in the page from end_date (which
 *   includes leave extensions) and is a separate concept from balanceDays.
 */
export async function fetchBalanceDaysData(userId: string): Promise<BalanceDaysInput> {
  const supabase = createClient()

  // Get the active mess period — use is_active = true as single source of truth
  const { data: messPeriod, error: messPeriodError } = await supabase
    .from('mess_periods')
    .select('start_date, end_date, original_end_date, extra_meals_count')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (messPeriodError) throw messPeriodError

  if (!messPeriod?.start_date) {
    return { totalDays: null, consumedDays: 0, leaveDays: 0, extraMeals: 0 }
  }

  const periodStart = messPeriod.start_date
  // Use original_end_date for the 30-day base window.
  // Fall back to end_date only if original_end_date is missing (legacy data).
  const baseEnd = messPeriod.original_end_date ?? messPeriod.end_date

  if (!baseEnd) {
    return { totalDays: null, consumedDays: 0, leaveDays: 0, extraMeals: 0 }
  }

  // Run both queries in parallel, scoped to the base 30-day window
  const [logsResult, leavesResult] = await Promise.all([
    supabase
      .from('daily_logs')
      .select('log_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'CONSUMED')
      .gte('date', periodStart)
      .lte('date', baseEnd),

    supabase
      .from('leaves')
      .select('start_date, end_date')
      .eq('user_id', userId)
      .eq('is_approved', true)
      .lte('start_date', baseEnd)
      .gte('end_date', periodStart),
  ])

  if (logsResult.error) throw logsResult.error
  if (leavesResult.error) throw leavesResult.error

  // totalDays = base 30-day window (inclusive)
  const start = new Date(periodStart)
  const end = new Date(baseEnd)
  const totalDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)

  const consumedDays = logsResult.count ?? 0

  // leaveDays = approved leave days that fall within the base 30-day window
  const periodStartDate = new Date(periodStart)
  const periodEndDate = new Date(baseEnd)

  const leaveDays = (leavesResult.data ?? []).reduce((sum, leave) => {
    const leaveStart = new Date(leave.start_date)
    const leaveEnd = new Date(leave.end_date)
    const overlapStart = leaveStart > periodStartDate ? leaveStart : periodStartDate
    const overlapEnd = leaveEnd < periodEndDate ? leaveEnd : periodEndDate
    if (overlapStart <= overlapEnd) {
      return sum + Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
    }
    return sum
  }, 0)

  return { totalDays, consumedDays, leaveDays, extraMeals: messPeriod.extra_meals_count ?? 0 }
}
