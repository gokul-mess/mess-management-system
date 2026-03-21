/**
 * Centralized leave calculation logic with integrity checking
 * Ensures consistent leave day counting across all reports
 */

import { getDateRange } from './date-utils'

export interface LeaveRecord {
  start_date: string
  end_date: string
  is_approved: boolean
}

export interface LeaveCalculationResult {
  totalLeaveDays: number
  leavePeriods: Array<{
    start_date: string
    end_date: string
    days: number
  }>
}

/**
 * Calculate leave days with integrity checking
 * Excludes days when student consumed meals during approved leave
 * 
 * @param leaves - Array of leave records
 * @param consumedDates - Set of dates when meals were consumed
 * @param reportStartDate - Start date of report period
 * @param reportEndDate - End date of report period
 * @returns Calculation result with total days and periods
 */
export function calculateLeaveDaysWithIntegrity(
  leaves: LeaveRecord[],
  consumedDates: Set<string>,
  reportStartDate: string,
  reportEndDate: string
): LeaveCalculationResult {
  let totalLeaveDays = 0
  const leavePeriods: Array<{ start_date: string; end_date: string; days: number }> = []

  // Filter to only approved leaves
  const approvedLeaves = leaves.filter(leave => leave.is_approved)

  for (const leave of approvedLeaves) {
    const leaveStart = new Date(leave.start_date)
    const leaveEnd = new Date(leave.end_date)
    const reportStart = new Date(reportStartDate)
    const reportEnd = new Date(reportEndDate)

    // Check if leave overlaps with report period
    if (leaveEnd < reportStart || leaveStart > reportEnd) {
      continue // No overlap
    }

    // Calculate overlap period
    const overlapStart = leaveStart > reportStart ? leaveStart : reportStart
    const overlapEnd = leaveEnd < reportEnd ? leaveEnd : reportEnd

    // Get all dates in the overlap period
    const overlapStartStr = overlapStart.toISOString().split('T')[0]
    const overlapEndStr = overlapEnd.toISOString().split('T')[0]
    const datesInPeriod = getDateRange(overlapStartStr, overlapEndStr)

    // Count days excluding consumed dates
    let periodLeaveDays = 0
    let periodStart: string | null = null
    let periodEnd: string | null = null

    for (const date of datesInPeriod) {
      if (!consumedDates.has(date)) {
        periodLeaveDays++
        if (!periodStart) periodStart = date
        periodEnd = date
      }
    }

    if (periodLeaveDays > 0 && periodStart && periodEnd) {
      totalLeaveDays += periodLeaveDays
      leavePeriods.push({
        start_date: periodStart,
        end_date: periodEnd,
        days: periodLeaveDays
      })
    }
  }

  return {
    totalLeaveDays,
    leavePeriods
  }
}

/**
 * Calculate leave days for a specific mess period
 * 
 * @param leaves - Array of leave records
 * @param consumedDates - Set of dates when meals were consumed
 * @param messPeriodStart - Mess period start date
 * @param messPeriodEnd - Mess period end date
 * @returns Total leave days in the mess period
 */
export function calculateMessPeriodLeaveDays(
  leaves: LeaveRecord[],
  consumedDates: Set<string>,
  messPeriodStart: string,
  messPeriodEnd: string
): number {
  const result = calculateLeaveDaysWithIntegrity(
    leaves,
    consumedDates,
    messPeriodStart,
    messPeriodEnd
  )
  return result.totalLeaveDays
}

/**
 * Build a set of dates when meals were consumed
 * 
 * @param logs - Array of meal logs
 * @returns Set of date strings when meals were consumed
 */
export function buildConsumedDatesSet(
  logs: Array<{ date: string; status?: string }>
): Set<string> {
  const consumedDates = new Set<string>()
  
  for (const log of logs) {
    const status = (log.status || 'VERIFIED').toUpperCase()
    // Consider as consumed if status indicates meal was taken
    if (
      status === 'VERIFIED' ||
      status === 'TAKEN' ||
      status === 'PRESENT' ||
      status === 'CONSUMED'
    ) {
      consumedDates.add(log.date)
    }
  }
  
  return consumedDates
}

/**
 * Get continuous leave periods (breaks when meal is consumed)
 * 
 * @param leaves - Array of leave records
 * @param consumedDates - Set of dates when meals were consumed
 * @param reportStartDate - Start date of report period
 * @param reportEndDate - End date of report period
 * @returns Array of continuous leave periods
 */
export function getContinuousLeavePeriods(
  leaves: LeaveRecord[],
  consumedDates: Set<string>,
  reportStartDate: string,
  reportEndDate: string
): Array<{ start_date: string; end_date: string; days: number }> {
  const result = calculateLeaveDaysWithIntegrity(
    leaves,
    consumedDates,
    reportStartDate,
    reportEndDate
  )
  return result.leavePeriods
}

/**
 * Check if a date is within any approved leave period
 * 
 * @param date - Date string to check
 * @param leaves - Array of leave records
 * @returns True if date is within an approved leave period
 */
export function isDateInLeave(date: string, leaves: LeaveRecord[]): boolean {
  const approvedLeaves = leaves.filter(leave => leave.is_approved)
  
  for (const leave of approvedLeaves) {
    if (date >= leave.start_date && date <= leave.end_date) {
      return true
    }
  }
  
  return false
}
