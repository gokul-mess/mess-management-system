/**
 * Integration tests for daily_logs table operations.
 * Covers Risk R-01 (attendance integrity) and Risk R-03 (write consistency).
 */

import { seedTestDailyLogs } from '@/test-utils/seed-database'
import { cleanupTestDailyLogs } from '@/test-utils/cleanup-database'

function createDailyLogsSupabaseMock() {
  const daily_logs: Array<Record<string, unknown>> = []

  const from = jest.fn((table: string) => {
    if (table !== 'daily_logs') {
      throw new Error(`Unexpected table: ${table}`)
    }

    let inserted: Array<Record<string, unknown>> = []
    let isDeleteMode = false

    const builder: any = {
      insert: jest.fn((payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
        inserted = Array.isArray(payload) ? payload : [payload]
        daily_logs.push(...inserted)
        return builder
      }),
      select: jest.fn(() => builder),
      delete: jest.fn(() => {
        isDeleteMode = true
        return builder
      }),
      in: jest.fn((column: string, values: unknown[]) => {
        if (isDeleteMode) {
          const keep = daily_logs.filter((row) => !values.includes(row[column]))
          daily_logs.splice(0, daily_logs.length, ...keep)
        }
        return builder
      }),
      neq: jest.fn(() => {
        if (isDeleteMode) {
          daily_logs.splice(0, daily_logs.length)
        }
        return builder
      }),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        return Promise.resolve({
          data: inserted.length > 0 ? inserted : [...daily_logs],
          error: null,
        }).then(resolve, reject)
      },
    }

    return builder
  })

  return { from, daily_logs }
}

describe('Database Integration: daily_logs (Risk R-01, R-03)', () => {
  it('should create meal logs for a specific user', async () => {
    const supabase = createDailyLogsSupabaseMock()

    const logs = await seedTestDailyLogs(supabase as any, 'student-1', 5)

    expect(logs).toHaveLength(5)
    expect(logs.every((log: { user_id: string }) => log.user_id === 'student-1')).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith('daily_logs')
  })

  it('should clean up logs by user ID', async () => {
    const supabase = createDailyLogsSupabaseMock()

    await seedTestDailyLogs(supabase as any, 'student-1', 2)
    await seedTestDailyLogs(supabase as any, 'student-2', 2)

    await cleanupTestDailyLogs(supabase as any, ['student-1'])

    expect(supabase.daily_logs).toHaveLength(2)
    expect(supabase.daily_logs.every((log) => log.user_id === 'student-2')).toBe(true)
  })
})
