/**
 * Mock Daily Log Factory
 * 
 * Creates realistic test data for daily meal logs with sensible defaults
 * and support for partial overrides.
 */

import type { DailyLog } from '@/types'

/**
 * Create a mock daily log with optional overrides
 * 
 * @param overrides - Partial daily log to override defaults
 * @returns Complete DailyLog object
 * 
 * @example
 * // Create a lunch log for today
 * const log = createMockDailyLog()
 * 
 * @example
 * // Create a dinner log with specific date
 * const log = createMockDailyLog({ 
 *   date: '2024-01-15', 
 *   meal_type: 'DINNER',
 *   status: 'CONSUMED'
 * })
 * 
 * @example
 * // Create a skipped meal log
 * const log = createMockDailyLog({ status: 'SKIPPED' })
 */
export function createMockDailyLog(overrides?: Partial<DailyLog>): DailyLog {
  const logId = overrides?.log_id || `log-${Math.random().toString(36).substring(7)}`
  const userId = overrides?.user_id || `user-${Math.random().toString(36).substring(7)}`
  const today = new Date().toISOString().split('T')[0]
  
  return {
    log_id: logId,
    user_id: userId,
    date: today,
    meal_type: 'LUNCH',
    status: 'CONSUMED',
    access_method: 'SELF_ID',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create multiple mock daily logs
 * 
 * @param count - Number of logs to create
 * @param overrides - Partial daily log to apply to all logs
 * @returns Array of DailyLog objects
 * 
 * @example
 * // Create 10 lunch logs
 * const logs = createMockDailyLogs(10)
 * 
 * @example
 * // Create 5 dinner logs for a specific user
 * const logs = createMockDailyLogs(5, { 
 *   user_id: 'user-123', 
 *   meal_type: 'DINNER' 
 * })
 */
export function createMockDailyLogs(
  count: number,
  overrides?: Partial<DailyLog>
): DailyLog[] {
  return Array.from({ length: count }, () => createMockDailyLog(overrides))
}

/**
 * Create mock daily logs for a date range
 * 
 * @param userId - User ID for the logs
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param mealType - Meal type (LUNCH or DINNER)
 * @param status - Status of the logs
 * @returns Array of DailyLog objects
 * 
 * @example
 * // Create lunch logs for a week
 * const logs = createMockDailyLogsForDateRange(
 *   'user-123',
 *   '2024-01-01',
 *   '2024-01-07',
 *   'LUNCH',
 *   'CONSUMED'
 * )
 */
export function createMockDailyLogsForDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  mealType: 'LUNCH' | 'DINNER' = 'LUNCH',
  status: 'CONSUMED' | 'SKIPPED' | 'LEAVE' = 'CONSUMED'
): DailyLog[] {
  const logs: DailyLog[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0]
    logs.push(createMockDailyLog({
      user_id: userId,
      date: dateStr,
      meal_type: mealType,
      status,
    }))
  }
  
  return logs
}

/**
 * Create mock daily logs with consecutive skips (for testing 4-Day Leave Rule)
 * 
 * @param userId - User ID for the logs
 * @param startDate - Start date (YYYY-MM-DD)
 * @param consecutiveSkips - Number of consecutive days to skip
 * @returns Array of DailyLog objects
 * 
 * @example
 * // Create 4 consecutive skipped lunch logs (triggers leave)
 * const logs = createMockConsecutiveSkips('user-123', '2024-01-01', 4)
 */
export function createMockConsecutiveSkips(
  userId: string,
  startDate: string,
  consecutiveSkips: number
): DailyLog[] {
  const logs: DailyLog[] = []
  const start = new Date(startDate)
  
  for (let i = 0; i < consecutiveSkips; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    // Create both lunch and dinner as skipped
    logs.push(
      createMockDailyLog({
        user_id: userId,
        date: dateStr,
        meal_type: 'LUNCH',
        status: 'SKIPPED',
      }),
      createMockDailyLog({
        user_id: userId,
        date: dateStr,
        meal_type: 'DINNER',
        status: 'SKIPPED',
      })
    )
  }
  
  return logs
}

/**
 * Create mock daily logs with mixed consumption pattern
 * 
 * @param userId - User ID for the logs
 * @param startDate - Start date (YYYY-MM-DD)
 * @param days - Number of days
 * @param pattern - Pattern of consumption (e.g., [true, false, true] = consumed, skipped, consumed)
 * @returns Array of DailyLog objects
 * 
 * @example
 * // Create logs with alternating consumption pattern
 * const logs = createMockMixedConsumptionLogs(
 *   'user-123',
 *   '2024-01-01',
 *   5,
 *   [true, false, true, false, true]
 * )
 */
export function createMockMixedConsumptionLogs(
  userId: string,
  startDate: string,
  days: number,
  pattern: boolean[]
): DailyLog[] {
  const logs: DailyLog[] = []
  const start = new Date(startDate)
  
  for (let i = 0; i < days; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const consumed = pattern[i % pattern.length]
    
    logs.push(
      createMockDailyLog({
        user_id: userId,
        date: dateStr,
        meal_type: 'LUNCH',
        status: consumed ? 'CONSUMED' : 'SKIPPED',
      }),
      createMockDailyLog({
        user_id: userId,
        date: dateStr,
        meal_type: 'DINNER',
        status: consumed ? 'CONSUMED' : 'SKIPPED',
      })
    )
  }
  
  return logs
}
