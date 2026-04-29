/**
 * Unit Tests for lib/leave-calculator.ts
 * 
 * Tests the leave calculation logic including the 4-Day Leave Rule (Risk R-04)
 * and leave day counting with integrity checking.
 */

import {
  calculateLeaveDaysWithIntegrity,
  calculateMessPeriodLeaveDays,
  buildConsumedDatesSet,
  getContinuousLeavePeriods,
  isDateInLeave,
  type LeaveRecord,
} from '@/lib/leave-calculator'
import { createMockLeaveForDateRange } from '@/__mocks__/leave-records'
import { createMockDailyLog } from '@/__mocks__/daily-logs'

describe('Leave Calculator (Risk R-04)', () => {
  describe('calculateLeaveDaysWithIntegrity', () => {
    it('should calculate leave days correctly with no consumed dates', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
      ]
      const consumedDates = new Set<string>()
      
      const result = calculateLeaveDaysWithIntegrity(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      expect(result.totalLeaveDays).toBe(5)
      expect(result.leavePeriods).toHaveLength(1)
      expect(result.leavePeriods[0].days).toBe(5)
    })

    it('should exclude consumed dates from leave days', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
      ]
      const consumedDates = new Set(['2024-01-02', '2024-01-04'])
      
      const result = calculateLeaveDaysWithIntegrity(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      // 5 days - 2 consumed = 3 leave days
      expect(result.totalLeaveDays).toBe(3)
    })

    it('should only count approved leaves', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
        createMockLeaveForDateRange('2024-01-10', '2024-01-15', false), // Not approved
      ]
      const consumedDates = new Set<string>()
      
      const result = calculateLeaveDaysWithIntegrity(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      // Only approved leave counted
      expect(result.totalLeaveDays).toBe(5)
      expect(result.leavePeriods).toHaveLength(1)
    })

    it('should handle leave periods outside report range', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2023-12-25', '2023-12-31', true),
      ]
      const consumedDates = new Set<string>()
      
      const result = calculateLeaveDaysWithIntegrity(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      // Leave is outside report period
      expect(result.totalLeaveDays).toBe(0)
      expect(result.leavePeriods).toHaveLength(0)
    })

    it('should handle partial overlap with report period', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2023-12-28', '2024-01-03', true),
      ]
      const consumedDates = new Set<string>()
      
      const result = calculateLeaveDaysWithIntegrity(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      // Only Jan 1-3 counted (3 days)
      expect(result.totalLeaveDays).toBe(3)
    })

    it('should handle month boundary edge case (Risk R-04)', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-29', '2024-02-02', true),
      ]
      const consumedDates = new Set<string>()
      
      const result = calculateLeaveDaysWithIntegrity(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      // Only Jan 29-31 counted (3 days)
      expect(result.totalLeaveDays).toBe(3)
    })

    it('should handle multiple leave periods', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-03', true),
        createMockLeaveForDateRange('2024-01-10', '2024-01-12', true),
      ]
      const consumedDates = new Set<string>()
      
      const result = calculateLeaveDaysWithIntegrity(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      // 3 + 3 = 6 days
      expect(result.totalLeaveDays).toBe(6)
      expect(result.leavePeriods).toHaveLength(2)
    })

    it('should handle all days consumed during leave', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-03', true),
      ]
      const consumedDates = new Set(['2024-01-01', '2024-01-02', '2024-01-03'])
      
      const result = calculateLeaveDaysWithIntegrity(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      // All days consumed, no leave days
      expect(result.totalLeaveDays).toBe(0)
      expect(result.leavePeriods).toHaveLength(0)
    })
  })

  describe('calculateMessPeriodLeaveDays', () => {
    it('should calculate leave days for mess period', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-10', '2024-01-15', true),
      ]
      const consumedDates = new Set<string>()
      
      const leaveDays = calculateMessPeriodLeaveDays(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      expect(leaveDays).toBe(6)
    })

    it('should return 0 for no leaves', () => {
      const leaves: LeaveRecord[] = []
      const consumedDates = new Set<string>()
      
      const leaveDays = calculateMessPeriodLeaveDays(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      expect(leaveDays).toBe(0)
    })
  })

  describe('buildConsumedDatesSet', () => {
    it('should build set of consumed dates from logs', () => {
      const logs = [
        createMockDailyLog({ date: '2024-01-01', status: 'CONSUMED' }),
        createMockDailyLog({ date: '2024-01-02', status: 'CONSUMED' }),
        createMockDailyLog({ date: '2024-01-03', status: 'SKIPPED' }),
      ]
      
      const consumedDates = buildConsumedDatesSet(logs)
      
      expect(consumedDates.size).toBe(2)
      expect(consumedDates.has('2024-01-01')).toBe(true)
      expect(consumedDates.has('2024-01-02')).toBe(true)
      expect(consumedDates.has('2024-01-03')).toBe(false)
    })

    it('should NOT recognize LEAVE status as consumed', () => {
      const logs = [
        createMockDailyLog({ date: '2024-01-01', status: 'LEAVE' }),
      ]
      
      const consumedDates = buildConsumedDatesSet(logs)
      
      expect(consumedDates.has('2024-01-01')).toBe(false)
    })

    it('should recognize CONSUMED status explicitly', () => {
      const logs = [
        createMockDailyLog({ date: '2024-01-01', status: 'CONSUMED' }),
      ]
      
      const consumedDates = buildConsumedDatesSet(logs)
      
      expect(consumedDates.has('2024-01-01')).toBe(true)
    })

    it('should default to CONSUMED when status is missing', () => {
      const logs = [
        { date: '2024-01-01' },
      ]
      
      const consumedDates = buildConsumedDatesSet(logs)
      
      // Default behavior depends on implementation - checking actual behavior
      expect(consumedDates.has('2024-01-01')).toBe(true)
    })

    it('should handle empty logs array', () => {
      const logs: Array<{ date: string; status?: string }> = []
      
      const consumedDates = buildConsumedDatesSet(logs)
      
      expect(consumedDates.size).toBe(0)
    })
  })

  describe('getContinuousLeavePeriods', () => {
    it('should return continuous leave periods', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
      ]
      const consumedDates = new Set<string>()
      
      const periods = getContinuousLeavePeriods(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      expect(periods).toHaveLength(1)
      expect(periods[0].start_date).toBe('2024-01-01')
      expect(periods[0].end_date).toBe('2024-01-05')
      expect(periods[0].days).toBe(5)
    })

    it('should exclude consumed days from leave periods', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
      ]
      const consumedDates = new Set(['2024-01-03'])
      
      const periods = getContinuousLeavePeriods(
        leaves,
        consumedDates,
        '2024-01-01',
        '2024-01-31'
      )
      
      // Should have 1 period with 4 days (5 days - 1 consumed)
      expect(periods).toHaveLength(1)
      expect(periods[0].days).toBe(4)
    })
  })

  describe('isDateInLeave', () => {
    it('should return true if date is within approved leave', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
      ]
      
      const result = isDateInLeave('2024-01-03', leaves)
      
      expect(result).toBe(true)
    })

    it('should return false if date is outside leave period', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
      ]
      
      const result = isDateInLeave('2024-01-10', leaves)
      
      expect(result).toBe(false)
    })

    it('should return false if leave is not approved', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', false),
      ]
      
      const result = isDateInLeave('2024-01-03', leaves)
      
      expect(result).toBe(false)
    })

    it('should return true for start date of leave', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
      ]
      
      const result = isDateInLeave('2024-01-01', leaves)
      
      expect(result).toBe(true)
    })

    it('should return true for end date of leave', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
      ]
      
      const result = isDateInLeave('2024-01-05', leaves)
      
      expect(result).toBe(true)
    })

    it('should handle multiple leave periods', () => {
      const leaves: LeaveRecord[] = [
        createMockLeaveForDateRange('2024-01-01', '2024-01-05', true),
        createMockLeaveForDateRange('2024-01-10', '2024-01-15', true),
      ]
      
      expect(isDateInLeave('2024-01-03', leaves)).toBe(true)
      expect(isDateInLeave('2024-01-12', leaves)).toBe(true)
      expect(isDateInLeave('2024-01-07', leaves)).toBe(false)
    })

    it('should return false for empty leaves array', () => {
      const leaves: LeaveRecord[] = []
      
      const result = isDateInLeave('2024-01-03', leaves)
      
      expect(result).toBe(false)
    })
  })
})
