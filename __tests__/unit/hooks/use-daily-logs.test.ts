/**
 * Unit Tests for hooks/use-daily-logs.ts
 * Covers date-bound query behavior and error handling.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper, createTestQueryClient } from '@/test-utils/query-wrapper'
import { dailyLogsQueryOptions, useDailyLogs } from '@/hooks/use-daily-logs'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('useDailyLogs (Risk R-01, R-07)', () => {
  let mockOrder: jest.Mock
  let mockEq: jest.Mock
  let mockSelect: jest.Mock
  let mockFrom: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-04-25T09:00:00.000Z'))

    mockOrder = jest.fn()
    mockEq = jest.fn(() => ({ order: mockOrder }))
    mockSelect = jest.fn(() => ({ eq: mockEq }))
    mockFrom = jest.fn(() => ({ select: mockSelect }))

    ;(createClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should fetch daily logs successfully for current date', async () => {
    const logs = [
      {
        log_id: 'log-1',
        user_id: 'student-1',
        date: '2026-04-25',
        meal_type: 'LUNCH',
        status: 'CONSUMED',
        access_method: 'SELF_ID',
        created_at: '2026-04-25T06:30:00.000Z',
        users: { full_name: 'Student One', unique_short_id: 101, photo_path: null },
      },
    ]

    mockOrder.mockResolvedValue({ data: logs, error: null })

    const { result } = renderHook(() => useDailyLogs(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => expect(result.current.logs).toEqual(logs))

    expect(mockFrom).toHaveBeenCalledWith('daily_logs')
    expect(mockEq).toHaveBeenCalledWith('date', '2026-04-25')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('should handle empty results', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useDailyLogs(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => expect(result.current.logs).toEqual([]))
  })

  it('should handle error state when query fails', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch daily logs' },
    })

    const { result } = renderHook(() => useDailyLogs(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => expect(result.current.error).toBeTruthy())
  })

  it('should build query options with the provided date key and filter', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    const queryClient = createTestQueryClient()
    const options = dailyLogsQueryOptions('2026-01-01')
    
    if (options.queryFn) {
      await options.queryFn({ 
        queryKey: options.queryKey, 
        meta: undefined, 
        signal: new AbortController().signal,
        client: queryClient
      })
    }

    expect(options.queryKey).toEqual(['daily_logs', '2026-01-01'])
    expect(mockEq).toHaveBeenCalledWith('date', '2026-01-01')
  })
})
