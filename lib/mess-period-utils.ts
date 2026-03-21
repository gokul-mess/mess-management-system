/**
 * Shared utilities for mess period operations
 * Handles date range calculations and mess period queries
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type DateRangeType = 'this_month' | 'last_month' | 'last_3_months' | 'all_time' | 'custom'

export interface DateRange {
  start: string
  end: string
}

export interface MessPeriod {
  id: string
  user_id: string
  start_date: string
  end_date: string
  original_end_date: string | null
  meal_plan: string | null
  is_active: boolean
  created_at: string
}

/**
 * Get date range based on mess periods for a specific user
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch mess periods for
 * @param rangeType - Type of date range to fetch
 * @param customDates - Custom start and end dates (required if rangeType is 'custom')
 * @param fallbackCreatedAt - Fallback date for 'all_time' if no mess periods exist
 * @returns Promise with start and end dates
 */
export async function getMessPeriodDateRange(
  supabase: SupabaseClient,
  userId: string,
  rangeType: DateRangeType,
  customDates?: { start: string; end: string },
  fallbackCreatedAt?: string
): Promise<DateRange> {
  const today = new Date()
  const end = today.toISOString().split('T')[0]

  switch (rangeType) {
    case 'this_month': {
      // Fetch current active mess period
      const { data: activePeriod } = await supabase
        .from('mess_periods')
        .select('start_date, end_date')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (activePeriod) {
        return {
          start: new Date(activePeriod.start_date).toISOString().split('T')[0],
          end: new Date(activePeriod.end_date).toISOString().split('T')[0]
        }
      }
      // Fallback to current calendar month if no active period
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: start.toISOString().split('T')[0], end }
    }

    case 'last_month': {
      // Fetch previous mess period (most recent inactive period)
      const { data: previousPeriod } = await supabase
        .from('mess_periods')
        .select('start_date, end_date')
        .eq('user_id', userId)
        .eq('is_active', false)
        .order('end_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (previousPeriod) {
        return {
          start: new Date(previousPeriod.start_date).toISOString().split('T')[0],
          end: new Date(previousPeriod.end_date).toISOString().split('T')[0]
        }
      }
      // Fallback to previous calendar month
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      return {
        start: lastMonth.toISOString().split('T')[0],
        end: lastMonthEnd.toISOString().split('T')[0]
      }
    }

    case 'last_3_months': {
      // Fetch last 3 mess periods
      const { data: periods } = await supabase
        .from('mess_periods')
        .select('start_date, end_date')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
        .limit(3)

      if (periods && periods.length > 0) {
        const oldestPeriod = periods[periods.length - 1]
        return {
          start: new Date(oldestPeriod.start_date).toISOString().split('T')[0],
          end
        }
      }
      // Fallback to last 3 calendar months
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
      return { start: threeMonthsAgo.toISOString().split('T')[0], end }
    }

    case 'all_time': {
      // Fetch earliest mess period start date
      const { data: earliestPeriod } = await supabase
        .from('mess_periods')
        .select('start_date')
        .eq('user_id', userId)
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (earliestPeriod) {
        return {
          start: new Date(earliestPeriod.start_date).toISOString().split('T')[0],
          end
        }
      }
      // Fallback to account creation date or default
      const start = fallbackCreatedAt 
        ? new Date(fallbackCreatedAt).toISOString().split('T')[0]
        : '2024-01-01'
      return { start, end }
    }

    case 'custom': {
      if (!customDates) {
        throw new Error('Custom dates are required for custom range type')
      }
      return { start: customDates.start, end: customDates.end }
    }

    default:
      throw new Error(`Unknown range type: ${rangeType}`)
  }
}

/**
 * Get period type label for display
 * @param rangeType - Type of date range
 * @returns Human-readable label
 */
export function getPeriodTypeLabel(rangeType: DateRangeType): string {
  switch (rangeType) {
    case 'this_month':
      return 'Current Mess Month'
    case 'last_month':
      return 'Previous Mess Month'
    case 'last_3_months':
      return 'Last 3 Mess Months'
    case 'all_time':
      return 'All Time'
    case 'custom':
      return 'Custom Range'
    default:
      return 'Unknown Period'
  }
}

/**
 * Fetch mess period that overlaps with a given date range
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch mess period for
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns Promise with mess period data or null
 */
export async function getOverlappingMessPeriod(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<MessPeriod | null> {
  const { data } = await supabase
    .from('mess_periods')
    .select('*')
    .eq('user_id', userId)
    .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data
}

/**
 * Get active mess period for a user
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch active mess period for
 * @returns Promise with active mess period data or null
 */
export async function getActiveMessPeriod(
  supabase: SupabaseClient,
  userId: string
): Promise<MessPeriod | null> {
  const { data } = await supabase
    .from('mess_periods')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return data
}

/**
 * Get meal plan for a user from their active mess period
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch meal plan for
 * @returns Promise with meal plan ('DL', 'L', 'D') or default 'DL'
 */
export async function getUserMealPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const { data: messPeriod } = await supabase
    .from('mess_periods')
    .select('meal_plan')
    .eq('user_id', userId)
    .lte('start_date', today)
    .gte('end_date', today)
    .maybeSingle()

  return messPeriod?.meal_plan || 'DL'
}

/**
 * Get all mess periods for a user within a date range
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch mess periods for
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns Promise with array of mess periods
 */
export async function getMessPeriodsInRange(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<MessPeriod[]> {
  const { data } = await supabase
    .from('mess_periods')
    .select('*')
    .eq('user_id', userId)
    .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`)
    .order('start_date', { ascending: true })

  return data || []
}
