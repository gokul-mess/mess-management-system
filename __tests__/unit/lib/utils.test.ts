/**
 * Unit Tests for lib/utils.ts
 * Tests utility functions for className merging
 */

import { cn } from '@/lib/utils'

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge single className', () => {
      expect(cn('text-red-500')).toBe('text-red-500')
    })

    it('should merge multiple classNames', () => {
      const result = cn('text-red-500', 'bg-blue-500')
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-500')
    })

    it('should handle conditional classNames', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
    })

    it('should handle false conditional classNames', () => {
      const isActive = false
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class')
      expect(result).not.toContain('active-class')
    })

    it('should merge Tailwind conflicting classes correctly', () => {
      // twMerge should keep the last conflicting class
      const result = cn('p-4', 'p-8')
      expect(result).toBe('p-8')
      expect(result).not.toContain('p-4')
    })

    it('should handle arrays of classNames', () => {
      const result = cn(['text-red-500', 'bg-blue-500'])
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-500')
    })

    it('should handle objects with boolean values', () => {
      const result = cn({
        'text-red-500': true,
        'bg-blue-500': false,
        'font-bold': true
      })
      expect(result).toContain('text-red-500')
      expect(result).not.toContain('bg-blue-500')
      expect(result).toContain('font-bold')
    })

    it('should handle empty input', () => {
      expect(cn()).toBe('')
    })

    it('should handle undefined and null', () => {
      const result = cn('text-red-500', undefined, null, 'bg-blue-500')
      expect(result).toContain('text-red-500')
      expect(result).toContain('bg-blue-500')
    })

    it('should handle complex Tailwind merging', () => {
      const result = cn('px-4 py-2', 'px-8')
      expect(result).toContain('py-2')
      expect(result).toContain('px-8')
      expect(result).not.toContain('px-4')
    })
  })
})
