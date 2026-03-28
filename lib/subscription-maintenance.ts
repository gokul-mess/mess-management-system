/**
 * Subscription Maintenance Service
 * 
 * Handles periodic maintenance tasks without requiring cron jobs:
 * 1. Mark skipped meals (meals not consumed without leave)
 * 2. Check and update expired subscriptions
 * 
 * These functions are called at strategic points in the application.
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Marks meals as SKIPPED when:
 * - Meal time has passed (lunch: 4 PM, dinner: end of day)
 * - No daily_log entry exists for that meal
 * - No approved leave for that day
 * 
 * Called: When owner opens verify meal section or dashboard
 */
export async function markSkippedMeals(supabase: SupabaseClient): Promise<void> {
  try {
    const now = new Date()
    const currentHour = now.getHours()
    const today = now.toISOString().split('T')[0]
    
    // Only mark lunch as skipped after 4 PM
    // Only mark dinner as skipped after midnight (next day)
    const shouldMarkLunch = currentHour >= 16
    const shouldMarkDinner = false // We'll mark dinner at start of next day
    
    if (!shouldMarkLunch && !shouldMarkDinner) {
      return // Nothing to mark yet
    }

    // Get all active students with active mess periods
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select(`
        id,
        mess_periods!inner(id, is_active, meal_plan, start_date, end_date)
      `)
      .eq('role', 'STUDENT')
      .eq('mess_periods.is_active', true)

    if (studentsError) throw studentsError
    if (!students || students.length === 0) return

    const mealsToCheck: Array<{ userId: string; mealType: 'LUNCH' | 'DINNER'; messPeriodId: string; mealPlan: string }> = []

    for (const student of students) {
      const periods = student.mess_periods as Array<{ 
        id: string
        is_active: boolean
        meal_plan: string
        start_date: string
        end_date: string
      }>
      const activePeriod = periods.find(p => p.is_active)
      
      if (!activePeriod) continue
      
      // Check if today is within the mess period
      if (today < activePeriod.start_date || today > activePeriod.end_date) continue
      
      const mealPlan = activePeriod.meal_plan || 'DL'
      
      // Add meals to check based on meal plan
      if (shouldMarkLunch && (mealPlan === 'L' || mealPlan === 'DL')) {
        mealsToCheck.push({ 
          userId: student.id, 
          mealType: 'LUNCH', 
          messPeriodId: activePeriod.id,
          mealPlan 
        })
      }
      if (shouldMarkDinner && (mealPlan === 'D' || mealPlan === 'DL')) {
        mealsToCheck.push({ 
          userId: student.id, 
          mealType: 'DINNER', 
          messPeriodId: activePeriod.id,
          mealPlan 
        })
      }
    }

    if (mealsToCheck.length === 0) return

    // Check which meals are already logged
    const { data: existingLogs, error: logsError } = await supabase
      .from('daily_logs')
      .select('user_id, meal_type')
      .eq('date', today)
      .in('user_id', mealsToCheck.map(m => m.userId))

    if (logsError) throw logsError

    const loggedMeals = new Set(
      (existingLogs || []).map(log => `${log.user_id}-${log.meal_type}`)
    )

    // Check for approved leaves
    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('user_id')
      .eq('is_approved', true)
      .lte('start_date', today)
      .gte('end_date', today)

    if (leavesError) throw leavesError

    const usersOnLeave = new Set((leaves || []).map(l => l.user_id))

    // Filter meals that need to be marked as SKIPPED
    const mealsToSkip = mealsToCheck.filter(meal => {
      const mealKey = `${meal.userId}-${meal.mealType}`
      return !loggedMeals.has(mealKey) && !usersOnLeave.has(meal.userId)
    })

    if (mealsToSkip.length === 0) return

    // Insert SKIPPED meal logs
    const skippedLogs = mealsToSkip.map(meal => ({
      user_id: meal.userId,
      date: today,
      meal_type: meal.mealType,
      status: 'SKIPPED',
      access_method: 'SYSTEM',
    }))

    const { error: insertError } = await supabase
      .from('daily_logs')
      .insert(skippedLogs)

    if (insertError) {
      console.error('Error marking skipped meals:', insertError)
    } else {
      console.log(`Marked ${skippedLogs.length} meals as SKIPPED`)
    }
  } catch (error) {
    console.error('Error in markSkippedMeals:', error)
  }
}

/**
 * Checks for expired subscriptions and updates active status
 * 
 * Called: When owner opens dashboard or students list
 */
export async function checkExpiredSubscriptions(supabase: SupabaseClient): Promise<void> {
  try {
    // Call the database function
    const { error } = await supabase.rpc('check_expired_subscriptions')
    
    if (error) {
      console.error('Error checking expired subscriptions:', error)
    } else {
      console.log('Checked expired subscriptions')
    }
  } catch (error) {
    console.error('Error in checkExpiredSubscriptions:', error)
  }
}

/**
 * Runs all maintenance tasks
 * 
 * Called: When owner opens dashboard
 */
export async function runMaintenanceTasks(supabase: SupabaseClient): Promise<void> {
  await Promise.all([
    markSkippedMeals(supabase),
    checkExpiredSubscriptions(supabase),
  ])
}

/**
 * Checks if maintenance should run based on last run time
 * Prevents running too frequently (max once per hour)
 */
export function shouldRunMaintenance(): boolean {
  const lastRun = localStorage.getItem('last_maintenance_run')
  if (!lastRun) return true
  
  const lastRunTime = new Date(lastRun).getTime()
  const now = new Date().getTime()
  const oneHour = 60 * 60 * 1000
  
  return now - lastRunTime > oneHour
}

/**
 * Updates the last maintenance run timestamp
 */
export function updateMaintenanceTimestamp(): void {
  localStorage.setItem('last_maintenance_run', new Date().toISOString())
}
