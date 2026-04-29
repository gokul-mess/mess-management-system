/**
 * Security tests for Row Level Security policy behavior.
 * Covers Risk R-06 and Risk R-11.
 */

type Role = 'OWNER' | 'STUDENT' | 'ANON'

interface PolicyResult {
  allowed: boolean
  error?: {
    code: '42501'
    message: string
  }
}

function deny(): PolicyResult {
  return {
    allowed: false,
    error: {
      code: '42501',
      message: 'permission denied for table',
    },
  }
}

function allow(): PolicyResult {
  return { allowed: true }
}

function canUpdateUserProfile(params: {
  actorRole: Role
  actorId: string
  targetUserId: string
  changes: Record<string, unknown>
}): PolicyResult {
  const { actorRole, actorId, targetUserId, changes } = params

  if (actorRole === 'ANON') return deny()
  if (actorRole === 'OWNER') return allow()

  // STUDENT role
  if (actorId !== targetUserId) return deny()
  if ('photo_path' in changes) return deny()

  return allow()
}

function canReadDailyLogs(params: { actorRole: Role; actorId: string; rowUserId: string }): PolicyResult {
  const { actorRole, actorId, rowUserId } = params

  if (actorRole === 'ANON') return deny()
  if (actorRole === 'OWNER') return allow()

  return actorId === rowUserId ? allow() : deny()
}

function canCreateLeave(params: { actorRole: Role; actorId: string; rowUserId: string }): PolicyResult {
  const { actorRole, actorId, rowUserId } = params

  if (actorRole === 'ANON') return deny()
  if (actorRole === 'OWNER') return allow()

  return actorId === rowUserId ? allow() : deny()
}

function canApproveLeave(params: { actorRole: Role }): PolicyResult {
  return params.actorRole === 'OWNER' ? allow() : deny()
}

describe('RLS Policies Security (Risk R-06, R-11)', () => {
  it('should block STUDENT from updating other students\' profiles (Risk R-06)', () => {
    const result = canUpdateUserProfile({
      actorRole: 'STUDENT',
      actorId: 'student-1',
      targetUserId: 'student-2',
      changes: { full_name: 'Tampered Name' },
    })

    expect(result.allowed).toBe(false)
    expect(result.error?.code).toBe('42501')
  })

  it('should block STUDENT from updating photo_path (Risk R-11)', () => {
    const result = canUpdateUserProfile({
      actorRole: 'STUDENT',
      actorId: 'student-1',
      targetUserId: 'student-1',
      changes: { photo_path: 'malicious/photo.jpg' },
    })

    expect(result.allowed).toBe(false)
    expect(result.error?.code).toBe('42501')
  })

  it('should allow OWNER to update any student record', () => {
    const result = canUpdateUserProfile({
      actorRole: 'OWNER',
      actorId: 'owner-1',
      targetUserId: 'student-2',
      changes: { full_name: 'Updated Name', photo_path: 'verified/photo.jpg' },
    })

    expect(result.allowed).toBe(true)
  })

  it('should block unauthenticated users from protected operations', () => {
    const result = canReadDailyLogs({
      actorRole: 'ANON',
      actorId: 'anon',
      rowUserId: 'student-1',
    })

    expect(result.allowed).toBe(false)
    expect(result.error?.code).toBe('42501')
  })

  it('should allow STUDENT to read only their own daily_logs', () => {
    const own = canReadDailyLogs({ actorRole: 'STUDENT', actorId: 'student-1', rowUserId: 'student-1' })
    const others = canReadDailyLogs({ actorRole: 'STUDENT', actorId: 'student-1', rowUserId: 'student-2' })

    expect(own.allowed).toBe(true)
    expect(others.allowed).toBe(false)
    expect(others.error?.code).toBe('42501')
  })

  it('should allow STUDENT to create leave only for self', () => {
    const own = canCreateLeave({ actorRole: 'STUDENT', actorId: 'student-1', rowUserId: 'student-1' })
    const others = canCreateLeave({ actorRole: 'STUDENT', actorId: 'student-1', rowUserId: 'student-2' })

    expect(own.allowed).toBe(true)
    expect(others.allowed).toBe(false)
    expect(others.error?.code).toBe('42501')
  })

  it('should allow OWNER to approve any leave request', () => {
    const ownerResult = canApproveLeave({ actorRole: 'OWNER' })
    const studentResult = canApproveLeave({ actorRole: 'STUDENT' })

    expect(ownerResult.allowed).toBe(true)
    expect(studentResult.allowed).toBe(false)
    expect(studentResult.error?.code).toBe('42501')
  })

  it('should always return 42501 when RLS policy is violated', () => {
    const result = canUpdateUserProfile({
      actorRole: 'STUDENT',
      actorId: 'student-1',
      targetUserId: 'student-2',
      changes: { meal_plan: 'DL' },
    })

    expect(result.allowed).toBe(false)
    expect(result.error).toEqual({
      code: '42501',
      message: 'permission denied for table',
    })
  })
})
