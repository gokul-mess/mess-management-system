/**
 * Unit Tests for components/shared/meal-plan-badge.tsx
 */

import { render, screen } from '@testing-library/react'
import { MealPlanBadge } from '@/components/shared/meal-plan-badge'

describe('MealPlanBadge (Risk R-12)', () => {
  it('should render fallback text when plan is missing', () => {
    render(<MealPlanBadge />)
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('should render L plan label', () => {
    render(<MealPlanBadge plan="L" />)
    expect(screen.getByText('L')).toBeInTheDocument()
  })

  it('should render D plan label', () => {
    render(<MealPlanBadge plan="D" />)
    expect(screen.getByText('D')).toBeInTheDocument()
  })

  it('should render DL plan label as L + D', () => {
    render(<MealPlanBadge plan="DL" />)
    expect(screen.getByText('L + D')).toBeInTheDocument()
  })
})
