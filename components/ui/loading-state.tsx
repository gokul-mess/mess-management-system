import { Loader2, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingState({ message = 'Loading...', size = 'md', className = '' }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mb-3`} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message = 'Processing...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-2xl border border-border">
        <LoadingState message={message} size="lg" />
      </div>
    </div>
  )
}

interface ButtonLoadingProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
}

export function ButtonLoading({ loading, children, loadingText }: ButtonLoadingProps) {
  if (loading) {
    return (
      <span className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {loadingText || 'Loading...'}
      </span>
    )
  }
  return <>{children}</>
}

// Enhanced Loading Components

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave'
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  animation = 'wave'
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  return (
    <div 
      className={`bg-muted relative overflow-hidden ${variantClasses[variant]} ${className}`}
    >
      {animation === 'wave' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
      )}
      {animation === 'pulse' && (
        <div className="absolute inset-0 animate-pulse" />
      )}
    </div>
  )
}

interface SkeletonCardProps {
  lines?: number
  showAvatar?: boolean
  showImage?: boolean
}

export function SkeletonCard({ lines = 3, showAvatar = false, showImage = false }: SkeletonCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border space-y-4">
      {showImage && (
        <Skeleton className="w-full h-48" />
      )}
      <div className="flex items-start gap-4">
        {showAvatar && (
          <Skeleton variant="circular" className="w-12 h-12 flex-shrink-0" />
        )}
        <div className="flex-1 space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton 
              key={i} 
              variant="text" 
              className={i === lines - 1 ? 'w-2/3' : 'w-full'}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ProgressLoadingProps {
  progress?: number
  message?: string
  showPercentage?: boolean
}

export function ProgressLoading({ 
  progress = 0, 
  message = 'Loading...', 
  showPercentage = true 
}: ProgressLoadingProps) {
  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {showPercentage && (
          <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  )
}

interface TypingTextProps {
  text: string
  speed?: number
  className?: string
}

export function TypingText({ text, speed = 50, className = '' }: TypingTextProps) {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, speed])

  return (
    <span className={className}>
      {displayText}
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  )
}

interface BrandLoadingProps {
  message?: string
  showProgress?: boolean
  progress?: number
}

export function BrandLoading({ 
  message = 'Loading Gokul Mess...', 
  showProgress = false,
  progress = 0
}: BrandLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Animated Logo */}
      <div className="relative mb-8">
        {/* Outer Ring */}
        <div className="absolute inset-0 w-24 h-24 border-4 border-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
        
        {/* Middle Ring */}
        <div className="absolute inset-2 w-20 h-20 border-4 border-primary/40 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
        
        {/* Logo Container */}
        <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-2xl shadow-primary/50 animate-pulse">
          <span className="text-4xl font-bold text-white animate-bounce" style={{ animationDuration: '2s' }}>G</span>
        </div>
        
        {/* Sparkles */}
        <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-pulse" />
        <Sparkles className="absolute -bottom-2 -left-2 w-5 h-5 text-primary animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Loading Message with Typing Effect */}
      <div className="text-center mb-4">
        <TypingText 
          text={message} 
          speed={50}
          className="text-lg font-semibold text-foreground"
        />
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="w-64">
          <ProgressLoading progress={progress} message="" showPercentage={false} />
        </div>
      )}

      {/* Loading Dots */}
      <div className="flex gap-2 mt-6">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}

interface ContextualLoadingProps {
  context: 'fetching' | 'saving' | 'deleting' | 'uploading' | 'processing' | 'verifying'
  itemName?: string
}

export function ContextualLoading({ context, itemName = 'data' }: ContextualLoadingProps) {
  const messages = {
    fetching: `Fetching ${itemName}...`,
    saving: `Saving ${itemName}...`,
    deleting: `Deleting ${itemName}...`,
    uploading: `Uploading ${itemName}...`,
    processing: `Processing ${itemName}...`,
    verifying: `Verifying ${itemName}...`
  }

  const icons = {
    fetching: '📥',
    saving: '💾',
    deleting: '🗑️',
    uploading: '📤',
    processing: '⚙️',
    verifying: '✓'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="text-4xl mb-4 animate-bounce">
        {icons[context]}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{messages[context]}</p>
      </div>
      <p className="text-xs text-muted-foreground">Please wait...</p>
    </div>
  )
}

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="text" className="h-4" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  variant="text" 
                  className="h-4"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface DashboardSkeletonProps {
  showStats?: boolean
  showCharts?: boolean
}

export function DashboardSkeleton({ showStats = true, showCharts = true }: DashboardSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              <div className="space-y-3">
                <Skeleton variant="circular" className="w-12 h-12" />
                <Skeleton variant="text" className="h-8 w-24" />
                <Skeleton variant="text" className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              <div className="space-y-4">
                <Skeleton variant="text" className="h-6 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
