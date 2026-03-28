import { createClient } from '@/lib/supabase/client'

/**
 * Marks meals as SKIPPED for students who didn't consume them and didn't request leave.
 * 
 * SKIPPED = Student didn't request leave AND didn't consume the meal
 * 
 * This should be run at end of day (11:59 PM) or on-demand.
 * 
 * @param date - Date to check in YYYY-MM-DD format
 */
export async function markSkippedMeals(date: string) {
  const supabase = createClient()
  
  try {
    // Get all active students with their mess periods
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select(`
        id,
        mess_periods!inner(
          meal_plan,
          start_date,
          end_date,
          is_active
        )
      `)
      .eq('role', 'STUDENT')
      .eq('mess_periods.is_active', true)
      .lte('mess_periods.start_date', date)
      .gte('mess_periods.end_date', date)
    
    if (studentsError) throw studentsError
    if (!students || students.length === 0) {
      console.log('No active students found for date:', date)
      return { success: true, skippedCount: 0 }
    }
    
    // Get all approved leaves for this date
    const { data: leaves, error: leavesError } = await supabase
      .from('leaves')
      .select('user_id')
      .eq('is_approved', true)
      .lte('start_date', date)
      .gte('end_date', date)
    
    if (leavesError) throw leavesError
    
    const usersOnLeave = new Set(leaves?.map(l => l.user_id) || [])
    
    let skippedCount = 0
    
    for (const student of students) {
      // Skip if student is on approved leave
      if (usersOnLeave.has(student.id)) {
        console.log(`Student ${student.id} is on approved leave, skipping`)
        continue
      }
      
      const messPeriod = Array.isArray(student.mess_periods) 
        ? student.mess_periods[0] 
        : student.mess_periods
      
      const mealPlan = messPeriod?.meal_plan || 'DL'
      
      // Check if lunch should be marked as SKIPPED
      if (mealPlan === 'L' || mealPlan === 'DL') {
        const { data: lunchLog, error: lunchError } = await supabase
          .from('daily_logs')
          .select('log_id')
          .eq('user_id', student.id)
          .eq('date', date)
          .eq('meal_type', 'LUNCH')
          .maybeSingle()
        
        if (lunchError) {
          console.error(`Error checking lunch log for student ${student.id}:`, lunchError)
          continue
        }
        
        if (!lunchLog) {
          // Mark as SKIPPED (student didn't request leave AND didn't consume)
          const { error: insertError } = await supabase
            .from('daily_logs')
            .insert({
              user_id: student.id,
              date,
              meal_type: 'LUNCH',
              status: 'SKIPPED'
            })
          
          if (insertError) {
            console.error(`Error marking lunch as SKIPPED for student ${student.id}:`, insertError)
          } else {
            skippedCount++
            console.log(`Marked lunch as SKIPPED for student ${student.id}`)
          }
        }
      }
      
      // Check if dinner should be marked as SKIPPED
      if (mealPlan === 'D' || mealPlan === 'DL') {
        const { data: dinnerLog, error: dinnerError } = await supabase
          .from('daily_logs')
          .select('log_id')
          .eq('user_id', student.id)
          .eq('date', date)
          .eq('meal_type', 'DINNER')
          .maybeSingle()
        
        if (dinnerError) {
          console.error(`Error checking dinner log for student ${student.id}:`, dinnerError)
          continue
        }
        
        if (!dinnerLog) {
          // Mark as SKIPPED (student didn't request leave AND didn't consume)
          const { error: insertError } = await supabase
            .from('daily_logs')
            .insert({
              user_id: student.id,
              date,
              meal_type: 'DINNER',
              status: 'SKIPPED'
            })
          
          if (insertError) {
            console.error(`Error marking dinner as SKIPPED for student ${student.id}:`, insertError)
          } else {
            skippedCount++
            console.log(`Marked dinner as SKIPPED for student ${student.id}`)
          }
        }
      }
    }
    
    console.log(`Marked ${skippedCount} meals as SKIPPED for date ${date}`)
    return { success: true, skippedCount }
    
  } catch (error) {
    console.error('Error marking skipped meals:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Marks skipped meals for yesterday (useful for daily cron job)
 */
export async function markYesterdaySkippedMeals() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]
  
  return markSkippedMeals(dateStr)
}
