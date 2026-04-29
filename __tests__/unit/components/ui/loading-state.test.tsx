/**
 * Unit Tests for components/ui/loading-state.tsx
 */

import { render, screen } from '@testing-library/react'
// @ts-ignore - jest-axe types are defined in types/jest-axe.d.ts
import { axe, toHaveNoViolations } from 'jest-axe'
import { ButtonLoading, LoadingOverlay, LoadingState } from '@/components/ui/loading-state'

expect.extend(toHaveNoViolations)

describe('LoadingState Components (Risk R-07)', () => {
  it('should render default loading message', () => {
    render(<LoadingState />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render custom loading message and size class', () => {
    const { container } = render(<LoadingState message="Fetching profile" size="lg" />)

    expect(screen.getByText('Fetching profile')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveClass('w-12', 'h-12')
  })

  it('should render overlay with custom message', () => {
    render(<LoadingOverlay message="Syncing offline logs" />)
    expect(screen.getByText('Syncing offline logs')).toBeInTheDocument()
  })

  it('should render loading content in ButtonLoading when loading=true', () => {
    render(
      <ButtonLoading loading loadingText="Verifying...">
        Verify
      </ButtonLoading>
    )

    expect(screen.getByText('Verifying...')).toBeInTheDocument()
    expect(screen.queryByText('Verify')).not.toBeInTheDocument()
  })

  it('should render children in ButtonLoading when loading=false', () => {
    render(
      <ButtonLoading loading={false}>
        Verify
      </ButtonLoading>
    )

    expect(screen.getByText('Verify')).toBeInTheDocument()
  })

  it('should have no accessibility violations', async () => {
    const { container } = render(<LoadingState message="Loading records" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
