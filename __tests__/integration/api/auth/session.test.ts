/**
 * Integration tests for auth session middleware.
 * Covers Risk R-01 (route access control) and Risk R-13 (session handling).
 */

const mockCreateServerClient = jest.fn()
const mockNext = jest.fn()
const mockRedirect = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    next: (...args: unknown[]) => mockNext(...args),
    redirect: (...args: unknown[]) => mockRedirect(...args),
  },
}))

import { updateSession } from '@/utils/supabase/middleware'

function createMockRequest(pathname: string) {
  const base = new URL(`http://localhost${pathname}`)
  const nextUrl = Object.assign(new URL(base.toString()), {
    clone: () => new URL(base.toString()),
  })

  return {
    url: base.toString(),
    nextUrl,
    cookies: {
      getAll: jest.fn(() => []),
      set: jest.fn(),
    },
  } as any
}

describe('updateSession Middleware Integration (Risk R-01, R-13)', () => {
  const getUser = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockNext.mockImplementation(({ request }: { request?: unknown } = {}) => ({
      type: 'next',
      request,
      cookies: {
        set: jest.fn(),
      },
    }))

    mockRedirect.mockImplementation((url: URL) => ({
      type: 'redirect',
      url: url.toString(),
    }))

    getUser.mockResolvedValue({ data: { user: null } })

    mockCreateServerClient.mockReturnValue({
      auth: {
        getUser,
      },
    })
  })

  it('should redirect unauthenticated users from protected routes to /login', async () => {
    const request = createMockRequest('/owner')

    const result = await updateSession(request)

    expect(mockRedirect).toHaveBeenCalledTimes(1)

    const redirectUrl = mockRedirect.mock.calls[0][0] as URL
    expect(redirectUrl.pathname).toBe('/login')
    expect(redirectUrl.searchParams.get('redirectTo')).toBe('/owner')
    expect(result.type).toBe('redirect')
  })

  it('should allow unauthenticated users on public routes', async () => {
    const request = createMockRequest('/login')

    const result = await updateSession(request)

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(result.type).toBe('next')
  })

  it('should redirect authenticated users away from /login to /', async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: 'owner-1', email: 'owner@example.com' },
      },
    })

    const request = createMockRequest('/login')
    const result = await updateSession(request)

    expect(mockRedirect).toHaveBeenCalledTimes(1)
    const redirectTarget = mockRedirect.mock.calls[0][0] as URL
    expect(redirectTarget.pathname).toBe('/')
    expect(result.type).toBe('redirect')
  })

  it('should allow authenticated users to access protected routes', async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: 'student-1', email: 'student@example.com' },
      },
    })

    const request = createMockRequest('/student')
    const result = await updateSession(request)

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(result.type).toBe('next')
  })
})
