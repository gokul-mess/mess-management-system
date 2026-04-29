/**
 * Unit Tests for lib/auth.ts
 * Tests authentication helper functions (Risk R-01, R-13)
 */

import {
  getUser,
  getUserProfile,
  requireAuth,
  requireRole,
  requireGuest
} from '@/lib/auth'
import { createMockUser } from '@/__mocks__/user-profile'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  })
}))

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

describe('Auth Utils (Risk R-01, R-13)', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn()
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  describe('getUser', () => {
    it('should validate user session correctly (Risk R-01)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated'
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await getUser()

      expect(result).toEqual(mockUser)
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })

    it('should handle missing session', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await getUser()

      expect(result).toBeNull()
    })

    it('should handle expired session (Risk R-13)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      })

      const result = await getUser()

      expect(result).toBeNull()
    })
  })

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockProfile = createMockUser({
        id: 'user-123',
        role: 'STUDENT'
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const result = await getUserProfile()

      expect(result).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
    })

    it('should return null when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await getUserProfile()

      expect(result).toBeNull()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should return null when profile not found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      })

      const result = await getUserProfile()

      expect(result).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('should return user when authenticated (Risk R-01)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const result = await requireAuth()

      expect(result).toEqual(mockUser)
      expect(redirect).not.toHaveBeenCalled()
    })

    it('should redirect to login when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      await expect(requireAuth()).rejects.toThrow('REDIRECT:/login')
      expect(redirect).toHaveBeenCalledWith('/login')
    })

    it('should redirect to login when session expired (Risk R-13)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      })

      await expect(requireAuth()).rejects.toThrow('REDIRECT:/login')
      expect(redirect).toHaveBeenCalledWith('/login')
    })
  })

  describe('requireRole', () => {
    it('should check user role correctly (Risk R-01)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'owner@example.com'
      }

      const mockProfile = createMockUser({
        id: 'user-123',
        role: 'OWNER'
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const result = await requireRole('OWNER')

      expect(result).toEqual(mockProfile)
      expect(redirect).not.toHaveBeenCalled()
    })

    it('should redirect STUDENT to /student when accessing OWNER route', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'student@example.com'
      }

      const mockProfile = createMockUser({
        id: 'user-123',
        role: 'STUDENT'
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      await expect(requireRole('OWNER')).rejects.toThrow('REDIRECT:/student')
      expect(redirect).toHaveBeenCalledWith('/student')
    })

    it('should redirect OWNER to /owner when accessing STUDENT route', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'owner@example.com'
      }

      const mockProfile = createMockUser({
        id: 'user-123',
        role: 'OWNER'
      })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      await expect(requireRole('STUDENT')).rejects.toThrow('REDIRECT:/owner')
      expect(redirect).toHaveBeenCalledWith('/owner')
    })

    it('should redirect to login when profile not found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      })

      await expect(requireRole('OWNER')).rejects.toThrow('REDIRECT:/login')
      expect(redirect).toHaveBeenCalledWith('/login')
    })

    it('should redirect to login when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      await expect(requireRole('OWNER')).rejects.toThrow('REDIRECT:/login')
      expect(redirect).toHaveBeenCalledWith('/login')
    })
  })

  describe('requireGuest', () => {
    it('should allow access when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      await requireGuest()

      expect(redirect).not.toHaveBeenCalled()
    })

    it('should redirect to home when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      await expect(requireGuest()).rejects.toThrow('REDIRECT:/')
      expect(redirect).toHaveBeenCalledWith('/')
    })
  })

  describe('JWT Token Security (Risk R-13)', () => {
    it('should handle JWT token compromise scenarios', async () => {
      // Test expired token
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired', code: 'jwt_expired' }
      })

      const result = await getUser()
      expect(result).toBeNull()
    })

    it('should handle invalid JWT token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT', code: 'invalid_jwt' }
      })

      const result = await getUser()
      expect(result).toBeNull()
    })

    it('should handle malformed JWT token', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Malformed JWT', code: 'malformed_jwt' }
      })

      const result = await getUser()
      expect(result).toBeNull()
    })
  })

  describe('Role-Based Access Control (Risk R-01)', () => {
    it('should enforce OWNER role access', async () => {
      const mockUser = { id: 'user-123', email: 'owner@example.com' }
      const mockProfile = createMockUser({ id: 'user-123', role: 'OWNER' })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const result = await requireRole('OWNER')
      expect(result.role).toBe('OWNER')
    })

    it('should enforce STUDENT role access', async () => {
      const mockUser = { id: 'user-123', email: 'student@example.com' }
      const mockProfile = createMockUser({ id: 'user-123', role: 'STUDENT' })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      const result = await requireRole('STUDENT')
      expect(result.role).toBe('STUDENT')
    })

    it('should prevent cross-role access', async () => {
      const mockUser = { id: 'user-123', email: 'student@example.com' }
      const mockProfile = createMockUser({ id: 'user-123', role: 'STUDENT' })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })

      // Student trying to access OWNER route should be redirected
      await expect(requireRole('OWNER')).rejects.toThrow('REDIRECT:/student')
    })
  })
})
