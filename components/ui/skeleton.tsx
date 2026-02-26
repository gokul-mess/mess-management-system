// Skeleton Components

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
