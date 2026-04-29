/**
 * Unit Tests for lib/date-utils.ts
 * 
 * Tests IST timezone handling (Risk R-12)
 * Ensures consistent date handling across the application.
 */

import {
  toIST,
  formatDateIST,
  formatDateTimeIST,
  getTodayIST,
  getCurrentHourIST,
  isTodayIST,
  isFutureIST,
  isPastIST,
  daysBetween,
  validateDateRange,
  getISTDateString,
  getDateRange,
} from '@/lib/date-utils'

describe('Date Utils (Risk R-12)', () => {
  describe('toIST', () => {
    it('should convert UTC to IST correctly (Risk R-12)', () => {
      const utcDate = new Date('2024-01-01T00:00:00Z')
      const istDate = toIST(utcDate)
      
      // IST is UTC+5:30, so 00:00 UTC = 05:30 IST
      expect(istDate.getHours()).toBe(5)
      expect(istDate.getMinutes()).toBe(30)
    })

    it('should handle string input', () => {
      const dateStr = '2024-01-01T00:00:00Z'
      const istDate = toIST(dateStr)
      
      expect(istDate).toBeInstanceOf(Date)
      expect(istDate.getHours()).toBe(5)
      expect(istDate.getMinutes()).toBe(30)
    })

    it('should handle Date object input', () => {
      const date = new Date('2024-01-01T12:00:00Z')
      const istDate = toIST(date)
      
      expect(istDate).toBeInstanceOf(Date)
    })
  })

  describe('formatDateIST', () => {
    it('should format dates in IST timezone (Risk R-12)', () => {
      const date = new Date('2024-01-15T00:00:00Z')
      const formatted = formatDateIST(date)
      
      // Should return YYYY-MM-DD format
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should handle string input', () => {
      const dateStr = '2024-01-15'
      const formatted = formatDateIST(dateStr)
      
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should handle Date object input', () => {
      const date = new Date('2024-01-15')
      const formatted = formatDateIST(date)
      
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('formatDateTimeIST', () => {
    it('should format date with default options', () => {
      const date = new Date('2024-01-15T00:00:00Z')
      const formatted = formatDateTimeIST(date)
      
      // Should contain day, month, and year
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })

    it('should format date with custom options', () => {
      const date = new Date('2024-01-15T00:00:00Z')
      const formatted = formatDateTimeIST(date, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })

    it('should handle string input', () => {
      const dateStr = '2024-01-15'
      const formatted = formatDateTimeIST(dateStr)
      
      expect(formatted).toBeTruthy()
    })
  })

  describe('getTodayIST', () => {
    it('should return current date in IST', () => {
      const today = getTodayIST()
      
      // Should return YYYY-MM-DD format
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should return consistent value within same day', () => {
      const today1 = getTodayIST()
      const today2 = getTodayIST()
      
      expect(today1).toBe(today2)
    })
  })

  describe('getCurrentHourIST', () => {
    it('should return current hour in IST (0-23)', () => {
      const hour = getCurrentHourIST()
      
      expect(hour).toBeGreaterThanOrEqual(0)
      expect(hour).toBeLessThanOrEqual(23)
      expect(Number.isInteger(hour)).toBe(true)
    })
  })

  describe('isTodayIST', () => {
    it('should return true for today\'s date', () => {
      const today = getTodayIST()
      
      expect(isTodayIST(today)).toBe(true)
    })

    it('should return false for past date', () => {
      const pastDate = '2020-01-01'
      
      expect(isTodayIST(pastDate)).toBe(false)
    })

    it('should return false for future date', () => {
      const futureDate = '2030-12-31'
      
      expect(isTodayIST(futureDate)).toBe(false)
    })
  })

  describe('isFutureIST', () => {
    it('should return true for future date', () => {
      const futureDate = '2030-12-31'
      
      expect(isFutureIST(futureDate)).toBe(true)
    })

    it('should return false for past date', () => {
      const pastDate = '2020-01-01'
      
      expect(isFutureIST(pastDate)).toBe(false)
    })

    it('should return false for today', () => {
      const today = getTodayIST()
      
      expect(isFutureIST(today)).toBe(false)
    })
  })

  describe('isPastIST', () => {
    it('should return true for past date', () => {
      const pastDate = '2020-01-01'
      
      expect(isPastIST(pastDate)).toBe(true)
    })

    it('should return false for future date', () => {
      const futureDate = '2030-12-31'
      
      expect(isPastIST(futureDate)).toBe(false)
    })

    it('should return false for today', () => {
      const today = getTodayIST()
      
      expect(isPastIST(today)).toBe(false)
    })
  })

  describe('daysBetween', () => {
    it('should calculate days between dates correctly (Risk R-12)', () => {
      const days = daysBetween('2024-01-01', '2024-01-05')
      
      // Inclusive: Jan 1, 2, 3, 4, 5 = 5 days
      expect(days).toBe(5)
    })

    it('should return 1 for same date (inclusive)', () => {
      const days = daysBetween('2024-01-01', '2024-01-01')
      
      expect(days).toBe(1)
    })

    it('should handle month boundaries (Risk R-12)', () => {
      const days = daysBetween('2024-01-30', '2024-02-02')
      
      // Jan 30, 31, Feb 1, 2 = 4 days
      expect(days).toBe(4)
    })

    it('should handle year boundaries', () => {
      const days = daysBetween('2023-12-30', '2024-01-02')
      
      // Dec 30, 31, Jan 1, 2 = 4 days
      expect(days).toBe(4)
    })

    it('should handle leap year', () => {
      const days = daysBetween('2024-02-28', '2024-03-01')
      
      // Feb 28, 29 (leap year), Mar 1 = 3 days
      expect(days).toBe(3)
    })

    it('should handle large date ranges', () => {
      const days = daysBetween('2024-01-01', '2024-12-31')
      
      // 366 days in 2024 (leap year)
      expect(days).toBe(366)
    })
  })

  describe('validateDateRange', () => {
    it('should not throw for valid date range', () => {
      expect(() => {
        validateDateRange('2024-01-01', '2024-01-31')
      }).not.toThrow()
    })

    it('should throw error for missing start date', () => {
      expect(() => {
        validateDateRange('', '2024-01-31')
      }).toThrow('Start date and end date are required')
    })

    it('should throw error for missing end date', () => {
      expect(() => {
        validateDateRange('2024-01-01', '')
      }).toThrow('Start date and end date are required')
    })

    it('should throw error for invalid start date', () => {
      expect(() => {
        validateDateRange('invalid-date', '2024-01-31')
      }).toThrow('Invalid start date')
    })

    it('should throw error for invalid end date', () => {
      expect(() => {
        validateDateRange('2024-01-01', 'invalid-date')
      }).toThrow('Invalid end date')
    })

    it('should throw error when start date is after end date', () => {
      expect(() => {
        validateDateRange('2024-01-31', '2024-01-01')
      }).toThrow('Start date must be before or equal to end date')
    })

    it('should allow start date equal to end date', () => {
      expect(() => {
        validateDateRange('2024-01-15', '2024-01-15')
      }).not.toThrow()
    })
  })

  describe('getISTDateString', () => {
    it('should return date string in YYYY-MM-DD format', () => {
      const date = new Date('2024-01-15')
      const dateStr = getISTDateString(date)
      
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should handle string input', () => {
      const dateStr = getISTDateString('2024-01-15')
      
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should be alias for formatDateIST', () => {
      const date = new Date('2024-01-15')
      
      expect(getISTDateString(date)).toBe(formatDateIST(date))
    })
  })

  describe('getDateRange', () => {
    it('should return all dates between start and end (inclusive)', () => {
      const dates = getDateRange('2024-01-01', '2024-01-05')
      
      expect(dates).toHaveLength(5)
      expect(dates[0]).toBe('2024-01-01')
      expect(dates[4]).toBe('2024-01-05')
    })

    it('should return single date for same start and end', () => {
      const dates = getDateRange('2024-01-15', '2024-01-15')
      
      expect(dates).toHaveLength(1)
      expect(dates[0]).toBe('2024-01-15')
    })

    it('should handle month boundaries', () => {
      const dates = getDateRange('2024-01-30', '2024-02-02')
      
      expect(dates).toHaveLength(4)
      expect(dates[0]).toMatch(/2024-01-30/)
      expect(dates[3]).toMatch(/2024-02-02/)
    })

    it('should return dates in YYYY-MM-DD format', () => {
      const dates = getDateRange('2024-01-01', '2024-01-03')
      
      dates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })

    it('should handle leap year February', () => {
      const dates = getDateRange('2024-02-28', '2024-03-01')
      
      // Should include Feb 29 (leap year)
      expect(dates).toHaveLength(3)
    })

    it('should return empty array for invalid range', () => {
      const dates = getDateRange('2024-01-31', '2024-01-01')
      
      expect(dates).toHaveLength(0)
    })
  })

  describe('Edge Cases and Integration', () => {
    it('should handle daylight saving time transitions (Risk R-12)', () => {
      // IST doesn't have DST, but test should still work
      const date1 = new Date('2024-03-10T00:00:00Z')
      const date2 = new Date('2024-11-03T00:00:00Z')
      
      const formatted1 = formatDateIST(date1)
      const formatted2 = formatDateIST(date2)
      
      expect(formatted1).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(formatted2).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('should maintain consistency across different date functions', () => {
      const date = new Date('2024-01-15')
      
      const formatted1 = formatDateIST(date)
      const formatted2 = getISTDateString(date)
      
      expect(formatted1).toBe(formatted2)
    })

    it('should handle edge of month correctly', () => {
      const dates = getDateRange('2024-01-31', '2024-02-01')
      
      expect(dates).toHaveLength(2)
      expect(dates[0]).toMatch(/2024-01-31/)
      expect(dates[1]).toMatch(/2024-02-01/)
    })

    it('should handle edge of year correctly', () => {
      const dates = getDateRange('2023-12-31', '2024-01-01')
      
      expect(dates).toHaveLength(2)
      expect(dates[0]).toMatch(/2023-12-31/)
      expect(dates[1]).toMatch(/2024-01-01/)
    })
  })
})
