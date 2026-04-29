/**
 * Unit Tests for lib/query-keys.ts
 * Tests centralized query key factory for TanStack Query
 */

import { queryKeys } from '@/lib/query-keys'

describe('Query Keys', () => {
  describe('profile keys', () => {
    it('should have all key', () => {
      expect(queryKeys.profile.all).toEqual(['profile'])
    })

    it('should be an array', () => {
      expect(Array.isArray(queryKeys.profile.all)).toBe(true)
    })
  })

  describe('dailyLogs keys', () => {
    it('should have all key', () => {
      expect(queryKeys.dailyLogs.all).toEqual(['daily_logs'])
    })

    it('should generate byDate key', () => {
      const date = '2024-03-15'
      expect(queryKeys.dailyLogs.byDate(date)).toEqual(['daily_logs', '2024-03-15'])
    })

    it('should generate different keys for different dates', () => {
      const key1 = queryKeys.dailyLogs.byDate('2024-03-15')
      const key2 = queryKeys.dailyLogs.byDate('2024-03-16')
      expect(key1).not.toEqual(key2)
    })

    it('should be an array', () => {
      expect(Array.isArray(queryKeys.dailyLogs.all)).toBe(true)
    })
  })

  describe('allLogs keys', () => {
    it('should have all key', () => {
      expect(queryKeys.allLogs.all).toEqual(['all_logs'])
    })

    it('should generate byUser key', () => {
      const userId = 'user-123'
      expect(queryKeys.allLogs.byUser(userId)).toEqual(['all_logs', 'user-123'])
    })

    it('should generate different keys for different users', () => {
      const key1 = queryKeys.allLogs.byUser('user-123')
      const key2 = queryKeys.allLogs.byUser('user-456')
      expect(key1).not.toEqual(key2)
    })

    it('should be an array', () => {
      expect(Array.isArray(queryKeys.allLogs.all)).toBe(true)
    })
  })

  describe('balanceDays keys', () => {
    it('should have all key', () => {
      expect(queryKeys.balanceDays.all).toEqual(['balance_days'])
    })

    it('should generate byUser key', () => {
      const userId = 'user-123'
      expect(queryKeys.balanceDays.byUser(userId)).toEqual(['balance_days', 'user-123'])
    })

    it('should generate different keys for different users', () => {
      const key1 = queryKeys.balanceDays.byUser('user-123')
      const key2 = queryKeys.balanceDays.byUser('user-456')
      expect(key1).not.toEqual(key2)
    })

    it('should be an array', () => {
      expect(Array.isArray(queryKeys.balanceDays.all)).toBe(true)
    })
  })

  describe('hierarchical structure', () => {
    it('should support invalidation by entity', () => {
      // All daily logs queries start with ['daily_logs']
      const allKey = queryKeys.dailyLogs.all
      const dateKey = queryKeys.dailyLogs.byDate('2024-03-15')
      
      expect(dateKey[0]).toBe(allKey[0])
    })

    it('should support specific query invalidation', () => {
      const key1 = queryKeys.dailyLogs.byDate('2024-03-15')
      const key2 = queryKeys.dailyLogs.byDate('2024-03-16')
      
      // Keys should be different for specific invalidation
      expect(key1).not.toEqual(key2)
    })

    it('should have consistent structure across entities', () => {
      // All entities should have an 'all' key
      expect(queryKeys.profile.all).toBeDefined()
      expect(queryKeys.dailyLogs.all).toBeDefined()
      expect(queryKeys.allLogs.all).toBeDefined()
      expect(queryKeys.balanceDays.all).toBeDefined()
    })
  })

  describe('type safety', () => {
    it('should return const tuples', () => {
      const key = queryKeys.dailyLogs.byDate('2024-03-15')
      // TypeScript ensures this is readonly, we verify it's an array
      expect(Array.isArray(key)).toBe(true)
    })

    it('should maintain parameter types', () => {
      // These should compile without errors
      queryKeys.dailyLogs.byDate('2024-03-15')
      queryKeys.allLogs.byUser('user-123')
      queryKeys.balanceDays.byUser('user-456')
    })
  })
})
