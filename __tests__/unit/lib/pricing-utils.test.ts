/**
 * Unit Tests for lib/pricing-utils.ts
 * Tests meal plan pricing calculations and mess cycle computations
 */

import {
  getPayableAmount,
  computeMessCycle,
  DEFAULT_PRICING,
  type MealPlanPricing
} from '@/lib/pricing-utils'

describe('Pricing Utils', () => {
  describe('getPayableAmount', () => {
    const customPricing: MealPlanPricing = {
      lunch_price: 2000,
      dinner_price: 1800,
      both_price: 3500
    }

    it('should calculate 2-meal plan (DL) price correctly', () => {
      const result = getPayableAmount('DL', DEFAULT_PRICING)
      expect(result).toBe(3000)
    })

    it('should calculate lunch-only (L) plan price correctly', () => {
      const result = getPayableAmount('L', DEFAULT_PRICING)
      expect(result).toBe(1500)
    })

    it('should calculate dinner-only (D) plan price correctly', () => {
      const result = getPayableAmount('D', DEFAULT_PRICING)
      expect(result).toBe(1500)
    })

    it('should use custom pricing when provided', () => {
      expect(getPayableAmount('L', customPricing)).toBe(2000)
      expect(getPayableAmount('D', customPricing)).toBe(1800)
      expect(getPayableAmount('DL', customPricing)).toBe(3500)
    })

    it('should default to both_price for null meal plan', () => {
      const result = getPayableAmount(null, DEFAULT_PRICING)
      expect(result).toBe(3000)
    })

    it('should default to both_price for undefined meal plan', () => {
      const result = getPayableAmount(undefined, DEFAULT_PRICING)
      expect(result).toBe(3000)
    })

    it('should default to both_price for empty string', () => {
      const result = getPayableAmount('', DEFAULT_PRICING)
      expect(result).toBe(3000)
    })

    it('should default to both_price for unknown meal plan', () => {
      const result = getPayableAmount('UNKNOWN', DEFAULT_PRICING)
      expect(result).toBe(3000)
    })

    it('should handle case-sensitive meal plan codes', () => {
      // The function is case-sensitive, so lowercase should default to both_price
      expect(getPayableAmount('l', DEFAULT_PRICING)).toBe(3000)
      expect(getPayableAmount('d', DEFAULT_PRICING)).toBe(3000)
      expect(getPayableAmount('dl', DEFAULT_PRICING)).toBe(3000)
    })
  })

  describe('computeMessCycle', () => {
    beforeEach(() => {
      // Mock Date to ensure consistent test results
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should compute 30-day cycle correctly', () => {
      jest.setSystemTime(new Date('2024-03-15T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.totalDays).toBe(30)
      expect(result.startDate).toEqual(new Date(2024, 2, 1)) // March 1, 2024
      expect(result.endDate).toEqual(new Date(2024, 2, 30)) // March 30, 2024
    })

    it('should calculate days completed correctly', () => {
      jest.setSystemTime(new Date('2024-03-15T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysCompleted).toBe(14) // 14 full days completed
      expect(result.daysRemaining).toBe(16)
    })

    it('should calculate progress percentage correctly', () => {
      jest.setSystemTime(new Date('2024-03-15T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.progressPercent).toBe(47) // 14/30 = 46.67% rounded to 47%
    })

    it('should handle cycle at start (day 1)', () => {
      jest.setSystemTime(new Date('2024-03-01T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysCompleted).toBe(0)
      expect(result.daysRemaining).toBe(30)
      expect(result.progressPercent).toBe(0)
    })

    it('should handle cycle at end (day 30)', () => {
      jest.setSystemTime(new Date('2024-03-30T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysCompleted).toBe(29)
      expect(result.daysRemaining).toBe(1)
      expect(result.progressPercent).toBe(97) // 29/30 = 96.67% rounded to 97%
    })

    it('should handle cycle after completion', () => {
      jest.setSystemTime(new Date('2024-04-05T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysCompleted).toBe(30)
      expect(result.daysRemaining).toBe(0)
      expect(result.progressPercent).toBe(100)
    })

    it('should handle ISO timestamp format (strips time component)', () => {
      jest.setSystemTime(new Date('2024-03-15T10:00:00Z'))

      const result = computeMessCycle('2024-03-01T00:00:00Z')

      expect(result.totalDays).toBe(30)
      expect(result.startDate).toEqual(new Date(2024, 2, 1))
      expect(result.endDate).toEqual(new Date(2024, 2, 30))
    })

    it('should handle month boundaries correctly', () => {
      jest.setSystemTime(new Date('2024-03-15T10:00:00Z'))

      // Start on Feb 15, should end on Mar 15 (30 days)
      const result = computeMessCycle('2024-02-15')

      expect(result.startDate).toEqual(new Date(2024, 1, 15)) // Feb 15
      expect(result.endDate).toEqual(new Date(2024, 2, 15)) // Mar 15
      expect(result.totalDays).toBe(30)
    })

    it('should handle leap year February correctly', () => {
      jest.setSystemTime(new Date('2024-03-01T10:00:00Z'))

      // 2024 is a leap year, Feb has 29 days
      const result = computeMessCycle('2024-02-01')

      expect(result.startDate).toEqual(new Date(2024, 1, 1)) // Feb 1
      expect(result.endDate).toEqual(new Date(2024, 2, 1)) // Mar 1 (30 days from Feb 1)
      expect(result.totalDays).toBe(30)
    })

    it('should handle year boundaries correctly', () => {
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'))

      // Start on Dec 20, should end on Jan 18 next year
      const result = computeMessCycle('2023-12-20')

      expect(result.startDate).toEqual(new Date(2023, 11, 20)) // Dec 20, 2023
      expect(result.endDate).toEqual(new Date(2024, 0, 18)) // Jan 18, 2024
      expect(result.totalDays).toBe(30)
    })

    it('should never return negative days remaining', () => {
      jest.setSystemTime(new Date('2024-04-30T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysRemaining).toBeGreaterThanOrEqual(0)
    })

    it('should never exceed 30 days completed', () => {
      jest.setSystemTime(new Date('2024-12-31T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysCompleted).toBeLessThanOrEqual(30)
    })

    it('should handle date before cycle start (future cycle)', () => {
      jest.setSystemTime(new Date('2024-02-15T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysCompleted).toBe(0)
      expect(result.daysRemaining).toBe(30)
      expect(result.progressPercent).toBe(0)
    })

    it('should calculate mid-cycle progress accurately', () => {
      jest.setSystemTime(new Date('2024-03-16T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysCompleted).toBe(15) // Exactly half
      expect(result.daysRemaining).toBe(15)
      expect(result.progressPercent).toBe(50)
    })

    it('should handle single-digit dates correctly', () => {
      jest.setSystemTime(new Date('2024-03-05T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.daysCompleted).toBe(4)
      expect(result.daysRemaining).toBe(26)
    })

    it('should handle dates with leading zeros', () => {
      jest.setSystemTime(new Date('2024-03-15T10:00:00Z'))

      const result = computeMessCycle('2024-03-01')

      expect(result.startDate).toEqual(new Date(2024, 2, 1))
      expect(result.totalDays).toBe(30)
    })
  })

  describe('DEFAULT_PRICING', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_PRICING.lunch_price).toBe(1500)
      expect(DEFAULT_PRICING.dinner_price).toBe(1500)
      expect(DEFAULT_PRICING.both_price).toBe(3000)
    })

    it('should be immutable (not modified by tests)', () => {
      const original = { ...DEFAULT_PRICING }
      
      // Use the pricing in a function
      getPayableAmount('L', DEFAULT_PRICING)
      
      // Verify it hasn't changed
      expect(DEFAULT_PRICING).toEqual(original)
    })
  })

  describe('Edge Cases and Integration', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should handle pro-rated pricing scenario (partial month)', () => {
      // While the function doesn't implement pro-rating, we test the base calculation
      // that would be used for pro-rating calculations
      jest.setSystemTime(new Date('2024-03-15T10:00:00Z'))

      const cycle = computeMessCycle('2024-03-01')
      const dailyRate = DEFAULT_PRICING.both_price / 30
      const proRatedAmount = dailyRate * cycle.daysCompleted

      expect(proRatedAmount).toBeCloseTo(1400, 0) // 14 days * 100/day
    })

    it('should handle discount calculations', () => {
      const basePrice = getPayableAmount('DL', DEFAULT_PRICING)
      const discountPercent = 10
      const discountedPrice = basePrice * (1 - discountPercent / 100)

      expect(discountedPrice).toBe(2700) // 3000 - 10% = 2700
    })

    it('should calculate total for multiple students', () => {
      const students = [
        { mealPlan: 'DL' as const },
        { mealPlan: 'L' as const },
        { mealPlan: 'D' as const }
      ]

      const total = students.reduce(
        (sum, student) => sum + getPayableAmount(student.mealPlan, DEFAULT_PRICING),
        0
      )

      expect(total).toBe(6000) // 3000 + 1500 + 1500
    })
  })
})
