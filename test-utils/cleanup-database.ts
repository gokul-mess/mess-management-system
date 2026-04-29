/**
 * Database Cleanup Utilities for Testing
 * 
 * Provides utilities for cleaning up test data from the database.
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Delete all test users (students and owners)
 * 
 * @param supabase - Supabase client instance
 * @param userIds - Optional array of specific user IDs to delete
 * 
 * @example
 * await cleanupTestUsers(supabase)
 * 
 * @example
 * await cleanupTestUsers(supabase, ['user-123', 'user-456'])
 */
export async function cleanupTestUsers(
  supabase: SupabaseClient,
  userIds?: string[]
) {
  if (userIds && userIds.length > 0) {
    const { error } = await supabase
      .from('users')
      .delete()
      .in('id', userIds)
    
    if (error) {
      console.error('Failed to cleanup test users:', error.message)
    }
  } else {
    // Delete all users (use with caution!)
    const { error } = await supabase
      .from('users')
      .delete()
      .neq('id', 'never-match') // Delete all
    
    if (error) {
      console.error('Failed to cleanup all test users:', error.message)
    }
  }
}

/**
 * Delete all test mess periods
 * 
 * @param supabase - Supabase client instance
 * @param userIds - Optional array of user IDs to delete mess periods for
 * 
 * @example
 * await cleanupTestMessPeriods(supabase)
 * 
 * @example
 * await cleanupTestMessPeriods(supabase, ['user-123'])
 */
export async function cleanupTestMessPeriods(
  supabase: SupabaseClient,
  userIds?: string[]
) {
  if (userIds && userIds.length > 0) {
    const { error } = await supabase
      .from('mess_periods')
      .delete()
      .in('user_id', userIds)
    
    if (error) {
      console.error('Failed to cleanup test mess periods:', error.message)
    }
  } else {
    const { error } = await supabase
      .from('mess_periods')
      .delete()
      .neq('id', 'never-match')
    
    if (error) {
      console.error('Failed to cleanup all test mess periods:', error.message)
    }
  }
}

/**
 * Delete all test daily logs
 * 
 * @param supabase - Supabase client instance
 * @param userIds - Optional array of user IDs to delete logs for
 * 
 * @example
 * await cleanupTestDailyLogs(supabase)
 * 
 * @example
 * await cleanupTestDailyLogs(supabase, ['user-123'])
 */
export async function cleanupTestDailyLogs(
  supabase: SupabaseClient,
  userIds?: string[]
) {
  if (userIds && userIds.length > 0) {
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .in('user_id', userIds)
    
    if (error) {
      console.error('Failed to cleanup test daily logs:', error.message)
    }
  } else {
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .neq('log_id', 'never-match')
    
    if (error) {
      console.error('Failed to cleanup all test daily logs:', error.message)
    }
  }
}

/**
 * Delete all test leave records
 * 
 * @param supabase - Supabase client instance
 * @param userIds - Optional array of user IDs to delete leaves for
 * 
 * @example
 * await cleanupTestLeaveRecords(supabase)
 * 
 * @example
 * await cleanupTestLeaveRecords(supabase, ['user-123'])
 */
export async function cleanupTestLeaveRecords(
  supabase: SupabaseClient,
  userIds?: string[]
) {
  if (userIds && userIds.length > 0) {
    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .in('user_id', userIds)
    
    if (error) {
      console.error('Failed to cleanup test leave records:', error.message)
    }
  } else {
    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .neq('id', 'never-match')
    
    if (error) {
      console.error('Failed to cleanup all test leave records:', error.message)
    }
  }
}

/**
 * Delete all test data (users, mess periods, logs, leaves)
 * 
 * @param supabase - Supabase client instance
 * @param userIds - Optional array of user IDs to delete data for
 * 
 * @example
 * await cleanupAllTestData(supabase)
 * 
 * @example
 * await cleanupAllTestData(supabase, ['user-123', 'user-456'])
 */
export async function cleanupAllTestData(
  supabase: SupabaseClient,
  userIds?: string[]
) {
  // Delete in order of dependencies (child tables first)
  await cleanupTestDailyLogs(supabase, userIds)
  await cleanupTestLeaveRecords(supabase, userIds)
  await cleanupTestMessPeriods(supabase, userIds)
  await cleanupTestUsers(supabase, userIds)
}

/**
 * Truncate all test tables (WARNING: Deletes ALL data)
 * 
 * @param supabase - Supabase client instance
 * 
 * @example
 * await truncateAllTestTables(supabase)
 */
export async function truncateAllTestTables(supabase: SupabaseClient) {
  console.warn('WARNING: Truncating all test tables!')
  
  // Truncate in order of dependencies
  await supabase.from('daily_logs').delete().neq('log_id', 'never-match')
  await supabase.from('leave_requests').delete().neq('id', 'never-match')
  await supabase.from('mess_periods').delete().neq('id', 'never-match')
  await supabase.from('users').delete().neq('id', 'never-match')
}

/**
 * Create a cleanup function for use in test lifecycle hooks
 * 
 * @param supabase - Supabase client instance
 * @param userIds - Array of user IDs to track for cleanup
 * @returns Cleanup function
 * 
 * @example
 * let cleanup: () => Promise<void>
 * 
 * beforeEach(() => {
 *   const userIds: string[] = []
 *   cleanup = createCleanupFunction(supabase, userIds)
 * })
 * 
 * afterEach(async () => {
 *   await cleanup()
 * })
 */
export function createCleanupFunction(
  supabase: SupabaseClient,
  userIds: string[]
): () => Promise<void> {
  return async () => {
    await cleanupAllTestData(supabase, userIds)
  }
}
