/**
 * Unit Tests for components/student/history-content.tsx
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HistoryContent } from '@/components/student/history-content'

jest.mock('@/hooks/use-all-logs', () => ({
  useAllLogs: jest.fn(),
}))

jest.mock('@/utils/format', () => ({
  formatDateTime: jest.fn((value: string) => `FMT:${value}`),
}))

import { useAllLogs } from '@/hooks/use-all-logs'

describe('HistoryContent Component (Risk R-12)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render meal history and records', async () => {
    ;(useAllLogs as jest.Mock).mockReturnValue({
      logs: [
        {
          log_id: 'log-1',
          user_id: 'student-1',
          date: '2026-04-25',
          meal_type: 'LUNCH',
          status: 'CONSUMED',
          access_method: 'SELF_ID',
          created_at: '2026-04-25T06:30:00.000Z',
        },
        {
          log_id: 'log-2',
          user_id: 'student-1',
          date: '2026-04-25',
          meal_type: 'DINNER',
          status: 'CONSUMED',
          access_method: 'SELF_ID',
          created_at: '2026-04-25T13:30:00.000Z',
        },
      ],
      isPending: false,
      error: null,
    })

    render(<HistoryContent profile={{ id: 'student-1' }} />)

    await waitFor(() => expect(screen.getByText('Consumption Records')).toBeInTheDocument())

    expect(screen.getByText('Meal History')).toBeInTheDocument()
    expect(screen.getByText('LUNCH')).toBeInTheDocument()
    expect(screen.getByText('DINNER')).toBeInTheDocument()
  })

  it('should filter logs when lunch filter is selected', async () => {
    const user = userEvent.setup()

    ;(useAllLogs as jest.Mock).mockReturnValue({
      logs: [
        {
          log_id: 'log-1',
          user_id: 'student-1',
          date: '2026-04-25',
          meal_type: 'LUNCH',
          status: 'CONSUMED',
          access_method: 'SELF_ID',
          created_at: '2026-04-25T06:30:00.000Z',
        },
        {
          log_id: 'log-2',
          user_id: 'student-1',
          date: '2026-04-25',
          meal_type: 'DINNER',
          status: 'CONSUMED',
          access_method: 'SELF_ID',
          created_at: '2026-04-25T13:30:00.000Z',
        },
      ],
      isPending: false,
      error: null,
    })

    render(<HistoryContent profile={{ id: 'student-1' }} />)

    await waitFor(() => expect(screen.getByText('DINNER')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Lunch' }))

    await waitFor(() => {
      expect(screen.getByText('LUNCH')).toBeInTheDocument()
      expect(screen.queryByText('DINNER')).not.toBeInTheDocument()
    })
  })

  it('should show empty-state message when no logs are available', async () => {
    ;(useAllLogs as jest.Mock).mockReturnValue({
      logs: [],
      isPending: false,
      error: null,
    })

    render(<HistoryContent profile={{ id: 'student-1' }} />)

    await waitFor(() => expect(screen.getByText('No meals found for selected filters')).toBeInTheDocument())
  })
})
