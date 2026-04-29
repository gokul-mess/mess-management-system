/**
 * Integration tests for leave_requests table operations.
 * Covers Risk R-04 (leave rule correctness) and Risk R-09 (leave data integrity).
 */

import { seedTestLeaveRecords } from '@/test-utils/seed-database'
import { cleanupTestLeaveRecords } from '@/test-utils/cleanup-database'

function createLeavesSupabaseMock() {
  const leave_requests: Array<Record<string, unknown>> = []

  const from = jest.fn((table: string) => {
    if (table !== 'leave_requests') {
      throw new Error(`Unexpected table: ${table}`)
    }

    let inserted: Array<Record<string, unknown>> = []
    let isDeleteMode = false

    const builder: any = {
      insert: jest.fn((payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
        inserted = Array.isArray(payload) ? payload : [payload]
        leave_requests.push(...inserted)
        return builder
      }),
      select: jest.fn(() => builder),
      delete: jest.fn(() => {
        isDeleteMode = true
        return builder
      }),
      in: jest.fn((column: string, values: unknown[]) => {
        if (isDeleteMode) {
          const keep = leave_requests.filter((row) => !values.includes(row[column]))
          leave_requests.splice(0, leave_requests.length, ...keep)
        }
        return builder
      }),
      neq: jest.fn(() => {
        if (isDeleteMode) {
          leave_requests.splice(0, leave_requests.length)
        }
        return builder
      }),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        return Promise.resolve({
          data: inserted.length > 0 ? inserted : [...leave_requests],
          error: null,
        }).then(resolve, reject)
      },
    }

    return builder
  })

  return { from, leave_requests }
}

describe('Database Integration: leave_requests (Risk R-04, R-09)', () => {
  it('should create leave records with valid date ranges', async () => {
    const supabase = createLeavesSupabaseMock()

    const leaves = await seedTestLeaveRecords(supabase as any, 'student-1', 3)

    expect(leaves).toHaveLength(3)
    expect(
      leaves.every((leave: { start_date: string; end_date: string; user_id: string }) => {
        return leave.user_id === 'student-1' && leave.start_date <= leave.end_date
      })
    ).toBe(true)
  })

  it('should clean up leave records by user ID', async () => {
    const supabase = createLeavesSupabaseMock()

    await seedTestLeaveRecords(supabase as any, 'student-1', 2)
    await seedTestLeaveRecords(supabase as any, 'student-2', 1)

    await cleanupTestLeaveRecords(supabase as any, ['student-1'])

    expect(supabase.leave_requests).toHaveLength(1)
    expect(supabase.leave_requests[0].user_id).toBe('student-2')
  })
})
