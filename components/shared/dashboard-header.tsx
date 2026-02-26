'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { formatHeaderDate } from '@/utils/format'

export interface HeaderTab {
  tab: string
  icon: React.ElementType
  label: string
  /** Gradient color pair for the icon and label text */
  color: string
}

export interface Notification {
  type: string
  title: string
  message: string
  time: string
}

interface DashboardHeaderProps {
  /** Tab configuration for title display */
  tabs: HeaderTab[]
  /** Currently active tab */
  activeTab: string
  /** Array of notifications */
  notifications: Notification[]
  /** Whether notifications dropdown is open */
  showNotifications: boolean
  /** Toggle notifications dropdown */
  onToggleNotifications: (show: boolean) => void
  /** Callback when "View all" is clicked */
  onViewAllNotifications: () => void
  /** Whether to show search button (owner only) */
  showSearch?: boolean
  /** Search dropdown visibility */
  searchOpen?: boolean
  /** Toggle search dropdown */
  onToggleSearch?: (show: boolean) => void
  /** Quick actions for search (owner only) */
  searchActions?: Array<{
    icon: React.ElementType
    label: string
    tab: string
    color: string
  }>
  /** Callback when a search action is clicked */
  onSearchAction?: (tab: string) => void
  /** Whether to show the mobile menu button */
  showMobileMenuButton?: boolean
  /** Callback for mobile menu button */
  onMobileMenuOpen?: () => void
}

/**
 * Shared dashboard header component with title, notifications, and optional search.
 */
export function DashboardHeader({
  tabs,
  activeTab,
  notifications,
  showNotifications,
  onToggleNotifications,
  onViewAllNotifications,
  showSearch = false,
  searchOpen = false,
  onToggleSearch,
  searchActions,
  onSearchAction,
  showMobileMenuButton = false,
  onMobileMenuOpen,
}: DashboardHeaderProps) {
  const currentTab = tabs.find((t) => t.tab === activeTab)

  return (
    <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-border flex-shrink-0 h-[73px] relative overflow-visible z-50">
      {/* Animated shimmer background */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer"
        style={{ backgroundSize: '200% 100%' }}
      />

      <div className="px-4 lg:px-8 h-full flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4 lg:gap-8">
          {showMobileMenuButton && (
            <button
              onClick={onMobileMenuOpen}
              className="lg:hidden p-2 hover:bg-accent rounded-lg transition-all hover:scale-110 active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              {currentTab && (
                <>
                  <currentTab.icon className={`w-5 h-5 ${currentTab.color} animate-pulse`} />
                  <span className={`bg-gradient-to-r ${currentTab.color} bg-clip-text text-transparent`}>
                    {currentTab.label}
                  </span>
                </>
              )}
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block animate-in fade-in duration-500">
              {formatHeaderDate()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => onToggleNotifications(!showNotifications)}
              className={`relative p-2 hover:bg-accent rounded-lg transition-all hover:scale-110 active:scale-95 group ${
                notifications.length > 0 ? 'animate-shake' : ''
              }`}
            >
              <Bell
                className={`w-5 h-5 ${
                  notifications.length > 0 ? 'group-hover:animate-shake' : 'group-hover:animate-pulse'
                }`}
              />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 top-[73px] z-[100] backdrop-blur-sm bg-black/20 animate-in fade-in duration-200"
                  onClick={() => onToggleNotifications(false)}
                />
                <div className="fixed right-4 top-20 w-80 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-2xl z-[101] overflow-hidden animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-6rem)]">
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Notifications</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notifications.length > 0
                        ? `You have ${notifications.length} unread notification${notifications.length > 1 ? 's' : ''}`
                        : 'No new notifications'}
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification, index: number) => (
                        <div
                          key={index}
                          className="p-4 hover:bg-accent cursor-pointer border-b border-border transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                notification.type === 'info'
                                  ? 'bg-blue-500'
                                  : notification.type === 'warning'
                                    ? 'bg-orange-500'
                                    : 'bg-green-500'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          You&apos;ll see updates here when they arrive
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-border text-center">
                    <button
                      className="text-sm text-primary hover:underline font-medium"
                      onClick={() => {
                        onViewAllNotifications()
                        onToggleNotifications(false)
                      }}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Search (owner only) */}
          {showSearch && onToggleSearch && (
            <div className="relative">
              <button
                onClick={() => onToggleSearch(!searchOpen)}
                className="relative p-2 hover:bg-accent rounded-lg transition-all hover:scale-110 active:scale-95 group"
              >
                <Search className="w-5 h-5 group-hover:animate-pulse" />
              </button>

              {searchOpen && (
                <>
                  <div
                    className="fixed inset-0 top-[73px] z-[100] backdrop-blur-sm bg-black/20 animate-in fade-in duration-200"
                    onClick={() => onToggleSearch(false)}
                  />
                  <div className="fixed right-4 top-20 w-96 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-2xl z-[101] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-pulse" />
                        <input
                          type="text"
                          placeholder="Search students, meals, or settings..."
                          className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                          autoFocus
                        />
                      </div>
                    </div>
                    {searchActions && searchActions.length > 0 && (
                      <div className="border-t border-border">
                        <div className="p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
                          <div className="space-y-1">
                            {searchActions.map((action) => (
                              <button
                                key={action.tab}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex items-center gap-2 transition-all hover:scale-105 hover:shadow-sm"
                                onClick={() => {
                                  onSearchAction?.(action.tab)
                                  onToggleSearch(false)
                                }}
                              >
                                <action.icon className={`w-4 h-4 ${action.color}`} />
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
