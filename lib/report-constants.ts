/**
 * Shared constants for report generation
 * Single source of truth for business rules and configuration
 */

// Meal time cutoffs (24-hour format)
export const LUNCH_CUTOFF_HOUR = 14 // 2:00 PM
export const DINNER_CUTOFF_HOUR = 20 // 8:00 PM

// Meal status values that indicate consumption
export const CONSUMED_STATUSES = ['VERIFIED', 'TAKEN', 'PRESENT', 'CONSUMED'] as const

// Meal types
export const MEAL_TYPES = {
  LUNCH: 'LUNCH',
  DINNER: 'DINNER'
} as const

// Meal plans
export const MEAL_PLANS = {
  DL: 'DL', // Lunch & Dinner
  L: 'L',   // Lunch Only
  D: 'D'    // Dinner Only
} as const

// Default values
export const DEFAULT_MEAL_PLAN = 'DL'
export const DEFAULT_REVENUE_PER_MEAL = 50

// Report colors (for charts and styling)
export const REPORT_COLORS = {
  primary: '#2E7D32',
  secondary: '#1976D2',
  success: '#388E3C',
  warning: '#F57C00',
  error: '#D32F2F',
  info: '#0288D1',
  lunch: '#2196F3',
  dinner: '#9C27B0',
  consumed: '#4CAF50',
  skipped: '#F44336',
  leave: '#FF9800',
  future: '#9E9E9E'
} as const

// Chart configuration
export const CHART_CONFIG = {
  defaultHeight: 300,
  defaultWidth: 400,
  fontSize: {
    title: 14,
    label: 12,
    legend: 10
  }
} as const

/**
 * Check if a status indicates meal consumption
 */
export function isConsumedStatus(status: string): boolean {
  const statusUpper = status.toUpperCase()
  return CONSUMED_STATUSES.includes(statusUpper as typeof CONSUMED_STATUSES[number])
}

/**
 * Get meals per day based on meal plan
 */
export function getMealsPerDay(mealPlan: string): number {
  const plan = mealPlan.toUpperCase()
  return plan === MEAL_PLANS.DL ? 2 : 1
}

/**
 * Check if current time is past meal cutoff
 */
export function isPastMealCutoff(mealType: string, currentHour: number): boolean {
  const type = mealType.toUpperCase()
  if (type === MEAL_TYPES.LUNCH) {
    return currentHour >= LUNCH_CUTOFF_HOUR
  }
  if (type === MEAL_TYPES.DINNER) {
    return currentHour >= DINNER_CUTOFF_HOUR
  }
  return false
}
