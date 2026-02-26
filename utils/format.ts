/**
 * Utility functions for time/date formatting shared across the app.
 */

/**
 * Returns a human-readable "time ago" string (e.g., "Just now", "5m ago", "2h ago").
 */
export function getTimeAgo(dateString: string): string {
  const now = new Date()
  const past = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

/**
 * Formats a date string to Indian locale with day, month, year, time.
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Formats a date for display as Indian short date (e.g., "Mon, 15 Jun 2025").
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Returns the current date formatted for Indian locale headers.
 */
export function formatHeaderDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
