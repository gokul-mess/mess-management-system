/**
 * Unit Tests for hooks/use-balance-days.ts
 * Covers query lifecycle and transformed balance outputs.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper, createTestQueryClient } from '@/test-utils/query-wrapper'
import { queryKeys } from '@/lib/query-keys'
import { useBalanceDays } from '@/hooks/use-balance-days'

jest.mock('@/lib/balanceService', () => ({
  fetchBalanceDaysData: jest.fn(),
}))

jest.mock('@/lib/balance', () => ({
  calculateBalanceDays: jest.fn(),
}))

import { fetchBalanceDaysData } from '@/lib/balanceService'
import { calculateBalanceDays } from '@/lib/balance'

describe('useBalanceDays (Risk R-07)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should calculate balance days correctly from fetched data', async () => {
    const raw = { totalDays: 30, consumedDays: 10, leaveDays: 2 }
    const transformed = {
      totalDays: 30,
      consumedDays: 10,
      leaveDays: 2,
      balanceDays: 18,
      isExpired: false,
    }

    ;(fetchBalanceDaysData as jest.Mock).mockResolvedValue(raw)
    ;(calculateBalanceDays as jest.Mock).mockReturnValue(transformed)

    const { result } = renderHook(() => useBalanceDays('student-1'), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => expect(result.current.data).toEqual(transformed))

    expect(fetchBalanceDaysData).toHaveBeenCalledWith('student-1')
    expect(calculateBalanceDays).toHaveBeenCalledWith(raw)
  })

  it('should not fetch when userId is missing', async () => {
    renderHook(() => useBalanceDays(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => {
      expect(fetchBalanceDaysData).not.toHaveBeenCalled()
      expect(calculateBalanceDays).not.toHaveBeenCalled()
    })
  })

  it('should surface error state when fetch fails', async () => {
    ;(fetchBalanceDaysData as jest.Mock).mockRejectedValue(new Error('Balance fetch failed'))

    const { result } = renderHook(() => useBalanceDays('student-1'), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => expect(result.current.error).toBeTruthy())
  })

  it('should update data after query invalidation', async () => {
    const raw1 = { totalDays: 30, consumedDays: 12, leaveDays: 1 }
    const raw2 = { totalDays: 30, consumedDays: 13, leaveDays: 1 }

    const transformed1 = {
      totalDays: 30,
      consumedDays: 12,
      leaveDays: 1,
      balanceDays: 17,
      isExpired: false,
    }
    const transformed2 = {
      totalDays: 30,
      consumedDays: 13,
      leaveDays: 1,
      balanceDays: 16,
      isExpired: false,
    }

    ;(fetchBalanceDaysData as jest.Mock)
      .mockResolvedValueOnce(raw1)
      .mockResolvedValueOnce(raw2)

    ;(calculateBalanceDays as jest.Mock)
      .mockReturnValueOnce(transformed1)
      .mockReturnValueOnce(transformed2)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useBalanceDays('student-1'), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.data).toEqual(transformed1))

    await queryClient.invalidateQueries({
      queryKey: queryKeys.balanceDays.byUser('student-1'),
    })

    await waitFor(() => expect(result.current.data).toEqual(transformed2))
  })
})
