/**
 * Unit Tests for lib/balanceService.ts
 * 
 * Tests the balance days data fetching service.
 * 
 * Risk Coverage:
 * - Risk R-05: Balance Calculation Errors
 */

import { fetchBalanceDaysData } from '@/lib/balanceService'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const { createClient } = require('@/lib/supabase/client')

describe('balanceService (Risk R-05)', () => {
  const createMockSupabase = (
    messPeriodData: any,
    messPeriodError: any,
    logsCount: number | null,
    logsError: any,
    leavesData: any[] | null,
    leavesError: any
  ) => {
    return {
      from: jest.fn((table: string) => {
        if (table === 'mess_periods') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: messPeriodData, error: messPeriodError }),
          }
        } else if (table === 'daily_logs') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({ count: logsCount, error: logsError }),
          }
        } else if (table === 'leaves') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            gte: jest.fn().mockResolvedValue({ data: leavesData, error: leavesError }),
          }
        }
        return {}
      }),
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchBalanceDaysData', () => {
    it('should return null totalDays when no active mess period exists', async () => {
      const mockSupabase = createMockSupabase(null, null, 0, null, [], null)
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: null,
        consumedDays: 0,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should return null totalDays when mess period has no start_date', async () => {
      const mockSupabase = createMockSupabase(
        { start_date: null, end_date: '2026-02-28', original_end_date: '2026-02-28' },
        null,
        0,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: null,
        consumedDays: 0,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should return null totalDays when mess period has no end dates', async () => {
      const mockSupabase = createMockSupabase(
        { start_date: '2026-02-01', end_date: null, original_end_date: null },
        null,
        0,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: null,
        consumedDays: 0,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should calculate balance data correctly for active period with no consumption', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        0,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 0,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should calculate balance data with consumed meals', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        15,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 15,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should calculate leave days within the base period', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-07',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        10,
        null,
        [{ start_date: '2026-02-10', end_date: '2026-02-14' }],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 10,
        leaveDays: 5,
        extraMeals: 0,
      })
    })

    it('should calculate leave days that partially overlap the base period (start before)', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        20,
        null,
        [{ start_date: '2026-01-28', end_date: '2026-02-05' }],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 20,
        leaveDays: 5,
        extraMeals: 0,
      })
    })

    it('should calculate leave days that start within period and end after', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        18,
        null,
        [{ start_date: '2026-02-25', end_date: '2026-03-10' }],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 18,
        leaveDays: 6,
        extraMeals: 0,
      })
    })

    it('should handle multiple approved leaves', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        15,
        null,
        [
          { start_date: '2026-02-05', end_date: '2026-02-07' },
          { start_date: '2026-02-15', end_date: '2026-02-19' },
          { start_date: '2026-02-25', end_date: '2026-02-27' },
        ],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 15,
        leaveDays: 11,
        extraMeals: 0,
      })
    })

    it('should include extra meals count from mess period', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 3,
        },
        null,
        25,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 25,
        leaveDays: 0,
        extraMeals: 3,
      })
    })

    it('should handle null extra_meals_count as 0', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: null,
        },
        null,
        20,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 20,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should use original_end_date for base period calculation', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-10',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        28,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 28,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should fall back to end_date if original_end_date is missing', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: null,
          extra_meals_count: 0,
        },
        null,
        25,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 25,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should ignore leaves that do not overlap the base period', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        20,
        null,
        [{ start_date: '2026-03-10', end_date: '2026-03-15' }],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 20,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should handle null count from daily logs query', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        null,
        null,
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 0,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should handle null data from leaves query', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        15,
        null,
        null,
        null
      )
      createClient.mockReturnValue(mockSupabase)

      const result = await fetchBalanceDaysData('user-123')

      expect(result).toEqual({
        totalDays: 30,
        consumedDays: 15,
        leaveDays: 0,
        extraMeals: 0,
      })
    })

    it('should throw error if mess period query fails', async () => {
      const mockSupabase = createMockSupabase(null, new Error('Database connection failed'), 0, null, [], null)
      createClient.mockReturnValue(mockSupabase)

      await expect(fetchBalanceDaysData('user-123')).rejects.toThrow('Database connection failed')
    })

    it('should throw error if daily logs query fails', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        null,
        new Error('Failed to fetch logs'),
        [],
        null
      )
      createClient.mockReturnValue(mockSupabase)

      await expect(fetchBalanceDaysData('user-123')).rejects.toThrow('Failed to fetch logs')
    })

    it('should throw error if leaves query fails', async () => {
      const mockSupabase = createMockSupabase(
        {
          start_date: '2026-02-01',
          end_date: '2026-03-02',
          original_end_date: '2026-03-02',
          extra_meals_count: 0,
        },
        null,
        20,
        null,
        null,
        new Error('Failed to fetch leaves')
      )
      createClient.mockReturnValue(mockSupabase)

      await expect(fetchBalanceDaysData('user-123')).rejects.toThrow('Failed to fetch leaves')
    })
  })
})
