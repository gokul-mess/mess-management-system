/**
 * Unit Tests for components/owner/students-list.tsx
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudentsList } from '@/components/owner/students-list'

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/hooks/use-error-handler', () => ({
  useAsyncOperation: () => ({
    loading: false,
    error: null,
    success: null,
    execute: async (operation: () => Promise<unknown>) => operation(),
    clearMessages: jest.fn(),
  }),
}))

jest.mock('@/components/shared/student-avatar', () => ({
  StudentAvatar: ({ fullName }: { fullName: string }) => <span>{fullName}</span>,
}))

jest.mock('@/components/shared/in-app-camera-capture', () => ({
  InAppCameraCapture: () => null,
}))

jest.mock('@/components/shared/fee-payment-status', () => ({
  FeePaymentStatus: () => null,
  PAYMENT_SUCCESS_TIMEOUT: 100,
  MAX_NOTE_LENGTH: 250,
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 100000,
}))

jest.mock('@/components/shared/mess-cycle-tracker', () => ({
  MessCycleTracker: () => null,
}))

jest.mock('@/components/shared/weekly-progress-bar', () => ({
  WeeklyProgressBar: () => <div>Weekly Progress</div>,
}))

jest.mock('@/lib/professional-report-generator', () => ({
  generateProfessionalReport: jest.fn(),
}))

jest.mock('@/lib/excel-generator', () => ({
  generateAttendanceExcel: jest.fn(),
}))

jest.mock('@/lib/report-data-fetcher', () => ({
  fetchReportData: jest.fn(),
  transformForPDFReport: jest.fn(),
  transformForExcelReport: jest.fn(),
}))

jest.mock('@/lib/student-photo', () => ({
  uploadStudentPhoto: jest.fn(),
  deleteStudentPhoto: jest.fn(),
}))

import { createClient } from '@/lib/supabase/client'

describe('StudentsList Component (Risk R-07)', () => {
  let studentsRows: Array<Record<string, unknown>>

  beforeEach(() => {
    jest.clearAllMocks()

    studentsRows = [
      {
        id: 'student-1',
        full_name: 'Student One',
        unique_short_id: 101,
        role: 'STUDENT',
        is_active: true,
        created_at: '2026-04-01T00:00:00.000Z',
        mess_periods: [
          {
            id: 'period-1',
            meal_plan: 'DL',
            is_active: true,
            end_date: '2099-12-31',
            start_date: '2026-04-01',
            original_end_date: '2099-12-31',
          },
        ],
      },
      {
        id: 'student-2',
        full_name: 'Student Two',
        unique_short_id: 202,
        role: 'STUDENT',
        is_active: true,
        created_at: '2026-04-05T00:00:00.000Z',
        mess_periods: [
          {
            id: 'period-2',
            meal_plan: 'L',
            is_active: true,
            end_date: '2099-12-31',
            start_date: '2026-04-01',
            original_end_date: '2099-12-31',
          },
        ],
      },
    ]

    const usersBuilder = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
    }
    usersBuilder.select.mockReturnValue(usersBuilder)
    usersBuilder.eq.mockReturnValue(usersBuilder)
    usersBuilder.order.mockImplementation(() => Promise.resolve({ data: studentsRows, error: null }))

    const leavesBuilder = {
      select: jest.fn(),
      eq: jest.fn(),
      gte: jest.fn(),
      lte: jest.fn(),
    }
    leavesBuilder.select.mockReturnValue(leavesBuilder)
    leavesBuilder.eq.mockReturnValue(leavesBuilder)
    leavesBuilder.gte.mockReturnValue(leavesBuilder)
    leavesBuilder.lte.mockResolvedValue({ data: [], error: null })

    const settingsBuilder = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
    }
    settingsBuilder.select.mockReturnValue(settingsBuilder)
    settingsBuilder.eq.mockReturnValue(settingsBuilder)
    settingsBuilder.single.mockResolvedValue({
      data: {
        lunch_price: 120,
        dinner_price: 110,
        both_price: 200,
      },
      error: null,
    })

    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === 'users') return usersBuilder
        if (table === 'leaves') return leavesBuilder
        if (table === 'mess_settings') return settingsBuilder
        return usersBuilder
      }),
    })
  })

  it('should render students list from fetched data', async () => {
    render(<StudentsList />)

    await waitFor(() => expect(screen.getAllByText('Student One').length).toBeGreaterThan(0))

    expect(screen.getAllByText('Student Two').length).toBeGreaterThan(0)
    expect(screen.getByText('#101')).toBeInTheDocument()
    expect(screen.getByText('Total Students')).toBeInTheDocument()
  })

  it('should filter students by search input', async () => {
    const user = userEvent.setup()
    render(<StudentsList />)

    await waitFor(() => expect(screen.getAllByText('Student One').length).toBeGreaterThan(0))

    await user.type(screen.getByPlaceholderText('Search by name or ID...'), 'Two')

    await waitFor(() => {
      expect(screen.getAllByText('Student Two').length).toBeGreaterThan(0)
    })

    expect(screen.queryAllByText('Student One').length).toBe(0)
  })
})
