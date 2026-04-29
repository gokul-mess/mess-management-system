/**
 * Unit Tests for components/ui/error-message.tsx
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// @ts-ignore - jest-axe types are defined in types/jest-axe.d.ts
import { axe, toHaveNoViolations } from 'jest-axe'
import { ErrorMessage } from '@/components/ui/error-message'

expect.extend(toHaveNoViolations)

describe('ErrorMessage Component (Risk R-06, R-13)', () => {
  it('should render nothing when error is null', () => {
    const { container } = render(<ErrorMessage error={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render generic error message from string input', () => {
    render(<ErrorMessage error="Something went wrong" />)

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should render network error title for connectivity failures', () => {
    render(
      <ErrorMessage
        error={{ message: 'Connection timed out', code: '08006' }}
      />
    )

    expect(screen.getByText('Connection Error')).toBeInTheDocument()
  })

  it('should render permission denied title for 42501 errors', () => {
    render(
      <ErrorMessage
        error={{ message: 'Permission denied', code: '42501' }}
      />
    )

    expect(screen.getByText('Permission Denied')).toBeInTheDocument()
  })

  it('should call retry and dismiss handlers', async () => {
    const user = userEvent.setup()
    const onRetry = jest.fn()
    const onDismiss = jest.fn()

    render(
      <ErrorMessage
        error={{ message: 'Retry me', code: '08006' }}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Try Again' }))
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ErrorMessage error={{ message: 'Validation failed', code: 'VALIDATION' }} />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
