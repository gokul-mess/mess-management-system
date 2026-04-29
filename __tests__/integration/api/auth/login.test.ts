/**
 * Integration tests for auth actions.
 * Covers Risk R-01 (auth access control) and Risk R-13 (session/token flow).
 */

import { signInWithGoogle, signOut } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

describe('Auth Actions Integration (Risk R-01, R-13)', () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL

  const mockSupabase = {
    auth: {
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_URL
    } else {
      process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl
    }
  })

  it('should initiate Google OAuth and redirect using request origin', async () => {
    ;(headers as jest.Mock).mockResolvedValue({
      get: jest.fn((name: string) => (name === 'origin' ? 'http://localhost:3000' : null)),
    })
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/mock-auth' },
    })

    await expect(signInWithGoogle()).rejects.toThrow('REDIRECT:https://accounts.google.com/mock-auth')

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
      },
    })
  })

  it('should use NEXT_PUBLIC_BASE_URL when request origin is unavailable', async () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://gmms.example.com'

    ;(headers as jest.Mock).mockResolvedValue({
      get: jest.fn(() => null),
    })
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/mock-auth' },
    })

    await expect(signInWithGoogle()).rejects.toThrow('REDIRECT:https://accounts.google.com/mock-auth')

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://gmms.example.com/auth/callback',
      },
    })
  })

  it('should not redirect when OAuth provider returns no URL', async () => {
    ;(headers as jest.Mock).mockResolvedValue({
      get: jest.fn(() => 'http://localhost:3000'),
    })
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: null },
    })

    await expect(signInWithGoogle()).resolves.toBeUndefined()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('should sign out and redirect to login', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    await expect(signOut()).rejects.toThrow('REDIRECT:/login')

    expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1)
    expect(redirect).toHaveBeenCalledWith('/login')
  })
})
