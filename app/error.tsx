'use client'

import { useEffect } from 'react'
import { ErrorDisplay } from '@/components/shared/error-display'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <ErrorDisplay
      errorMessage={error.message}
      onPrimaryAction={reset}
      secondaryHref="/"
    />
  )
}
