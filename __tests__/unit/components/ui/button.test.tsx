/**
 * Unit Tests for components/ui/button.tsx
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
// @ts-ignore - jest-axe types are defined in types/jest-axe.d.ts
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '@/components/ui/button'

expect.extend(toHaveNoViolations)

describe('Button Component (Risk R-07)', () => {
  it('should render button with correct text', () => {
    render(<Button>Verify Student</Button>)
    expect(screen.getByRole('button', { name: 'Verify Student' })).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()

    render(<Button onClick={onClick}>Approve</Button>)
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should apply variant and size attributes correctly', () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveAttribute('data-variant', 'destructive')
    expect(button).toHaveAttribute('data-size', 'sm')
  })

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup()
    const onClick = jest.fn()

    render(<Button onClick={onClick}>Keyboard Action</Button>)

    const button = screen.getByRole('button', { name: 'Keyboard Action' })
    button.focus()
    await user.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Accessible Button</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
