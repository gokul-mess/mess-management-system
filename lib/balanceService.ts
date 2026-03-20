import { createClient } from '@/lib/supabase/client'
import type { BalanceDaysInput } from '@/lib/balance'

/**
 * Fetches all data needed to compute balance days for a given student.
 *
 * - total_days  : derived from current active mess_period (start_date & end_date)
 * - consumed_days: count of daily_logs rows where status = 'CONSUMED' for this user
 * - leave_days  : sum of approved leave durations from leaves table (is_approved = true)
 */
export async function fetchBalanceDaysData(userId: string): Promise<BalanceDaysInput> {
  const supabase = createClient()

  // First, get the current active mess period
  const { data: messPeriod, error: messPeriodError } = await supabase
    .from('mess_periods')
    .select('start_date, end_date')
    .eq('user_id', userId)
    .gte('end_date', new Date().toISOString().split('T')[0]) // Active period (end_date >= today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (messPeriodError) throw messPeriodError

  // If no active mess period, return zeros
  if (!messPeriod?.start_date || !messPeriod?.end_date) {
    return { totalDays: null, consumedDays: 0, leaveDays: 0 }
  }

  const periodStart = messPeriod.start_date
  const periodEnd = messPeriod.end_date

  // Run queries in parallel, filtered to current mess period date range
  const [logsResult, leavesResult] = await Promise.all([
    // Count meals with status CONSUMED within the current mess period
    supabase
      .from('daily_logs')
      .select('log_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'CONSUMED')
      .gte('date', periodStart)
      .lte('date', periodEnd),

    // Get approved leaves that overlap with the current mess period
    supabase
      .from('leaves')
      .select('start_date, end_date')
      .eq('user_id', userId)
      .eq('is_approved', true)
      .lte('start_date', periodEnd)
      .gte('end_date', periodStart),
  ])

  if (logsResult.error) throw logsResult.error
  if (leavesResult.error) throw leavesResult.error

  // Calculate total_days from current active mess period
  const start = new Date(periodStart)
  const end = new Date(periodEnd)
  const diffMs = end.getTime() - start.getTime()
  const totalDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1)

  // consumed_days = exact count from Supabase (already filtered to period)
  const consumedDays = logsResult.count ?? 0

  // leave_days = sum of leave days that fall within the current mess period
  const periodStartDate = new Date(periodStart)
  const periodEndDate = new Date(periodEnd)
  
  const leaveDays = (leavesResult.data ?? []).reduce((sum, leave) => {
    const leaveStart = new Date(leave.start_date)
    const leaveEnd = new Date(leave.end_date)
    
    // Calculate the overlap between leave and mess period
    const overlapStart = leaveStart > periodStartDate ? leaveStart : periodStartDate
    const overlapEnd = leaveEnd < periodEndDate ? leaveEnd : periodEndDate
    
    // Only count if there's actual overlap
    if (overlapStart <= overlapEnd) {
      const days = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      return sum + days
    }
    
    return sum
  }, 0)

  return { totalDays, consumedDays, leaveDays }
}
