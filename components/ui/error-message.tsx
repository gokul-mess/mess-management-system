import { AlertCircle, XCircle, WifiOff, ShieldAlert } from 'lucide-react'
import { ErrorResult, isNetworkError, isPermissionError } from '@/lib/error-handler'

// Re-export split modules for backward compatibility
export { EnhancedAlert, Toast, ErrorBoundaryFallback } from './enhanced-alert'

interface ErrorMessageProps {
  error: ErrorResult | string | null
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorMessage({ error, onRetry, onDismiss, className = '' }: ErrorMessageProps) {
  if (!error) return null

  const errorObj = typeof error === 'string' ? { message: error } : error
  const isNetwork = isNetworkError(errorObj)
  const isPermission = isPermissionError(errorObj)

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {isNetwork ? (
            <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : isPermission ? (
            <ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
            {isNetwork ? 'Connection Error' : isPermission ? 'Permission Denied' : 'Error'}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300">
            {errorObj.message}
          </p>

          {errorObj.details && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errorObj.details}
            </p>
          )}

          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

interface SuccessMessageProps {
  message: string
  onDismiss?: () => void
  className?: string
}

export function SuccessMessage({ message, onDismiss, className = '' }: SuccessMessageProps) {
  return (
    <div className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            {message}
          </p>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

// Inline Error Component
interface InlineErrorProps {
  message: string
  className?: string
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  return (
    <div className={`flex items-center gap-1 text-red-600 dark:text-red-400 text-sm animate-in slide-in-from-top-1 duration-200 animate-shake ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
