/**
 * Mock User Profile Factory
 * 
 * Creates realistic test data for user profiles with sensible defaults
 * and support for partial overrides.
 */

import type { UserProfile } from '@/types'

let mockIdCounter = 1000

/**
 * Generate a unique short ID for testing
 */
function generateUniqueShortId(): number {
  return mockIdCounter++
}

/**
 * Create a mock user profile with optional overrides
 * 
 * @param overrides - Partial user profile to override defaults
 * @returns Complete UserProfile object
 * 
 * @example
 * // Create a student with defaults
 * const student = createMockUser()
 * 
 * @example
 * // Create an owner
 * const owner = createMockUser({ role: 'OWNER', full_name: 'John Doe' })
 * 
 * @example
 * // Create a student with specific meal plan
 * const student = createMockUser({ meal_plan: 'L', unique_short_id: 1234 })
 */
export function createMockUser(overrides?: Partial<UserProfile>): UserProfile {
  const id = overrides?.id || `user-${Math.random().toString(36).substring(7)}`
  const uniqueShortId = overrides?.unique_short_id || generateUniqueShortId()
  
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  return {
    id,
    full_name: `Test Student ${uniqueShortId}`,
    unique_short_id: uniqueShortId,
    photo_path: null,
    phone: `+919876${String(uniqueShortId).padStart(6, '0')}`,
    address: `Test Address ${uniqueShortId}`,
    meal_plan: 'DL',
    role: 'STUDENT',
    is_active: true,
    subscription_start_date: startOfMonth.toISOString().split('T')[0],
    subscription_end_date: endOfMonth.toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create multiple mock users
 * 
 * @param count - Number of users to create
 * @param overrides - Partial user profile to apply to all users
 * @returns Array of UserProfile objects
 * 
 * @example
 * // Create 10 students
 * const students = createMockUsers(10)
 * 
 * @example
 * // Create 5 inactive students
 * const inactiveStudents = createMockUsers(5, { is_active: false })
 */
export function createMockUsers(
  count: number,
  overrides?: Partial<UserProfile>
): UserProfile[] {
  return Array.from({ length: count }, () => createMockUser(overrides))
}

/**
 * Create a mock owner user
 * 
 * @param overrides - Partial user profile to override defaults
 * @returns UserProfile object with OWNER role
 */
export function createMockOwner(overrides?: Partial<UserProfile>): UserProfile {
  return createMockUser({
    role: 'OWNER',
    full_name: 'Mess Owner',
    meal_plan: undefined,
    subscription_start_date: undefined,
    subscription_end_date: undefined,
    ...overrides,
  })
}

/**
 * Reset the mock ID counter (useful for test isolation)
 */
export function resetMockIdCounter(): void {
  mockIdCounter = 1000
}
