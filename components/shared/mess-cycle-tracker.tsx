'use client'

import { Calendar, Clock } from 'lucide-react'
import { computeMessCycle } from '@/lib/pricing-utils'

const COLOR_MAP = {
  green: {
    bar: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  },
  yellow: {
    bar: 'bg-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  },
  red: {
    bar: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  },
} as const

interface MessCycleTrackerProps {
  startDate: string | null | undefined
}

export function MessCycleTracker({ startDate }: MessCycleTrackerProps) {
  if (!startDate) {
    return (
      <p className="text-sm text-muted-foreground text-center py-2">
        No active mess period found.
      </p>
    )
  }

  const { startDate: start, endDate, totalDays, daysCompleted, daysRemaining, progressPercent } =
    computeMessCycle(startDate)

  const color: keyof typeof COLOR_MAP =
    daysRemaining > 10 ? 'green' : daysRemaining > 5 ? 'yellow' : 'red'

  const c = COLOR_MAP[color]

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Day {daysCompleted} of {totalDays}</span>
          <span className={c.text}>{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-lg font-bold">{totalDays}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <p className="text-lg font-bold">{daysCompleted}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>
        <div className={`rounded-lg p-2 ${c.badge}`}>
          <p className="text-lg font-bold">{daysRemaining}</p>
          <p className="text-xs">Remaining</p>
        </div>
      </div>

      {/* Date range */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  )
}
