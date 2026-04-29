/**
 * Integration tests for mess_periods table operations.
 * Covers Risk R-09 (subscription range correctness) and Risk R-12 (date handling).
 */

import { seedTestMessPeriods } from '@/test-utils/seed-database'
import { cleanupTestMessPeriods } from '@/test-utils/cleanup-database'

function createMessPeriodsSupabaseMock() {
  const mess_periods: Array<Record<string, unknown>> = []

  const from = jest.fn((table: string) => {
    if (table !== 'mess_periods') {
      throw new Error(`Unexpected table: ${table}`)
    }

    let inserted: Array<Record<string, unknown>> = []
    let isDeleteMode = false

    const builder: any = {
      insert: jest.fn((payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
        inserted = Array.isArray(payload) ? payload : [payload]
        mess_periods.push(...inserted)
        return builder
      }),
      select: jest.fn(() => builder),
      delete: jest.fn(() => {
        isDeleteMode = true
        return builder
      }),
      in: jest.fn((column: string, values: unknown[]) => {
        if (isDeleteMode) {
          const keep = mess_periods.filter((row) => !values.includes(row[column]))
          mess_periods.splice(0, mess_periods.length, ...keep)
        }
        return builder
      }),
      neq: jest.fn(() => {
        if (isDeleteMode) {
          mess_periods.splice(0, mess_periods.length)
        }
        return builder
      }),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        return Promise.resolve({
          data: inserted.length > 0 ? inserted : [...mess_periods],
          error: null,
        }).then(resolve, reject)
      },
    }

    return builder
  })

  return { from, mess_periods }
}

describe('Database Integration: mess_periods (Risk R-09, R-12)', () => {
  it('should create active and historical mess periods for a user', async () => {
    const supabase = createMessPeriodsSupabaseMock()

    const periods = await seedTestMessPeriods(supabase as any, 'student-1', 2)

    expect(periods).toHaveLength(2)
    expect(periods[0].is_active).toBe(true)
    expect(periods[1].is_active).toBe(false)
    expect(periods.every((period: { user_id: string }) => period.user_id === 'student-1')).toBe(true)
  })

  it('should clean up mess periods by user ID', async () => {
    const supabase = createMessPeriodsSupabaseMock()

    await seedTestMessPeriods(supabase as any, 'student-1', 1)
    await seedTestMessPeriods(supabase as any, 'student-2', 1)

    await cleanupTestMessPeriods(supabase as any, ['student-1'])

    expect(supabase.mess_periods).toHaveLength(1)
    expect(supabase.mess_periods[0].user_id).toBe('student-2')
  })
})
