/**
 * Unit Tests for components/shared/dashboard-header.tsx
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardHeader, type HeaderTab, type Notification } from '@/components/shared/dashboard-header'

jest.mock('@/utils/format', () => ({
  formatHeaderDate: jest.fn(() => '25 Apr 2026, Friday'),
}))

function MockIcon() {
  return <svg aria-hidden="true" data-testid="mock-icon" />
}

describe('DashboardHeader (Risk R-07)', () => {
  const tabs: HeaderTab[] = [
    {
      tab: 'overview',
      icon: MockIcon,
      label: 'Overview',
      color: 'text-blue-600',
    },
  ]

  const notifications: Notification[] = [
    {
      type: 'info',
      title: 'Sync completed',
      message: 'Offline queue synced successfully',
      time: '2m ago',
    },
  ]

  it('should render active tab title and formatted date', () => {
    render(
      <DashboardHeader
        tabs={tabs}
        activeTab="overview"
        notifications={[]}
        showNotifications={false}
        onToggleNotifications={jest.fn()}
        onViewAllNotifications={jest.fn()}
      />
    )

    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('25 Apr 2026, Friday')).toBeInTheDocument()
  })

  it('should toggle notifications when bell button is clicked', async () => {
    const user = userEvent.setup()
    const onToggleNotifications = jest.fn()

    render(
      <DashboardHeader
        tabs={tabs}
        activeTab="overview"
        notifications={notifications}
        showNotifications={false}
        onToggleNotifications={onToggleNotifications}
        onViewAllNotifications={jest.fn()}
      />
    )

    await user.click(screen.getByRole('button'))
    expect(onToggleNotifications).toHaveBeenCalledWith(true)
  })

  it('should render notification drawer and invoke view-all callback', async () => {
    const user = userEvent.setup()
    const onToggleNotifications = jest.fn()
    const onViewAllNotifications = jest.fn()

    render(
      <DashboardHeader
        tabs={tabs}
        activeTab="overview"
        notifications={notifications}
        showNotifications
        onToggleNotifications={onToggleNotifications}
        onViewAllNotifications={onViewAllNotifications}
      />
    )

    expect(screen.getByText('Sync completed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View all notifications' }))

    expect(onViewAllNotifications).toHaveBeenCalledTimes(1)
    expect(onToggleNotifications).toHaveBeenCalledWith(false)
  })

  it('should trigger search toggle and quick action callback', async () => {
    const user = userEvent.setup()
    const onToggleSearch = jest.fn()
    const onSearchAction = jest.fn()

    render(
      <DashboardHeader
        tabs={tabs}
        activeTab="overview"
        notifications={[]}
        showNotifications={false}
        onToggleNotifications={jest.fn()}
        onViewAllNotifications={jest.fn()}
        showSearch
        searchOpen
        onToggleSearch={onToggleSearch}
        searchActions={[
          {
            icon: MockIcon,
            label: 'Open Students',
            tab: 'students',
            color: 'text-green-600',
          },
        ]}
        onSearchAction={onSearchAction}
      />
    )

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1])
    expect(onToggleSearch).toHaveBeenCalledWith(false)

    await user.click(screen.getByRole('button', { name: 'Open Students' }))
    expect(onSearchAction).toHaveBeenCalledWith('students')
  })
})
