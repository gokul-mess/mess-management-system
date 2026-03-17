import { createClient } from '@/lib/supabase/client'
import type { BalanceDaysInput } from '@/lib/balance'

/**
 * Fetches all data needed to compute balance days for a given student.
 *
 * - total_days  : derived from subscription_start_date & subscription_end_date in users table
 * - consumed_days: count of daily_logs rows where status = 'CONSUMED' for this user
 * - leave_days  : sum of approved leave durations from leaves table (is_approved = true)
 */
export async function fetchBalanceDaysData(userId: string): Promise<BalanceDaysInput> {
  const supabase = createClient()

  // Run all three queries in parallel for performance
  const [profileResult, logsResult, leavesResult] = await Promise.all([
    // 1. Get subscription dates to compute total_days
    supabase
      .from('users')
      .select('subscription_start_date, subscription_end_date')
      .eq('id', userId)
      .single(),

    // 2. Count meals with status CONSUMED for this student
    supabase
      .from('daily_logs')
      .select('log_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'CONSUMED'),

    // 3. Get all approved leaves to sum their durations
    supabase
      .from('leaves')
      .select('start_date, end_date')
      .eq('user_id', userId)
      .eq('is_approved', true),
  ])

  if (profileResult.error) throw profileResult.error
  if (logsResult.error) throw logsResult.error
  if (leavesResult.error) throw leavesResult.error

  // Calculate total_days from subscription date range
  const { subscription_start_date, subscription_end_date } = profileResult.data ?? {}
  let totalDays: number | null = null

  if (subscription_start_date && subscription_end_date) {
    const start = new Date(subscription_start_date)
    const end = new Date(subscription_end_date)
    const diffMs = end.getTime() - start.getTime()
    totalDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  // consumed_days = exact count from Supabase
  const consumedDays = logsResult.count ?? 0

  // leave_days = sum of (end_date - start_date + 1) for each approved leave
  const leaveDays = (leavesResult.data ?? []).reduce((sum, leave) => {
    const start = new Date(leave.start_date)
    const end = new Date(leave.end_date)
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    return sum + days
  }, 0)

  return { totalDays, consumedDays, leaveDays }
}
