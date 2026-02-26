'use client'

import { LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavItem } from '@/components/shared/nav-item'

export interface SidebarNavItem {
  icon: React.ElementType
  label: string
  tab: string
}

interface DashboardSidebarProps {
  /** Portal label shown under the logo (e.g., "Owner Portal", "Student Portal") */
  portalLabel: string
  /** Navigation items to render */
  navItems: SidebarNavItem[]
  /** Currently active tab */
  activeTab: string
  /** Callback when a nav item is clicked */
  onTabChange: (tab: string) => void
  /** Whether the sidebar is collapsed */
  collapsed: boolean
  /** Toggle sidebar collapsed state */
  onToggleSidebar: () => void
  /** User profile data */
  profile: {
    full_name?: string
    photo_url?: string | null
    unique_short_id?: number
  } | null
  /** User role label (e.g., "Owner", "Student") */
  roleLabel: string
  /** Show student ID under name */
  showStudentId?: boolean
  /** Sign out callback */
  onSignOut: () => void
  /** Additional CSS classes for the aside element */
  className?: string
}

/**
 * Shared dashboard sidebar component used by both owner and student dashboards.
 * Provides consistent sidebar layout with logo, navigation, and user profile section.
 */
export function DashboardSidebar({
  portalLabel,
  navItems,
  activeTab,
  onTabChange,
  collapsed,
  onToggleSidebar,
  profile,
  roleLabel,
  showStudentId = false,
  onSignOut,
  className = '',
}: DashboardSidebarProps) {
  return (
    <aside
      className={`${collapsed ? 'w-20' : 'w-64'} bg-white dark:bg-zinc-900 border-r border-border hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 relative shadow-xl ${className}`}
    >
      {/* Logo */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between h-[73px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
        {!collapsed ? (
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 hover:rotate-12 duration-300 group">
              <span className="text-white font-bold text-lg group-hover:scale-110 transition-transform">G</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Gokul Mess</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                {portalLabel}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center relative z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 hover:rotate-12 duration-300 group">
              <span className="text-white font-bold text-lg group-hover:scale-110 transition-transform">G</span>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={onToggleSidebar}
        className="absolute -right-3 top-20 z-50 bg-white dark:bg-zinc-900 border border-border rounded-full p-1.5 shadow-lg hover:shadow-xl hover:bg-accent transition-all hover:scale-110 active:scale-95"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.tab}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.tab}
            onClick={() => onTabChange(item.tab)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border bg-gradient-to-t from-accent/30 to-transparent">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 mb-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20 group-hover:border-primary/40 transition-all group-hover:scale-110">
                  {profile?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.photo_url}
                      alt={profile.full_name || roleLabel}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {profile?.full_name?.charAt(0) || roleLabel.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.full_name || roleLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {showStudentId ? `ID: #${profile?.unique_short_id || '---'}` : roleLabel}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-all group"
              onClick={onSignOut}
            >
              <LogOut className="w-4 h-4 mr-2 group-hover:animate-pulse" />
              Sign Out
            </Button>
          </>
        ) : (
          <button
            onClick={onSignOut}
            className="w-full flex justify-center p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 group-hover:animate-pulse" />
          </button>
        )}
      </div>
    </aside>
  )
}

interface MobileSidebarProps extends Omit<DashboardSidebarProps, 'collapsed' | 'onToggleSidebar' | 'className'> {
  /** Whether the mobile sidebar is open */
  isOpen: boolean
  /** Close the mobile sidebar */
  onClose: () => void
}

/**
 * Mobile sidebar overlay for student dashboard (shown on small screens).
 */
export function MobileSidebar({
  portalLabel,
  navItems,
  activeTab,
  onTabChange,
  profile,
  roleLabel,
  showStudentId = false,
  onSignOut,
  isOpen,
  onClose,
}: MobileSidebarProps) {
  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 border-r border-border z-50 lg:hidden animate-in slide-in-from-left duration-300 shadow-2xl">
        {/* Logo */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between h-[73px] bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-black leading-none">G</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">Gokul Mess</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                {portalLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-all hover:rotate-90 duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem
              key={item.tab}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.tab}
              onClick={() => {
                onTabChange(item.tab)
                onClose()
              }}
              collapsed={false}
            />
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border bg-gradient-to-t from-accent/30 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20">
                {profile?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name || roleLabel}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || roleLabel}</p>
              <p className="text-xs text-muted-foreground">
                {showStudentId ? `ID: #${profile?.unique_short_id || '---'}` : roleLabel}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-all"
            onClick={onSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
