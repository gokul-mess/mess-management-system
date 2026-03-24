'use client'

export function MealPlanBadge({ plan }: { plan?: 'L' | 'D' | 'DL' }) {
  if (!plan) return <span className="text-xs text-muted-foreground">Not set</span>
  const config = {
    L:  { label: 'L',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    D:  { label: 'D', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    DL: { label: 'L + D', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  }
  const { label, className } = config[plan]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${className}`}>
      {label}
    </span>
  )
}
