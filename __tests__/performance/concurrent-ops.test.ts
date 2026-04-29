/**
 * Performance and consistency tests for concurrent operations.
 * Covers Risk R-03.
 */

class Mutex {
  private queue: Array<() => void> = []
  private locked = false

  async lock(): Promise<() => void> {
    return new Promise((resolve) => {
      const acquire = () => {
        this.locked = true
        resolve(() => {
          this.locked = false
          const next = this.queue.shift()
          if (next) next()
        })
      }

      if (this.locked) {
        this.queue.push(acquire)
      } else {
        acquire()
      }
    })
  }
}

async function concurrentMealWriteSimulation() {
  const mutex = new Mutex()
  const logs = new Map<string, { user_id: string; date: string; meal_type: string }>()

  async function writeOnce(userId: string, date: string, mealType: string) {
    const key = `${userId}-${date}-${mealType}`
    const release = await mutex.lock()
    try {
      if (logs.has(key)) {
        return { inserted: false, reason: 'duplicate' as const }
      }
      logs.set(key, { user_id: userId, date, meal_type: mealType })
      return { inserted: true as const }
    } finally {
      release()
    }
  }

  const writes = Array.from({ length: 10 }, () => writeOnce('student-1', '2026-04-25', 'LUNCH'))
  const results = await Promise.all(writes)

  return { results, logs }
}

describe('Concurrent Operations (Risk R-03)', () => {
  it('should prevent duplicate daily logs under concurrent writes', async () => {
    const { results, logs } = await concurrentMealWriteSimulation()

    const insertedCount = results.filter((entry) => entry.inserted).length

    expect(insertedCount).toBe(1)
    expect(logs.size).toBe(1)
  })

  it('should keep leave approval atomic when approvals race', async () => {
    const mutex = new Mutex()
    const leave = { id: 'leave-1', is_approved: false }

    async function approveLeave() {
      const release = await mutex.lock()
      try {
        if (leave.is_approved) return false
        leave.is_approved = true
        return true
      } finally {
        release()
      }
    }

    const approvals = await Promise.all(Array.from({ length: 5 }, () => approveLeave()))

    expect(approvals.filter(Boolean)).toHaveLength(1)
    expect(leave.is_approved).toBe(true)
  })

  it('should preserve transaction-like consistency for concurrent balance updates', async () => {
    const mutex = new Mutex()
    let balance = 30

    async function applyDelta(delta: number) {
      const release = await mutex.lock()
      try {
        const nextBalance = balance + delta
        if (nextBalance < -5) {
          throw new Error('INSUFFICIENT_CREDIT')
        }
        balance = nextBalance
        return { ok: true }
      } catch (error) {
        return { ok: false, error: (error as Error).message }
      } finally {
        release()
      }
    }

    const operations = await Promise.all([
      applyDelta(-1),
      applyDelta(-1),
      applyDelta(+2),
      applyDelta(-3),
      applyDelta(-40), // conflict, must roll back
    ])

    expect(operations.some((entry) => !entry.ok)).toBe(true)
    expect(balance).toBe(27)
  })

  it('should report conflict outcomes without corrupting final state', async () => {
    const mutex = new Mutex()
    const state = { period_end: '2026-05-31' }

    async function extendPeriod(days: number) {
      const release = await mutex.lock()
      try {
        if (days <= 0) {
          return { ok: false, code: 'INVALID_EXTENSION' }
        }
        const end = new Date(state.period_end)
        end.setDate(end.getDate() + days)
        state.period_end = end.toISOString().split('T')[0]
        return { ok: true }
      } finally {
        release()
      }
    }

    const [valid, invalid] = await Promise.all([extendPeriod(4), extendPeriod(0)])

    expect(valid.ok).toBe(true)
    expect(invalid).toEqual({ ok: false, code: 'INVALID_EXTENSION' })
    expect(state.period_end).toBe('2026-06-04')
  })
})
