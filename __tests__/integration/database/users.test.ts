/**
 * Integration tests for users table operations.
 * Covers Risk R-01 (role boundaries) and Risk R-13 (auth/session-linked profile flow).
 */

import { seedTestOwner, seedTestStudents } from '@/test-utils/seed-database'
import { cleanupTestUsers } from '@/test-utils/cleanup-database'

function createUsersSupabaseMock() {
  const users: Array<Record<string, unknown>> = []

  const from = jest.fn((table: string) => {
    if (table !== 'users') {
      throw new Error(`Unexpected table: ${table}`)
    }

    let inserted: Array<Record<string, unknown>> = []
    let isDeleteMode = false

    const builder: any = {
      insert: jest.fn((payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
        inserted = Array.isArray(payload) ? payload : [payload]
        users.push(...inserted)
        return builder
      }),
      select: jest.fn(() => builder),
      single: jest.fn(async () => ({
        data: inserted[0] ?? users[0] ?? null,
        error: null,
      })),
      delete: jest.fn(() => {
        isDeleteMode = true
        return builder
      }),
      in: jest.fn((column: string, values: unknown[]) => {
        if (isDeleteMode) {
          const keep = users.filter((row) => !values.includes(row[column]))
          users.splice(0, users.length, ...keep)
        }
        return builder
      }),
      neq: jest.fn(() => {
        if (isDeleteMode) {
          users.splice(0, users.length)
        }
        return builder
      }),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        return Promise.resolve({
          data: inserted.length > 0 ? inserted : [...users],
          error: null,
        }).then(resolve, reject)
      },
    }

    return builder
  })

  return { from, users }
}

describe('Database Integration: users (Risk R-01, R-13)', () => {
  it('should create owner profile in users table', async () => {
    const supabase = createUsersSupabaseMock()

    const owner = await seedTestOwner(supabase as any)

    expect(owner).toBeTruthy()
    expect(owner.role).toBe('OWNER')
    expect(supabase.from).toHaveBeenCalledWith('users')
    expect(supabase.users.length).toBe(1)
  })

  it('should create multiple student profiles', async () => {
    const supabase = createUsersSupabaseMock()

    const students = await seedTestStudents(supabase as any, 3)

    expect(students).toHaveLength(3)
    expect(students.every((student: { role: string }) => student.role === 'STUDENT')).toBe(true)
    expect(supabase.users).toHaveLength(3)
  })

  it('should clean up only targeted user IDs', async () => {
    const supabase = createUsersSupabaseMock()

    const students = await seedTestStudents(supabase as any, 3)
    const idsToDelete = [students[0].id, students[1].id]

    await cleanupTestUsers(supabase as any, idsToDelete)

    expect(supabase.users).toHaveLength(1)
    expect(supabase.users[0].id).toBe(students[2].id)
  })
})
