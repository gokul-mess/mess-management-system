/**
 * Unit Tests for components/student/leave-content.tsx
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeaveContent } from '@/components/student/leave-content'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('LeaveContent Component (Risk R-04)', () => {
  let mockLimit: jest.Mock
  let mockInsert: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockLimit = jest.fn().mockResolvedValue({ data: [], error: null })
    mockInsert = jest.fn().mockResolvedValue({ error: null })

    const leavesBuilder = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      limit: mockLimit,
      insert: mockInsert,
    }

    leavesBuilder.select.mockReturnValue(leavesBuilder)
    leavesBuilder.eq.mockReturnValue(leavesBuilder)
    leavesBuilder.order.mockReturnValue(leavesBuilder)

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => leavesBuilder),
    })
  })

  it('should render leave form and history section', async () => {
    render(<LeaveContent profile={{ id: 'student-1', full_name: 'Student One' }} />)

    expect(screen.getByText('Leave Request')).toBeInTheDocument()
    expect(screen.getByText('Leave History')).toBeInTheDocument()

    await waitFor(() => expect(mockLimit).toHaveBeenCalled())
  })

  it('should validate leave date range before submit', async () => {
    const user = userEvent.setup()
    const { container } = render(<LeaveContent profile={{ id: 'student-1', full_name: 'Student One' }} />)

    const dateInputs = container.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2099-05-10' } })
    fireEvent.change(dateInputs[1], { target: { value: '2099-06-20' } })

    await user.click(screen.getByRole('button', { name: 'Submit Leave Request' }))

    await waitFor(() => {
      expect(screen.getByText('Leave duration cannot exceed 30 days')).toBeInTheDocument()
    })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should submit leave request and show success message', async () => {
    const user = userEvent.setup()
    const { container } = render(<LeaveContent profile={{ id: 'student-1', full_name: 'Student One' }} />)

    const dateInputs = container.querySelectorAll('input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2026-05-10' } })
    fireEvent.change(dateInputs[1], { target: { value: '2026-05-12' } })

    await user.click(screen.getByRole('button', { name: 'Submit Leave Request' }))

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'student-1',
        start_date: '2026-05-10',
        end_date: '2026-05-12',
        is_approved: false,
      })
    })

    expect(screen.getByText('Leave request submitted successfully!')).toBeInTheDocument()
  })
})
