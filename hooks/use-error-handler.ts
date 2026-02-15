import { useState, useCallback } from 'react'
import { parseError, logError, ErrorResult } from '@/lib/error-handler'

interface UseErrorHandlerReturn {
  error: ErrorResult | null
  setError: (error: any) => void
  clearError: () => void
  handleError: (error: any, context?: string) => void
}

export function useErrorHandler(context: string = 'Operation'): UseErrorHandlerReturn {
  const [error, setErrorState] = useState<ErrorResult | null>(null)

  const setError = useCallback((err: any) => {
    const parsedError = parseError(err)
    setErrorState(parsedError)
  }, [])

  const clearError = useCallback(() => {
    setErrorState(null)
  }, [])

  const handleError = useCallback((err: any, customContext?: string) => {
    const ctx = customContext || context
    logError(ctx, err)
    setError(err)
  }, [context, setError])

  return {
    error,
    setError,
    clearError,
    handleError
  }
}

interface UseAsyncOperationOptions {
  onSuccess?: () => void
  onError?: (error: ErrorResult) => void
  successMessage?: string
}

interface UseAsyncOperationReturn<T> {
  loading: boolean
  error: ErrorResult | null
  success: string | null
  execute: (operation: () => Promise<T>) => Promise<T | null>
  clearMessages: () => void
}

export function useAsyncOperation<T = any>(
  context: string = 'Operation',
  options: UseAsyncOperationOptions = {}
): UseAsyncOperationReturn<T> {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ErrorResult | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const execute = useCallback(async (operation: () => Promise<T>): Promise<T | null> => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await operation()
      
      if (options.successMessage) {
        setSuccess(options.successMessage)
      }
      
      if (options.onSuccess) {
        options.onSuccess()
      }
      
      return result
    } catch (err) {
      const parsedError = parseError(err)
      logError(context, err)
      setError(parsedError)
      
      if (options.onError) {
        options.onError(parsedError)
      }
      
      return null
    } finally {
      setLoading(false)
    }
  }, [context, options])

  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  return {
    loading,
    error,
    success,
    execute,
    clearMessages
  }
}
