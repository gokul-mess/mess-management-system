'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorDisplayProps {
  /** Heading text */
  title?: string
  /** Subheading text */
  subtitle?: string
  /** The error message to display */
  errorMessage?: string
  /** Label for the primary action button */
  primaryLabel?: string
  /** Handler for the primary action (e.g. reset / reload) */
  onPrimaryAction?: () => void
  /** Label for the secondary action button */
  secondaryLabel?: string
  /** URL to navigate to for the secondary action */
  secondaryHref?: string
}

export function ErrorDisplay({
  title = 'Something went wrong',
  subtitle = 'An unexpected error occurred',
  errorMessage = 'Unknown error',
  primaryLabel = 'Try Again',
  onPrimaryAction,
  secondaryLabel = 'Go Home',
  secondaryHref = '/',
}: ErrorDisplayProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 max-w-md w-full border border-border shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-900 dark:text-red-100 font-mono">
            {errorMessage}
          </p>
        </div>

        <div className="flex gap-3">
          {onPrimaryAction && (
            <Button onClick={onPrimaryAction} className="flex-1">
              {primaryLabel}
            </Button>
          )}
          <Button
            onClick={() => (window.location.href = secondaryHref)}
            variant={onPrimaryAction ? 'outline' : 'default'}
            className="flex-1"
          >
            {secondaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
