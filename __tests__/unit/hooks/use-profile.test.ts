/**
 * Unit Tests for hooks/use-profile.ts
 * Covers profile fetching behavior and query lifecycle.
 */

import { renderHook, waitFor } from '@testing-library/react'
import { createQueryWrapper, createTestQueryClient } from '@/test-utils/query-wrapper'
import { queryKeys } from '@/lib/query-keys'
import { useProfile } from '@/hooks/use-profile'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/mess-period-utils', () => ({
  getUserMealPlan: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'
import { getUserMealPlan } from '@/lib/mess-period-utils'

describe('useProfile (Risk R-06)', () => {
  let mockGetUser: jest.Mock
  let mockSingle: jest.Mock
  let mockEq: jest.Mock
  let mockSelect: jest.Mock
  let mockFrom: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockGetUser = jest.fn()
    mockSingle = jest.fn()
    mockEq = jest.fn(() => ({ single: mockSingle }))
    mockSelect = jest.fn(() => ({ eq: mockEq }))
    mockFrom = jest.fn(() => ({ select: mockSelect }))

    ;(createClient as jest.Mock).mockReturnValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })

    ;(getUserMealPlan as jest.Mock).mockResolvedValue('DL')
  })

  it('should fetch profile data successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'student-1' } } })
    mockSingle.mockResolvedValue({
      data: { id: 'student-1', full_name: 'Student One' },
      error: null,
    })

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toMatchObject({
      id: 'student-1',
      full_name: 'Student One',
      meal_plan: 'DL',
    })
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(getUserMealPlan).toHaveBeenCalled()
  })

  it('should handle loading state while request is pending', () => {
    mockGetUser.mockReturnValue(new Promise(() => undefined))

    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    expect(result.current.isPending).toBe(true)
  })

  it('should handle error state when profile query fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'student-1' } } })
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch profile' },
    })

    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeTruthy()
  })

  it('should return null and skip table query when no auth user exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
    expect(getUserMealPlan).not.toHaveBeenCalled()
  })

  it('should refetch on cache invalidation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'student-1' } } })
    mockSingle.mockResolvedValue({
      data: { id: 'student-1', full_name: 'Student One' },
      error: null,
    })

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await queryClient.invalidateQueries({ queryKey: queryKeys.profile.all })

    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(2))
  })

  it('should cleanup safely on unmount', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'student-1' } } })
    mockSingle.mockResolvedValue({
      data: { id: 'student-1', full_name: 'Student One' },
      error: null,
    })

    const { unmount } = renderHook(() => useProfile(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await waitFor(() => expect(mockGetUser).toHaveBeenCalled())
    expect(() => unmount()).not.toThrow()
  })
})
