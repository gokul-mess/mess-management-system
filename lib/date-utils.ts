/**
 * Centralized date and timezone utilities
 * Ensures consistent date handling across the application
 */

/**
 * Convert a date to IST (Indian Standard Time)
 * @param date - Date object or date string in ISO format
 * @returns Date object in IST
 */
export function toIST(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000
  const utcTime = dateObj.getTime() + dateObj.getTimezoneOffset() * 60 * 1000
  return new Date(utcTime + istOffset)
}

/**
 * Format date to IST string in YYYY-MM-DD format
 * @param date - Date object or date string
 * @returns Date string in YYYY-MM-DD format (IST)
 */
export function formatDateIST(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // en-CA gives YYYY-MM-DD
}

/**
 * Format date to human-readable IST string
 * @param date - Date object or date string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in IST
 */
export function formatDateTimeIST(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-IN', {
    ...options,
    timeZone: 'Asia/Kolkata'
  })
}

/**
 * Get current date in IST as YYYY-MM-DD string
 * @returns Current date string in IST
 */
export function getTodayIST(): string {
  return formatDateIST(new Date())
}

/**
 * Get current hour in IST (0-23)
 * @returns Current hour in IST
 */
export function getCurrentHourIST(): number {
  const now = new Date()
  const istTime = now.toLocaleString('en-US', { 
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false 
  })
  return parseInt(istTime, 10)
}

/**
 * Check if a date is today in IST
 * @param dateStr - Date string to check
 * @returns True if date is today in IST
 */
export function isTodayIST(dateStr: string): boolean {
  return dateStr === getTodayIST()
}

/**
 * Check if a date is in the future in IST
 * @param dateStr - Date string to check
 * @returns True if date is in the future
 */
export function isFutureIST(dateStr: string): boolean {
  return dateStr > getTodayIST()
}

/**
 * Check if a date is in the past in IST
 * @param dateStr - Date string to check
 * @returns True if date is in the past
 */
export function isPastIST(dateStr: string): boolean {
  return dateStr < getTodayIST()
}

/**
 * Calculate number of days between two dates (inclusive)
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Number of days (inclusive)
 */
export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1 // +1 to make it inclusive
}

/**
 * Validate date range
 * @param startDate - Start date string
 * @param endDate - End date string
 * @throws Error if dates are invalid or start > end
 */
export function validateDateRange(startDate: string, endDate: string): void {
  if (!startDate || !endDate) {
    throw new Error('Start date and end date are required')
  }
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime())) {
    throw new Error('Invalid start date')
  }
  
  if (isNaN(end.getTime())) {
    throw new Error('Invalid end date')
  }
  
  if (start > end) {
    throw new Error('Start date must be before or equal to end date')
  }
}

/**
 * Get date string in IST (YYYY-MM-DD format)
 * Alias for formatDateIST for backward compatibility
 * @param date - Date object or date string
 * @returns Date string in YYYY-MM-DD format (IST)
 */
export function getISTDateString(date: Date | string): string {
  return formatDateIST(date)
}

/**
 * Get all dates between start and end (inclusive)
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  
  while (current <= end) {
    dates.push(formatDateIST(current))
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}
