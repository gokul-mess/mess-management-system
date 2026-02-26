import { AlertCircle, XCircle, AlertTriangle, Info, CheckCircle, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

// Enhanced Alert Components

type AlertType = 'error' | 'warning' | 'info' | 'success'

interface EnhancedAlertProps {
  type: AlertType
  title: string
  message: string
  details?: string
  onRetry?: () => void
  onDismiss?: () => void
  autoDismiss?: boolean
  autoDismissDelay?: number
  showDetailsToggle?: boolean
  className?: string
}

export function EnhancedAlert({
  type,
  title,
  message,
  details,
  onRetry,
  onDismiss,
  autoDismiss = false,
  autoDismissDelay = 5000,
  showDetailsToggle = true,
  className = ''
}: EnhancedAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [countdown, setCountdown] = useState(autoDismissDelay / 1000)
  const [isVisible, setIsVisible] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onDismiss?.()
    }, 300)
  }, [onDismiss])

  useEffect(() => {
    if (autoDismiss && onDismiss) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            handleDismiss()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [autoDismiss, onDismiss, handleDismiss])

  const handleRetry = async () => {
    setIsRetrying(true)
    await onRetry?.()
    setTimeout(() => setIsRetrying(false), 1000)
  }

  const config = {
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-900 dark:text-red-100',
      messageColor: 'text-red-700 dark:text-red-300',
      buttonColor: 'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
      messageColor: 'text-yellow-700 dark:text-yellow-300',
      buttonColor: 'text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-900 dark:text-blue-100',
      messageColor: 'text-blue-700 dark:text-blue-300',
      buttonColor: 'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-900 dark:text-green-100',
      messageColor: 'text-green-700 dark:text-green-300',
      buttonColor: 'text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100'
    }
  }

  const { icon: Icon, bgColor, borderColor, iconColor, titleColor, messageColor, buttonColor } = config[type]

  if (!isVisible) return null

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-xl p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-top-2 ${
        !isVisible ? 'animate-out slide-out-to-top-2' : ''
      } ${type === 'error' ? 'animate-shake' : ''} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full ${bgColor} border ${borderColor} flex items-center justify-center animate-pulse`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`text-sm font-semibold ${titleColor}`}>{title}</h3>
            {autoDismiss && countdown > 0 && (
              <span className="text-xs font-medium opacity-60">{countdown}s</span>
            )}
          </div>

          <p className={`text-sm ${messageColor}`}>{message}</p>

          {details && showDetailsToggle && (
            <div className="mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`text-xs font-medium ${buttonColor} flex items-center gap-1 hover:underline transition-all`}
              >
                {isExpanded ? (
                  <><ChevronUp className="w-3 h-3" /> Hide Details</>
                ) : (
                  <><ChevronDown className="w-3 h-3" /> Show Details</>
                )}
              </button>

              {isExpanded && (
                <div className={`mt-2 p-3 rounded-lg bg-black/5 dark:bg-white/5 border ${borderColor} animate-in slide-in-from-top-1 duration-200`}>
                  <p className="text-xs font-mono opacity-80">{details}</p>
                </div>
              )}
            </div>
          )}

          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className={`px-3 py-1.5 text-xs font-medium ${buttonColor} border ${borderColor} rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1 ${
                    isRetrying ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : 'animate-pulse'}`} />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}
              {onDismiss && !autoDismiss && (
                <button onClick={handleDismiss} className={`px-3 py-1.5 text-xs font-medium ${buttonColor} hover:underline transition-all`}>
                  Dismiss
                </button>
              )}
            </div>
          )}

          {autoDismiss && (
            <div className="mt-3 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : type === 'info' ? 'bg-blue-500' : 'bg-green-500'} transition-all duration-1000 ease-linear`}
                style={{ width: `${(countdown / (autoDismissDelay / 1000)) * 100}%` }}
              />
            </div>
          )}
        </div>

        {onDismiss && (
          <button onClick={handleDismiss} className={`flex-shrink-0 ${iconColor} hover:opacity-80 transition-opacity`}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

// Toast Notification Component
interface ToastProps {
  type: AlertType
  message: string
  duration?: number
  onClose?: () => void
}

export function Toast({ type, message, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onClose])

  const config = {
    error: { icon: XCircle, color: 'bg-red-500' },
    warning: { icon: AlertTriangle, color: 'bg-yellow-500' },
    info: { icon: Info, color: 'bg-blue-500' },
    success: { icon: CheckCircle, color: 'bg-green-500' }
  }

  const { icon: Icon, color } = config[type]

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isVisible ? 'animate-in slide-in-from-bottom-2' : 'animate-out slide-out-to-bottom-2'}`}>
      <div className={`${color} text-white rounded-lg shadow-2xl p-4 flex items-center gap-3 min-w-[300px] max-w-md`}>
        <Icon className="w-5 h-5 flex-shrink-0 animate-pulse" />
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          onClick={() => { setIsVisible(false); setTimeout(() => onClose?.(), 300) }}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Error Boundary Fallback
interface ErrorBoundaryFallbackProps {
  error: Error
  resetError: () => void
}

export function ErrorBoundaryFallback({ error, resetError }: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-zinc-950">
      <div className="max-w-md w-full">
        <EnhancedAlert
          type="error"
          title="Something went wrong"
          message="An unexpected error occurred. Please try refreshing the page."
          details={`${error.name}: ${error.message}\n\n${error.stack}`}
          onRetry={resetError}
          showDetailsToggle={true}
        />
      </div>
    </div>
  )
}
