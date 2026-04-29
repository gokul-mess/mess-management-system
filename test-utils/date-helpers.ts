/**
 * Date Helper Utilities for Testing
 * 
 * Provides utilities for working with dates in IST timezone during tests.
 */

/**
 * Convert a date to IST timezone string (YYYY-MM-DD)
 * 
 * @param date - Date object or ISO string
 * @returns Date string in IST timezone
 * 
 * @example
 * const istDate = toISTDateString(new Date('2024-01-01T00:00:00Z'))
 * // Returns: '2024-01-01' (adjusted for IST +5:30)
 */
export function toISTDateString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000 // 5 hours 30 minutes in milliseconds
  const istDate = new Date(dateObj.getTime() + istOffset)
  
  return istDate.toISOString().split('T')[0]
}

/**
 * Get current date in IST timezone
 * 
 * @returns Current date string in IST timezone (YYYY-MM-DD)
 * 
 * @example
 * const today = getTodayIST()
 * // Returns: '2024-01-15' (current date in IST)
 */
export function getTodayIST(): string {
  return toISTDateString(new Date())
}

/**
 * Add days to a date
 * 
 * @param date - Date string (YYYY-MM-DD)
 * @param days - Number of days to add (can be negative)
 * @returns New date string
 * 
 * @example
 * const tomorrow = addDays('2024-01-01', 1)
 * // Returns: '2024-01-02'
 */
export function addDays(date: string, days: number): string {
  const dateObj = new Date(date)
  dateObj.setDate(dateObj.getDate() + days)
  return dateObj.toISOString().split('T')[0]
}

/**
 * Get start of month for a given date
 * 
 * @param date - Date string (YYYY-MM-DD)
 * @returns Start of month date string
 * 
 * @example
 * const monthStart = getStartOfMonth('2024-01-15')
 * // Returns: '2024-01-01'
 */
export function getStartOfMonth(date: string): string {
  const dateObj = new Date(date)
  const startOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
  return startOfMonth.toISOString().split('T')[0]
}

/**
 * Get end of month for a given date
 * 
 * @param date - Date string (YYYY-MM-DD)
 * @returns End of month date string
 * 
 * @example
 * const monthEnd = getEndOfMonth('2024-01-15')
 * // Returns: '2024-01-31'
 */
export function getEndOfMonth(date: string): string {
  const dateObj = new Date(date)
  const endOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0)
  return endOfMonth.toISOString().split('T')[0]
}

/**
 * Get date range between two dates (inclusive)
 * 
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of date strings
 * 
 * @example
 * const dates = getDateRange('2024-01-01', '2024-01-03')
 * // Returns: ['2024-01-01', '2024-01-02', '2024-01-03']
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    dates.push(date.toISOString().split('T')[0])
  }
  
  return dates
}

/**
 * Calculate number of days between two dates
 * 
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Number of days (inclusive)
 * 
 * @example
 * const days = getDaysBetween('2024-01-01', '2024-01-03')
 * // Returns: 3
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1 // +1 to make it inclusive
}

/**
 * Check if a date is within a date range
 * 
 * @param date - Date to check (YYYY-MM-DD)
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns True if date is within range
 * 
 * @example
 * const isInRange = isDateInRange('2024-01-15', '2024-01-01', '2024-01-31')
 * // Returns: true
 */
export function isDateInRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  return date >= startDate && date <= endDate
}

/**
 * Format date for display (DD/MM/YYYY)
 * 
 * @param date - Date string (YYYY-MM-DD)
 * @returns Formatted date string
 * 
 * @example
 * const formatted = formatDateForDisplay('2024-01-15')
 * // Returns: '15/01/2024'
 */
export function formatDateForDisplay(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Create a mock date for testing (freezes time)
 * 
 * @param date - Date to freeze at
 * @returns Cleanup function to restore original Date
 * 
 * @example
 * // In a test
 * const cleanup = mockDate('2024-01-15')
 * // ... test code ...
 * cleanup() // Restore original Date
 */
export function mockDate(date: string): () => void {
  const originalDate = global.Date
  const mockDateObj = new Date(date)
  
  // @ts-ignore - Mocking Date constructor for testing
  global.Date = class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(mockDateObj.getTime())
      } else {
        // @ts-ignore
        super(...args)
      }
    }
    
    static now() {
      return mockDateObj.getTime()
    }
  }
  
  // Return cleanup function
  return () => {
    global.Date = originalDate
  }
}
