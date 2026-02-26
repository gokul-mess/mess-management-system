'use client'

import { useEffect } from 'react'
import { ErrorDisplay } from '@/components/shared/error-display'

export default function OwnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Owner portal error:', error)
  }, [error])

  return (
    <ErrorDisplay
      title="Owner Portal Error"
      errorMessage={error.message}
      onPrimaryAction={reset}
      secondaryLabel="Go to Dashboard"
      secondaryHref="/owner"
    />
  )
}
