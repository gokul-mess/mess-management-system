/**
 * Database Seeding Utilities for Testing
 * 
 * Provides utilities for seeding test data into the database.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { createMockUser, createMockOwner } from '@/__mocks__/user-profile'
import { createMockMessPeriod } from '@/__mocks__/mess-periods'
import { createMockDailyLog } from '@/__mocks__/daily-logs'
import { createMockLeaveRecord } from '@/__mocks__/leave-records'

/**
 * Seed a test owner user
 * 
 * @param supabase - Supabase client instance
 * @returns Created owner user
 * 
 * @example
 * const owner = await seedTestOwner(supabase)
 */
export async function seedTestOwner(supabase: SupabaseClient) {
  const owner = createMockOwner()
  
  const { data, error } = await supabase
    .from('users')
    .insert(owner)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to seed owner: ${error.message}`)
  }
  
  return data
}

/**
 * Seed test student users
 * 
 * @param supabase - Supabase client instance
 * @param count - Number of students to seed
 * @returns Array of created student users
 * 
 * @example
 * const students = await seedTestStudents(supabase, 10)
 */
export async function seedTestStudents(
  supabase: SupabaseClient,
  count: number = 5
) {
  const students = Array.from({ length: count }, () => createMockUser())
  
  const { data, error } = await supabase
    .from('users')
    .insert(students)
    .select()
  
  if (error) {
    throw new Error(`Failed to seed students: ${error.message}`)
  }
  
  return data
}

/**
 * Seed test mess periods for a user
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param count - Number of mess periods to seed
 * @returns Array of created mess periods
 * 
 * @example
 * const periods = await seedTestMessPeriods(supabase, 'user-123', 3)
 */
export async function seedTestMessPeriods(
  supabase: SupabaseClient,
  userId: string,
  count: number = 1
) {
  const periods = Array.from({ length: count }, (_, index) => {
    const today = new Date()
    const monthOffset = index
    const startDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() - monthOffset + 1, 0)
    
    return createMockMessPeriod({
      user_id: userId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      is_active: index === 0,
    })
  })
  
  const { data, error } = await supabase
    .from('mess_periods')
    .insert(periods)
    .select()
  
  if (error) {
    throw new Error(`Failed to seed mess periods: ${error.message}`)
  }
  
  return data
}

/**
 * Seed test daily logs for a user
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param count - Number of daily logs to seed
 * @returns Array of created daily logs
 * 
 * @example
 * const logs = await seedTestDailyLogs(supabase, 'user-123', 10)
 */
export async function seedTestDailyLogs(
  supabase: SupabaseClient,
  userId: string,
  count: number = 10
) {
  const logs = Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - index)
    
    return createMockDailyLog({
      user_id: userId,
      date: date.toISOString().split('T')[0],
      meal_type: index % 2 === 0 ? 'LUNCH' : 'DINNER',
    })
  })
  
  const { data, error } = await supabase
    .from('daily_logs')
    .insert(logs)
    .select()
  
  if (error) {
    throw new Error(`Failed to seed daily logs: ${error.message}`)
  }
  
  return data
}

/**
 * Seed test leave records for a user
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param count - Number of leave records to seed
 * @returns Array of created leave records
 * 
 * @example
 * const leaves = await seedTestLeaveRecords(supabase, 'user-123', 3)
 */
export async function seedTestLeaveRecords(
  supabase: SupabaseClient,
  userId: string,
  count: number = 3
) {
  const leaves = Array.from({ length: count }, (_, index) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + (index * 7))
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 3)
    
    return {
      user_id: userId,
      ...createMockLeaveRecord({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      }),
    }
  })
  
  const { data, error } = await supabase
    .from('leave_requests')
    .insert(leaves)
    .select()
  
  if (error) {
    throw new Error(`Failed to seed leave records: ${error.message}`)
  }
  
  return data
}

/**
 * Seed complete test data (owner, students, mess periods, logs, leaves)
 * 
 * @param supabase - Supabase client instance
 * @param options - Seeding options
 * @returns Object with all seeded data
 * 
 * @example
 * const testData = await seedCompleteTestData(supabase, {
 *   studentCount: 10,
 *   logsPerStudent: 20,
 *   leavesPerStudent: 2
 * })
 */
export async function seedCompleteTestData(
  supabase: SupabaseClient,
  options: {
    studentCount?: number
    logsPerStudent?: number
    leavesPerStudent?: number
  } = {}
) {
  const {
    studentCount = 5,
    logsPerStudent = 10,
    leavesPerStudent = 2,
  } = options
  
  // Seed owner
  const owner = await seedTestOwner(supabase)
  
  // Seed students
  const students = await seedTestStudents(supabase, studentCount)
  
  // Seed mess periods, logs, and leaves for each student
  const allMessPeriods = []
  const allLogs = []
  const allLeaves = []
  
  for (const student of students) {
    const messPeriods = await seedTestMessPeriods(supabase, student.id, 1)
    const logs = await seedTestDailyLogs(supabase, student.id, logsPerStudent)
    const leaves = await seedTestLeaveRecords(supabase, student.id, leavesPerStudent)
    
    allMessPeriods.push(...messPeriods)
    allLogs.push(...logs)
    allLeaves.push(...leaves)
  }
  
  return {
    owner,
    students,
    messPeriods: allMessPeriods,
    logs: allLogs,
    leaves: allLeaves,
  }
}
