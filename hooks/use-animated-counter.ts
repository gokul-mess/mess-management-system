'use client'

import { useState, useEffect } from 'react'

interface UseAnimatedCounterOptions {
  /** Target value to animate to */
  target: number
  /** Animation duration in milliseconds (default: 1000) */
  duration?: number
  /** Number of animation steps (default: 30) */
  steps?: number
  /** Whether to skip animation (e.g., while loading) */
  enabled?: boolean
}

/**
 * Hook that animates a number from 0 to a target value.
 * Useful for stat cards, dashboards, and metrics displays.
 */
export function useAnimatedCounter({
  target,
  duration = 1000,
  steps = 30,
  enabled = true,
}: UseAnimatedCounterOptions): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    // When disabled or target is non-positive, snap immediately
    if (!enabled || target <= 0) {
      setValue(target > 0 ? target : 0)
      return
    }

    const increment = target / steps
    let current = 0
    let cancelled = false

    const timer = setInterval(() => {
      if (cancelled) return
      current += increment
      if (current >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(Math.floor(current))
      }
    }, duration / steps)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [target, duration, steps, enabled])

  return value
}
