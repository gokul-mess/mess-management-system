/**
 * Authentication Helper Utilities for Testing
 * 
 * Provides utilities for mocking authentication context in tests.
 */

import type { UserProfile } from '@/types'

/**
 * Create a mock authenticated user session
 * 
 * @param user - User profile data
 * @returns Mock session object
 * 
 * @example
 * const session = createMockSession({ 
 *   id: 'user-123', 
 *   role: 'STUDENT' 
 * })
 */
export function createMockSession(user: Partial<UserProfile>) {
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: {
      id: user.id || 'mock-user-id',
      email: `${user.id || 'test'}@example.com`,
      role: user.role || 'STUDENT',
      app_metadata: {
        provider: 'google',
      },
      user_metadata: {
        full_name: user.full_name || 'Test User',
        avatar_url: user.photo_path || null,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  }
}

/**
 * Create a mock authenticated student user
 * 
 * @param overrides - Optional user profile overrides
 * @returns Mock session object for student
 * 
 * @example
 * const studentSession = createMockStudentSession({ 
 *   unique_short_id: 1234 
 * })
 */
export function createMockStudentSession(overrides?: Partial<UserProfile>) {
  return createMockSession({
    id: 'student-123',
    role: 'STUDENT',
    full_name: 'Test Student',
    unique_short_id: 1234,
    ...overrides,
  })
}

/**
 * Create a mock authenticated owner user
 * 
 * @param overrides - Optional user profile overrides
 * @returns Mock session object for owner
 * 
 * @example
 * const ownerSession = createMockOwnerSession({ 
 *   full_name: 'Mess Owner' 
 * })
 */
export function createMockOwnerSession(overrides?: Partial<UserProfile>) {
  return createMockSession({
    id: 'owner-123',
    role: 'OWNER',
    full_name: 'Test Owner',
    ...overrides,
  })
}

/**
 * Create a mock unauthenticated session (null)
 * 
 * @returns Null session
 * 
 * @example
 * const noSession = createMockUnauthenticatedSession()
 * // Returns: null
 */
export function createMockUnauthenticatedSession() {
  return null
}

/**
 * Mock the Supabase auth context for a component test
 * 
 * @param session - Mock session object
 * @returns Cleanup function
 * 
 * @example
 * // In a test
 * const cleanup = mockAuthContext(createMockStudentSession())
 * // ... render component ...
 * cleanup() // Restore original context
 */
export function mockAuthContext(session: any): () => void {
  // Mock the auth context
  jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(() => ({
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session },
          error: null,
        }),
        getUser: jest.fn().mockResolvedValue({
          data: { user: session?.user || null },
          error: null,
        }),
      },
    })),
  }))
  
  // Return cleanup function
  return () => {
    jest.clearAllMocks()
  }
}

/**
 * Create mock JWT token payload
 * 
 * @param userId - User ID
 * @param role - User role
 * @returns Mock JWT payload
 * 
 * @example
 * const payload = createMockJWTPayload('user-123', 'STUDENT')
 */
export function createMockJWTPayload(userId: string, role: string) {
  return {
    sub: userId,
    role,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
    iat: Math.floor(Date.now() / 1000),
    email: `${userId}@example.com`,
  }
}

/**
 * Create mock expired JWT token payload
 * 
 * @param userId - User ID
 * @param role - User role
 * @returns Mock expired JWT payload
 * 
 * @example
 * const expiredPayload = createMockExpiredJWTPayload('user-123', 'STUDENT')
 */
export function createMockExpiredJWTPayload(userId: string, role: string) {
  return {
    sub: userId,
    role,
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    iat: Math.floor(Date.now() / 1000) - 7200, // Issued 2 hours ago
    email: `${userId}@example.com`,
  }
}

/**
 * Check if a user has a specific role
 * 
 * @param session - Mock session object
 * @param role - Role to check
 * @returns True if user has the role
 * 
 * @example
 * const isOwner = hasRole(session, 'OWNER')
 */
export function hasRole(session: any, role: string): boolean {
  return session?.user?.role === role
}

/**
 * Check if a session is authenticated
 * 
 * @param session - Mock session object
 * @returns True if session is authenticated
 * 
 * @example
 * const isAuth = isAuthenticated(session)
 */
export function isAuthenticated(session: any): boolean {
  return session !== null && session.user !== null
}
