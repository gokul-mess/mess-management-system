/**
 * Mock Mess Period Factory
 * 
 * Creates realistic test data for mess periods with sensible defaults
 * and support for partial overrides.
 */

import type { MessPeriod } from '@/lib/mess-period-utils'

/**
 * Create a mock mess period with optional overrides
 * 
 * @param overrides - Partial mess period to override defaults
 * @returns Complete MessPeriod object
 * 
 * @example
 * // Create an active mess period for current month
 * const period = createMockMessPeriod()
 * 
 * @example
 * // Create an inactive mess period for specific dates
 * const period = createMockMessPeriod({
 *   start_date: '2024-01-01',
 *   end_date: '2024-01-31',
 *   is_active: false
 * })
 */
export function createMockMessPeriod(overrides?: Partial<MessPeriod>): MessPeriod {
  const id = overrides?.id || `period-${Math.random().toString(36).substring(7)}`
  const userId = overrides?.user_id || `user-${Math.random().toString(36).substring(7)}`
  
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  return {
    id,
    user_id: userId,
    start_date: startOfMonth.toISOString().split('T')[0],
    end_date: endOfMonth.toISOString().split('T')[0],
    original_end_date: null,
    meal_plan: 'DL',
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create multiple mock mess periods
 * 
 * @param count - Number of mess periods to create
 * @param overrides - Partial mess period to apply to all periods
 * @returns Array of MessPeriod objects
 * 
 * @example
 * // Create 3 active mess periods
 * const periods = createMockMessPeriods(3)
 * 
 * @example
 * // Create 5 inactive mess periods for a specific user
 * const periods = createMockMessPeriods(5, { 
 *   user_id: 'user-123', 
 *   is_active: false 
 * })
 */
export function createMockMessPeriods(
  count: number,
  overrides?: Partial<MessPeriod>
): MessPeriod[] {
  return Array.from({ length: count }, (_, index) => {
    const today = new Date()
    const monthOffset = index
    const startDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
    const endDate = new Date(today.getFullYear(), today.getMonth() - monthOffset + 1, 0)
    
    return createMockMessPeriod({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      is_active: index === 0, // Only first period is active
      ...overrides,
    })
  })
}

/**
 * Create a mock mess period for a specific month
 * 
 * @param year - Year
 * @param month - Month (1-12)
 * @param userId - User ID
 * @param isActive - Whether the period is active
 * @returns MessPeriod object
 * 
 * @example
 * // Create an active mess period for January 2024
 * const period = createMockMessPeriodForMonth(2024, 1, 'user-123', true)
 */
export function createMockMessPeriodForMonth(
  year: number,
  month: number,
  userId: string,
  isActive: boolean = false
): MessPeriod {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)
  
  return createMockMessPeriod({
    user_id: userId,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    is_active: isActive,
  })
}

/**
 * Create mock mess periods for a date range
 * 
 * @param userId - User ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param mealPlan - Meal plan (DL, L, or D)
 * @returns MessPeriod object
 * 
 * @example
 * // Create a mess period for a custom date range
 * const period = createMockMessPeriodForDateRange(
 *   'user-123',
 *   '2024-01-15',
 *   '2024-02-14',
 *   'DL'
 * )
 */
export function createMockMessPeriodForDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  mealPlan: string = 'DL'
): MessPeriod {
  return createMockMessPeriod({
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
    meal_plan: mealPlan,
    is_active: true,
  })
}

/**
 * Create mock overlapping mess periods (for testing validation)
 * 
 * @param userId - User ID
 * @param baseStartDate - Base start date (YYYY-MM-DD)
 * @param count - Number of overlapping periods to create
 * @returns Array of overlapping MessPeriod objects
 * 
 * @example
 * // Create 3 overlapping mess periods
 * const periods = createMockOverlappingMessPeriods('user-123', '2024-01-01', 3)
 */
export function createMockOverlappingMessPeriods(
  userId: string,
  baseStartDate: string,
  count: number
): MessPeriod[] {
  const periods: MessPeriod[] = []
  const baseStart = new Date(baseStartDate)
  
  for (let i = 0; i < count; i++) {
    const startDate = new Date(baseStart)
    startDate.setDate(startDate.getDate() + (i * 15)) // Offset by 15 days each
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 30) // 30-day period
    
    periods.push(createMockMessPeriod({
      user_id: userId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      is_active: i === 0, // Only first period is active
    }))
  }
  
  return periods
}

/**
 * Create a mock extended mess period (with original_end_date)
 * 
 * @param userId - User ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param originalEndDate - Original end date (YYYY-MM-DD)
 * @param extendedEndDate - Extended end date (YYYY-MM-DD)
 * @returns MessPeriod object with extension
 * 
 * @example
 * // Create an extended mess period
 * const period = createMockExtendedMessPeriod(
 *   'user-123',
 *   '2024-01-01',
 *   '2024-01-31',
 *   '2024-02-15'
 * )
 */
export function createMockExtendedMessPeriod(
  userId: string,
  startDate: string,
  originalEndDate: string,
  extendedEndDate: string
): MessPeriod {
  return createMockMessPeriod({
    user_id: userId,
    start_date: startDate,
    end_date: extendedEndDate,
    original_end_date: originalEndDate,
    is_active: true,
  })
}

/**
 * Create mock consecutive mess periods (for testing historical data)
 * 
 * @param userId - User ID
 * @param count - Number of consecutive periods to create
 * @param startYear - Starting year
 * @param startMonth - Starting month (1-12)
 * @returns Array of consecutive MessPeriod objects
 * 
 * @example
 * // Create 6 consecutive monthly mess periods starting from January 2024
 * const periods = createMockConsecutiveMessPeriods('user-123', 6, 2024, 1)
 */
export function createMockConsecutiveMessPeriods(
  userId: string,
  count: number,
  startYear: number,
  startMonth: number
): MessPeriod[] {
  const periods: MessPeriod[] = []
  
  for (let i = 0; i < count; i++) {
    const monthIndex = (startMonth - 1 + i) % 12
    const yearOffset = Math.floor((startMonth - 1 + i) / 12)
    const year = startYear + yearOffset
    
    const startDate = new Date(year, monthIndex, 1)
    const endDate = new Date(year, monthIndex + 1, 0)
    
    periods.push(createMockMessPeriod({
      user_id: userId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      is_active: i === count - 1, // Only last period is active
    }))
  }
  
  return periods
}
