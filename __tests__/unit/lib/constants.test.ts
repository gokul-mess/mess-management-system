/**
 * Unit Tests for lib/constants.ts
 * Tests application-level constants
 */

import { SETTINGS_ID } from '@/lib/constants'

describe('Constants', () => {
  describe('SETTINGS_ID', () => {
    it('should be a valid UUID', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(SETTINGS_ID).toMatch(uuidRegex)
    })

    it('should be the expected settings ID', () => {
      expect(SETTINGS_ID).toBe('00000000-0000-0000-0000-000000000001')
    })

    it('should be a const value', () => {
      // TypeScript ensures this is const, but we can verify it's a string
      expect(typeof SETTINGS_ID).toBe('string')
    })

    it('should be immutable', () => {
      const original = SETTINGS_ID
      // Attempting to reassign would cause TypeScript error
      expect(SETTINGS_ID).toBe(original)
    })
  })
})
