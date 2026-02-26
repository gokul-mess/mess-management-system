'use client'

import { useEffect } from 'react'
import { ErrorDisplay } from '@/components/shared/error-display'

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Student portal error:', error)
  }, [error])

  return (
    <ErrorDisplay
      title="Student Portal Error"
      errorMessage={error.message}
      onPrimaryAction={reset}
      secondaryLabel="Go to Dashboard"
      secondaryHref="/student"
    />
  )
}
