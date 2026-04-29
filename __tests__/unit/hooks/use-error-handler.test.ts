/**
 * Unit Tests for hooks/use-error-handler.ts
 * Covers both useErrorHandler and useAsyncOperation helper hooks.
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { useAsyncOperation, useErrorHandler } from '@/hooks/use-error-handler'

jest.mock('@/lib/error-handler', () => ({
  parseError: jest.fn(),
  logError: jest.fn(),
}))

import { parseError, logError } from '@/lib/error-handler'

describe('useErrorHandler (Risk R-06)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should set and parse errors correctly', () => {
    ;(parseError as jest.Mock).mockReturnValue({
      message: 'Friendly message',
      code: 'PARSED',
    })

    const { result } = renderHook(() => useErrorHandler('Profile'))

    act(() => {
      result.current.setError(new Error('Raw error'))
    })

    expect(parseError).toHaveBeenCalled()
    expect(result.current.error).toEqual({
      message: 'Friendly message',
      code: 'PARSED',
    })
  })

  it('should clear error state', () => {
    ;(parseError as jest.Mock).mockReturnValue({ message: 'Error one' })

    const { result } = renderHook(() => useErrorHandler('Profile'))

    act(() => {
      result.current.setError(new Error('Raw error'))
    })

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should log and set error using handleError with custom context', () => {
    ;(parseError as jest.Mock).mockReturnValue({ message: 'Parsed error' })

    const { result } = renderHook(() => useErrorHandler('Default Context'))

    act(() => {
      result.current.handleError(new Error('Boom'), 'Custom Context')
    })

    expect(logError).toHaveBeenCalledWith('Custom Context', expect.any(Error))
    expect(result.current.error).toEqual({ message: 'Parsed error' })
  })

  it('should keep latest error when multiple errors occur', () => {
    ;(parseError as jest.Mock)
      .mockReturnValueOnce({ message: 'First error' })
      .mockReturnValueOnce({ message: 'Second error' })

    const { result } = renderHook(() => useErrorHandler('Operation'))

    act(() => {
      result.current.setError(new Error('first'))
      result.current.setError(new Error('second'))
    })

    expect(result.current.error).toEqual({ message: 'Second error' })
  })
})

describe('useAsyncOperation (Risk R-03, R-07)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should execute operation successfully and expose success message', async () => {
    const onSuccess = jest.fn()

    const { result } = renderHook(() =>
      useAsyncOperation<string>('Verify Meal', {
        successMessage: 'Verification complete',
        onSuccess,
      })
    )

    let value: string | null = null

    await act(async () => {
      value = await result.current.execute(async () => 'ok')
    })

    expect(value).toBe('ok')
    expect(result.current.success).toBe('Verification complete')
    expect(result.current.error).toBeNull()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('should handle failed operation, parse error, and call onError', async () => {
    const parsed = { message: 'Permission denied', code: '42501' }
    const onError = jest.fn()
    ;(parseError as jest.Mock).mockReturnValue(parsed)

    const { result } = renderHook(() =>
      useAsyncOperation('Verify Meal', {
        onError,
      })
    )

    let value: unknown = 'init'

    await act(async () => {
      value = await result.current.execute(async () => {
        throw new Error('Forbidden')
      })
    })

    expect(value).toBeNull()
    expect(parseError).toHaveBeenCalled()
    expect(logError).toHaveBeenCalledWith('Verify Meal', expect.any(Error))
    expect(onError).toHaveBeenCalledWith(parsed)
    expect(result.current.error).toEqual(parsed)
    expect(result.current.success).toBeNull()
  })

  it('should set loading=true while operation is in flight', async () => {
    const { result } = renderHook(() => useAsyncOperation<number>('Load Data'))

    let resolveOperation!: (value: number) => void
    let runPromise!: Promise<number | null>

    act(() => {
      runPromise = result.current.execute(
        () =>
          new Promise<number>((resolve) => {
            resolveOperation = resolve
          })
      )
    })

    await waitFor(() => expect(result.current.loading).toBe(true))

    await act(async () => {
      resolveOperation(42)
      await runPromise
    })

    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('should clear success and error messages', async () => {
    ;(parseError as jest.Mock).mockReturnValue({ message: 'Some error' })

    const { result } = renderHook(() =>
      useAsyncOperation('Any operation', { successMessage: 'Done' })
    )

    await act(async () => {
      await result.current.execute(async () => 'ok')
    })

    expect(result.current.success).toBe('Done')

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.success).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
