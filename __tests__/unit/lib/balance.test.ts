/**
 * Unit Tests for lib/balance.ts
 * 
 * Tests the balance day calculation logic (Risk R-05)
 * Ensures correct calculation of remaining usable balance days.
 */

import {
  calculateBalanceDays,
  type BalanceDaysInput,
} from '@/lib/balance'

describe('Balance Calculator (Risk R-05)', () => {
  describe('calculateBalanceDays', () => {
    it('should calculate balance correctly with no leaves', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 20,
        leaveDays: 0,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(10) // 30 - 20 - 0 = 10
      expect(result.totalDays).toBe(30)
      expect(result.consumedDays).toBe(20)
      expect(result.leaveDays).toBe(0)
    })

    it('should subtract leave days from total days (Risk R-05)', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 15,
        leaveDays: 5,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(10) // 30 - 15 - 5 = 10
    })

    it('should subtract consumed days from total days', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 25,
        leaveDays: 0,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(5) // 30 - 25 - 0 = 5
    })

    it('should handle edge case with zero balance', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 20,
        leaveDays: 10,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(0) // 30 - 20 - 10 = 0
    })

    it('should handle negative balance (over-consumption)', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 35,
        leaveDays: 0,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(-5) // 30 - 35 - 0 = -5
    })

    it('should handle extra meals creating debt', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 20,
        leaveDays: 5,
        extraMeals: 10,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(-5) // 30 - 20 - 5 - 10 = -5
      expect(result.extraMeals).toBe(10)
    })

    it('should handle null values as zero', () => {
      const input: BalanceDaysInput = {
        totalDays: null,
        consumedDays: null,
        leaveDays: null,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(0)
      expect(result.totalDays).toBe(0)
      expect(result.consumedDays).toBe(0)
      expect(result.leaveDays).toBe(0)
    })

    it('should handle partial null values', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: null,
        leaveDays: 5,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(25) // 30 - 0 - 5 = 25
    })

    it('should handle negative input values as zero', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: -10,
        leaveDays: -5,
      }
      
      const result = calculateBalanceDays(input)
      
      // Negative values should be treated as 0
      expect(result.consumedDays).toBe(0)
      expect(result.leaveDays).toBe(0)
      expect(result.balanceDays).toBe(30) // 30 - 0 - 0 = 30
    })

    it('should handle all consumed with no leaves', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 30,
        leaveDays: 0,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(0)
    })

    it('should handle complex scenario with all parameters', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 18,
        leaveDays: 7,
        extraMeals: 3,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(2) // 30 - 18 - 7 - 3 = 2
      expect(result.totalDays).toBe(30)
      expect(result.consumedDays).toBe(18)
      expect(result.leaveDays).toBe(7)
      expect(result.extraMeals).toBe(3)
    })

    it('should return correct structure with all fields', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 10,
        leaveDays: 5,
        extraMeals: 2,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result).toHaveProperty('totalDays')
      expect(result).toHaveProperty('consumedDays')
      expect(result).toHaveProperty('leaveDays')
      expect(result).toHaveProperty('extraMeals')
      expect(result).toHaveProperty('balanceDays')
    })

    it('should handle zero total days', () => {
      const input: BalanceDaysInput = {
        totalDays: 0,
        consumedDays: 0,
        leaveDays: 0,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(0)
    })

    it('should handle large numbers correctly', () => {
      const input: BalanceDaysInput = {
        totalDays: 1000,
        consumedDays: 500,
        leaveDays: 200,
        extraMeals: 50,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(250) // 1000 - 500 - 200 - 50 = 250
    })

    it('should handle scenario where consumed + leave exceeds total', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 20,
        leaveDays: 15,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(-5) // 30 - 20 - 15 = -5
    })

    it('should default extraMeals to 0 when not provided', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 20,
        leaveDays: 5,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.extraMeals).toBe(0)
      expect(result.balanceDays).toBe(5) // 30 - 20 - 5 - 0 = 5
    })

    it('should handle only extraMeals causing negative balance', () => {
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 0,
        leaveDays: 0,
        extraMeals: 35,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(-5) // 30 - 0 - 0 - 35 = -5
    })

    it('should handle realistic student scenario', () => {
      // Student with 30-day subscription
      // Consumed 22 meals, took 3 days leave, no extra meals
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 22,
        leaveDays: 3,
        extraMeals: 0,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(5) // 30 - 22 - 3 - 0 = 5
    })

    it('should handle student with debt scenario', () => {
      // Student consumed more than allowed
      const input: BalanceDaysInput = {
        totalDays: 30,
        consumedDays: 28,
        leaveDays: 2,
        extraMeals: 5,
      }
      
      const result = calculateBalanceDays(input)
      
      expect(result.balanceDays).toBe(-5) // 30 - 28 - 2 - 5 = -5
    })
  })
})
