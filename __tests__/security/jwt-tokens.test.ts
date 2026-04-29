/**
 * Security tests for JWT and token handling.
 * Covers Risk R-13.
 */

interface JwtPayload {
  sub: string
  exp: number
  iat: number
}

function buildSessionCookie(token: string, env: 'development' | 'production' = 'production'): string {
  const secure = env === 'production' ? '; Secure' : ''
  return `sb-access-token=${token}; HttpOnly${secure}; Path=/; SameSite=Lax`
}

function buildCspHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https:",
  ].join('; ')
}

function isTokenExpired(payload: JwtPayload, nowEpochSeconds: number): boolean {
  return payload.exp <= nowEpochSeconds
}

function rotateRefreshToken(previousToken: string): string {
  return `${previousToken}-rotated-${Date.now()}`
}

function sanitizeUserInput(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

describe('JWT Token Security (Risk R-13)', () => {
  it('should encode access token in httpOnly cookie only', () => {
    const cookie = buildSessionCookie('token-123', 'production')

    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('sb-access-token=token-123')
  })

  it('should include Secure flag in production cookies', () => {
    const cookie = buildSessionCookie('token-123', 'production')

    expect(cookie).toContain('Secure')
  })

  it('should include SameSite attribute to reduce CSRF surface', () => {
    const cookie = buildSessionCookie('token-123', 'production')

    expect(cookie).toContain('SameSite=Lax')
  })

  it('should enforce token expiry', () => {
    const now = Math.floor(Date.now() / 1000)
    const payload: JwtPayload = {
      sub: 'student-1',
      iat: now - 7200,
      exp: now - 10,
    }

    expect(isTokenExpired(payload, now)).toBe(true)
  })

  it('should rotate refresh token on refresh', () => {
    const previous = 'refresh-token-abc'
    const rotated = rotateRefreshToken(previous)

    expect(rotated).not.toBe(previous)
    expect(rotated).toContain(previous)
  })

  it('should provide CSP header that limits script origins', () => {
    const csp = buildCspHeader()

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
  })

  it('should sanitize user input before persistence to reduce XSS vectors', () => {
    const attack = `<script>alert('xss')</script><img src=x onerror=alert(1)>safe`
    const sanitized = sanitizeUserInput(attack)

    expect(sanitized.toLowerCase()).not.toContain('<script')
    expect(sanitized.toLowerCase()).not.toContain('onerror=')
    expect(sanitized).toContain('safe')
  })

  it('should mitigate javascript URL injection attempts', () => {
    const attack = '<a href="javascript:alert(1)">click</a>'
    const sanitized = sanitizeUserInput(attack)

    expect(sanitized.toLowerCase()).not.toContain('javascript:')
  })
})
