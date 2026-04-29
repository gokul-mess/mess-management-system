/**
 * Unit Tests for components/owner/leave-requests.tsx
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LeaveRequests } from '@/components/owner/leave-requests'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('LeaveRequests Component (Risk R-04)', () => {
  let leaveRows: Array<Record<string, unknown>>
  let mockOrder: jest.Mock
  let mockEqFilter: jest.Mock
  let mockIs: jest.Mock
  let mockSelect: jest.Mock
  let mockUpdateEq: jest.Mock
  let mockUpdate: jest.Mock
  let mockRpc: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    leaveRows = [
      {
        leave_id: 'leave-1',
        user_id: 'student-1',
        start_date: '2026-04-01',
        end_date: '2026-04-04',
        is_approved: false,
        created_at: '2026-04-01T00:00:00.000Z',
        users: { full_name: 'Student One', unique_short_id: 101 },
      },
    ]

    mockOrder = jest.fn().mockImplementation(() => Promise.resolve({ data: leaveRows, error: null }))
    mockEqFilter = jest.fn(() => ({ order: mockOrder }))
    mockIs = jest.fn(() => ({ eq: mockEqFilter }))
    mockSelect = jest.fn(() => ({ is: mockIs }))

    mockUpdateEq = jest.fn().mockResolvedValue({ error: null })
    mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }))

    mockRpc = jest.fn().mockResolvedValue({ error: null })

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
      rpc: mockRpc,
    })
  })

  it('should render leave requests and pending count', async () => {
    render(<LeaveRequests />)

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument())

    expect(screen.getByText('Leave Requests')).toBeInTheDocument()
    expect(screen.getByText('1 pending approval')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })

  it('should approve leave and extend subscription for 4+ days', async () => {
    const user = userEvent.setup()
    render(<LeaveRequests />)

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_approved: true })
      expect(mockUpdateEq).toHaveBeenCalledWith('leave_id', 'leave-1')
    })

    expect(mockRpc).toHaveBeenCalledWith('extend_mess_period', {
      p_user_id: 'student-1',
      p_days: 4,
    })
  })

  it('should reject leave through RPC workflow', async () => {
    const user = userEvent.setup()
    render(<LeaveRequests />)

    await waitFor(() => expect(screen.getByText('Student One')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Reject' }))

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('reject_leave_request', {
        p_leave_id: 'leave-1',
        p_rejection_reason: 'Rejected by owner',
      })
    })
  })
})
