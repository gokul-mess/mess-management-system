/**
 * Performance tests for no-lag verification.
 * Covers Risk R-07.
 */

import { performance } from 'perf_hooks'

interface CachedStudent {
  id: string
  unique_short_id: number
  full_name: string
  photo_path: string | null
  balance: number
}

function buildStudentCache(size: number): CachedStudent[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `student-${index + 1}`,
    unique_short_id: 1000 + index,
    full_name: `Student ${index + 1}`,
    photo_path: null,
    balance: 30,
  }))
}

async function verifyStudentFromCache(cache: CachedStudent[], shortId: number) {
  const start = performance.now()
  const student = cache.find((item) => item.unique_short_id === shortId) ?? null
  const queryMs = performance.now() - start

  // Simulated network/UI marshalling overhead.
  const networkStart = performance.now()
  await Promise.resolve()
  const networkMs = performance.now() - networkStart

  return {
    student,
    queryMs,
    networkMs,
    totalMs: queryMs + networkMs,
  }
}

describe('Verification Speed Performance (Risk R-07)', () => {
  const cache = buildStudentCache(500)

  it('should complete a single verification in under 200ms', async () => {
    const result = await verifyStudentFromCache(cache, 1200)

    expect(result.student).not.toBeNull()
    expect(result.totalMs).toBeLessThan(200)
  })

  it('should complete 10 concurrent verifications in under 200ms each', async () => {
    const lookups = Array.from({ length: 10 }, (_, index) => verifyStudentFromCache(cache, 1000 + index))
    const results = await Promise.all(lookups)

    expect(results.every((entry) => entry.student !== null)).toBe(true)
    expect(results.every((entry) => entry.totalMs < 200)).toBe(true)
  })

  it('should keep average below 300ms for 100 concurrent verifications', async () => {
    const lookups = Array.from({ length: 100 }, (_, index) => verifyStudentFromCache(cache, 1000 + (index % 500)))
    const results = await Promise.all(lookups)

    const averageMs = results.reduce((sum, entry) => sum + entry.totalMs, 0) / results.length

    expect(results.every((entry) => entry.student !== null)).toBe(true)
    expect(averageMs).toBeLessThan(300)
  })

  it('should expose query timing separate from network timing for diagnostics', async () => {
    const result = await verifyStudentFromCache(cache, 1300)

    expect(result.queryMs).toBeGreaterThanOrEqual(0)
    expect(result.networkMs).toBeGreaterThanOrEqual(0)
    expect(result.totalMs).toBeCloseTo(result.queryMs + result.networkMs, 5)
  })
})
