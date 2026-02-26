import { Loader2 } from 'lucide-react'

// Re-export split modules for backward compatibility
export { Skeleton, SkeletonCard, TableSkeleton, DashboardSkeleton } from './skeleton'
export { ProgressLoading, TypingText, BrandLoading, ContextualLoading } from './brand-loading'

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
