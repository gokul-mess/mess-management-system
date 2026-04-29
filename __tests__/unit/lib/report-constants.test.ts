/**
 * Unit Tests for lib/report-constants.ts
 * 
 * Tests shared constants and utility functions for report generation.
 */

import {
  LUNCH_CUTOFF_HOUR,
  DINNER_CUTOFF_HOUR,
  CONSUMED_STATUSES,
  MEAL_TYPES,
  MEAL_PLANS,
  DEFAULT_MEAL_PLAN,
  DEFAULT_REVENUE_PER_MEAL,
  REPORT_COLORS,
  CHART_CONFIG,
  isConsumedStatus,
  getMealsPerDay,
  isPastMealCutoff,
} from '@/lib/report-constants'

describe('report-constants', () => {
  describe('Constants', () => {
    it('should have correct meal cutoff hours', () => {
      expect(LUNCH_CUTOFF_HOUR).toBe(14)
      expect(DINNER_CUTOFF_HOUR).toBe(20)
    })

    it('should have correct consumed statuses', () => {
      expect(CONSUMED_STATUSES).toEqual(['VERIFIED', 'TAKEN', 'PRESENT', 'CONSUMED'])
    })

    it('should have correct meal types', () => {
      expect(MEAL_TYPES).toEqual({
        LUNCH: 'LUNCH',
        DINNER: 'DINNER',
      })
    })

    it('should have correct meal plans', () => {
      expect(MEAL_PLANS).toEqual({
        DL: 'DL',
        L: 'L',
        D: 'D',
      })
    })

    it('should have correct default values', () => {
      expect(DEFAULT_MEAL_PLAN).toBe('DL')
      expect(DEFAULT_REVENUE_PER_MEAL).toBe(50)
    })

    it('should have report colors defined', () => {
      expect(REPORT_COLORS.primary).toBe('#2E7D32')
      expect(REPORT_COLORS.secondary).toBe('#1976D2')
      expect(REPORT_COLORS.lunch).toBe('#2196F3')
      expect(REPORT_COLORS.dinner).toBe('#9C27B0')
    })

    it('should have chart configuration defined', () => {
      expect(CHART_CONFIG.defaultHeight).toBe(300)
      expect(CHART_CONFIG.defaultWidth).toBe(400)
      expect(CHART_CONFIG.fontSize.title).toBe(14)
    })
  })

  describe('isConsumedStatus', () => {
    it('should return true for VERIFIED status', () => {
      expect(isConsumedStatus('VERIFIED')).toBe(true)
    })

    it('should return true for TAKEN status', () => {
      expect(isConsumedStatus('TAKEN')).toBe(true)
    })

    it('should return true for PRESENT status', () => {
      expect(isConsumedStatus('PRESENT')).toBe(true)
    })

    it('should return true for CONSUMED status', () => {
      expect(isConsumedStatus('CONSUMED')).toBe(true)
    })

    it('should be case-insensitive', () => {
      expect(isConsumedStatus('verified')).toBe(true)
      expect(isConsumedStatus('Verified')).toBe(true)
      expect(isConsumedStatus('VERIFIED')).toBe(true)
    })

    it('should return false for SKIPPED status', () => {
      expect(isConsumedStatus('SKIPPED')).toBe(false)
    })

    it('should return false for LEAVE status', () => {
      expect(isConsumedStatus('LEAVE')).toBe(false)
    })

    it('should return false for unknown status', () => {
      expect(isConsumedStatus('UNKNOWN')).toBe(false)
      expect(isConsumedStatus('PENDING')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isConsumedStatus('')).toBe(false)
    })
  })

  describe('getMealsPerDay', () => {
    it('should return 2 for DL meal plan', () => {
      expect(getMealsPerDay('DL')).toBe(2)
    })

    it('should return 1 for L meal plan', () => {
      expect(getMealsPerDay('L')).toBe(1)
    })

    it('should return 1 for D meal plan', () => {
      expect(getMealsPerDay('D')).toBe(1)
    })

    it('should be case-insensitive', () => {
      expect(getMealsPerDay('dl')).toBe(2)
      expect(getMealsPerDay('Dl')).toBe(2)
      expect(getMealsPerDay('l')).toBe(1)
      expect(getMealsPerDay('d')).toBe(1)
    })

    it('should return 1 for unknown meal plan', () => {
      expect(getMealsPerDay('UNKNOWN')).toBe(1)
      expect(getMealsPerDay('')).toBe(1)
    })
  })

  describe('isPastMealCutoff', () => {
    describe('LUNCH', () => {
      it('should return false before lunch cutoff (13:00)', () => {
        expect(isPastMealCutoff('LUNCH', 13)).toBe(false)
      })

      it('should return true at lunch cutoff (14:00)', () => {
        expect(isPastMealCutoff('LUNCH', 14)).toBe(true)
      })

      it('should return true after lunch cutoff (15:00)', () => {
        expect(isPastMealCutoff('LUNCH', 15)).toBe(true)
      })

      it('should be case-insensitive', () => {
        expect(isPastMealCutoff('lunch', 15)).toBe(true)
        expect(isPastMealCutoff('Lunch', 15)).toBe(true)
      })
    })

    describe('DINNER', () => {
      it('should return false before dinner cutoff (19:00)', () => {
        expect(isPastMealCutoff('DINNER', 19)).toBe(false)
      })

      it('should return true at dinner cutoff (20:00)', () => {
        expect(isPastMealCutoff('DINNER', 20)).toBe(true)
      })

      it('should return true after dinner cutoff (21:00)', () => {
        expect(isPastMealCutoff('DINNER', 21)).toBe(true)
      })

      it('should be case-insensitive', () => {
        expect(isPastMealCutoff('dinner', 21)).toBe(true)
        expect(isPastMealCutoff('Dinner', 21)).toBe(true)
      })
    })

    describe('Edge cases', () => {
      it('should return false for unknown meal type', () => {
        expect(isPastMealCutoff('BREAKFAST', 10)).toBe(false)
        expect(isPastMealCutoff('', 15)).toBe(false)
      })

      it('should handle midnight hour (0)', () => {
        expect(isPastMealCutoff('LUNCH', 0)).toBe(false)
        expect(isPastMealCutoff('DINNER', 0)).toBe(false)
      })

      it('should handle late night hour (23)', () => {
        expect(isPastMealCutoff('LUNCH', 23)).toBe(true)
        expect(isPastMealCutoff('DINNER', 23)).toBe(true)
      })
    })
  })
})
