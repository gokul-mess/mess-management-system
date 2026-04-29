/**
 * Mock Leave Record Factory
 * 
 * Creates realistic test data for leave requests with sensible defaults
 * and support for partial overrides.
 */

import type { LeaveRecord } from '@/lib/leave-calculator'

/**
 * Create a mock leave record with optional overrides
 * 
 * @param overrides - Partial leave record to override defaults
 * @returns Complete LeaveRecord object
 * 
 * @example
 * // Create an approved leave for today
 * const leave = createMockLeaveRecord()
 * 
 * @example
 * // Create a pending leave for specific dates
 * const leave = createMockLeaveRecord({
 *   start_date: '2024-01-15',
 *   end_date: '2024-01-20',
 *   is_approved: false
 * })
 */
export function createMockLeaveRecord(overrides?: Partial<LeaveRecord>): LeaveRecord {
  const today = new Date()
  const startDate = new Date(today)
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 3) // Default 3-day leave
  
  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    is_approved: true,
    ...overrides,
  }
}

/**
 * Create multiple mock leave records
 * 
 * @param count - Number of leave records to create
 * @param overrides - Partial leave record to apply to all records
 * @returns Array of LeaveRecord objects
 * 
 * @example
 * // Create 5 approved leaves
 * const leaves = createMockLeaveRecords(5)
 * 
 * @example
 * // Create 3 pending leaves
 * const leaves = createMockLeaveRecords(3, { is_approved: false })
 */
export function createMockLeaveRecords(
  count: number,
  overrides?: Partial<LeaveRecord>
): LeaveRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + (index * 7)) // Space out by weeks
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 3)
    
    return createMockLeaveRecord({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      ...overrides,
    })
  })
}

/**
 * Create a mock leave record for a specific date range
 * 
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param isApproved - Whether the leave is approved
 * @returns LeaveRecord object
 * 
 * @example
 * // Create an approved leave for a week
 * const leave = createMockLeaveForDateRange('2024-01-01', '2024-01-07', true)
 */
export function createMockLeaveForDateRange(
  startDate: string,
  endDate: string,
  isApproved: boolean = true
): LeaveRecord {
  return createMockLeaveRecord({
    start_date: startDate,
    end_date: endDate,
    is_approved: isApproved,
  })
}

/**
 * Create mock overlapping leave records (for testing validation)
 * 
 * @param baseStartDate - Base start date (YYYY-MM-DD)
 * @param count - Number of overlapping leaves to create
 * @returns Array of overlapping LeaveRecord objects
 * 
 * @example
 * // Create 3 overlapping leaves
 * const leaves = createMockOverlappingLeaves('2024-01-01', 3)
 */
export function createMockOverlappingLeaves(
  baseStartDate: string,
  count: number
): LeaveRecord[] {
  const leaves: LeaveRecord[] = []
  const baseStart = new Date(baseStartDate)
  
  for (let i = 0; i < count; i++) {
    const startDate = new Date(baseStart)
    startDate.setDate(startDate.getDate() + i) // Offset by 1 day each
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 5) // 5-day leave
    
    leaves.push(createMockLeaveRecord({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      is_approved: true,
    }))
  }
  
  return leaves
}

/**
 * Create mock leave records spanning month boundaries
 * 
 * @param year - Year
 * @param month - Month (1-12)
 * @returns LeaveRecord object spanning month boundary
 * 
 * @example
 * // Create a leave spanning January-February boundary
 * const leave = createMockLeaveSpanningMonths(2024, 1)
 */
export function createMockLeaveSpanningMonths(
  year: number,
  month: number
): LeaveRecord {
  const startDate = new Date(year, month - 1, 28) // 28th of the month
  const endDate = new Date(year, month, 3) // 3rd of next month
  
  return createMockLeaveRecord({
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    is_approved: true,
  })
}
