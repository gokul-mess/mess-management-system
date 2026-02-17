'use client'

import { useDailyLogs } from '@/hooks/use-daily-logs'
import { useProfile } from '@/hooks/use-profile'
import { Button } from '@/components/ui/button'
import { ManualVerify } from '@/components/owner/manual-verify'
import { StudentsList } from '@/components/owner/students-list'
import { AnalyticsDashboard } from '@/components/owner/analytics-dashboard'
import { SettingsPanel } from '@/components/owner/settings-panel'
import { useUIStore } from '@/store/ui-store'
import { useAuthStore } from '@/store/auth-store'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings,
  Search,
  Bell,
  LogOut,
  Hash,
  TrendingUp,
  UserCheck,
  Calendar,
  DollarSign,
  Download,
  Upload,
  X,
  Filter
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OwnerDashboard() {
  const { logs, isLoading } = useDailyLogs()
  const { data: profile } = useProfile()
  const router = useRouter()
  const supabase = createClient()
  
  // Zustand stores
  const { 
    activeTab, 
    sidebarCollapsed, 
    showNotifications, 
    showSearch,
    setActiveTab,
    setShowNotifications,
    setShowSearch,
    toggleSidebar
  } = useUIStore()
  
  const { setUser } = useAuthStore()

  // Sync profile with auth store
  useEffect(() => {
    if (profile) {
      setUser(profile)
    }
  }, [profile, setUser])
  
  const [notifications, setNotifications] = useState<Array<{
    type: string
    title: string
    message: string
    time: string
  }>>([])

  // Fetch notifications (placeholder for future implementation)
  useEffect(() => {
    const fetchNotifications = async () => {
      // TODO: Fetch real notifications from database
      // For now, keeping empty array
      setNotifications([])
    }
    fetchNotifications()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Calculate stats
  const todayStats = {
    totalMeals: logs?.length || 0,
    lunchCount: logs?.filter(l => l.meal_type === 'LUNCH').length || 0,
    dinnerCount: logs?.filter(l => l.meal_type === 'DINNER').length || 0,
    revenue: (logs?.length || 0) * 50 // Assuming ₹50 per meal
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-zinc-900 border-r border-border flex flex-col flex-shrink-0 transition-all duration-300 relative`}>
        {/* Logo */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between h-[73px]">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              {/* Logo Icon */}
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              {/* Brand Text */}
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">Gokul Mess</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Owner Portal</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">G</span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 z-50 bg-white dark:bg-zinc-900 border border-border rounded-full p-1.5 shadow-md hover:shadow-lg hover:bg-accent transition-all"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            title={sidebarCollapsed ? 'Dashboard' : ''}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'verify'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            title={sidebarCollapsed ? 'Verify Meal' : ''}
          >
            <Hash className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Verify Meal</span>}
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'students'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            title={sidebarCollapsed ? 'Students' : ''}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Students</span>}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'analytics'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            title={sidebarCollapsed ? 'Analytics' : ''}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Analytics</span>}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'settings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            title={sidebarCollapsed ? 'Settings' : ''}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Settings</span>}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'profile'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
            title={sidebarCollapsed ? 'Profile' : ''}
          >
            <UserCheck className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Profile</span>}
          </button>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full overflow-hidden flex items-center justify-center">
                  {profile?.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={profile.photo_url} 
                      alt={profile.full_name || 'Owner'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary">
                      {profile?.full_name?.charAt(0) || 'O'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name || 'Owner'}</p>
                  <p className="text-xs text-muted-foreground">Owner</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full flex justify-center p-2 rounded-lg hover:bg-accent"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-border flex-shrink-0 h-[73px]">
          <div className="px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h2 className="text-lg font-bold">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'verify' && 'Verify Meal'}
                {activeTab === 'students' && 'Student Management'}
                {activeTab === 'analytics' && 'Analytics & Reports'}
                {activeTab === 'settings' && 'Settings'}
                {activeTab === 'profile' && 'My Profile'}
                {activeTab === 'notifications' && 'Notifications'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  {/* Notification Badge */}
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-lg z-50 overflow-hidden">
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
                            <div key={index} className="p-4 hover:bg-accent cursor-pointer border-b border-border">
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${
                                  notification.type === 'info' ? 'bg-blue-500' :
                                  notification.type === 'warning' ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`} />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{notification.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
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
                          className="text-sm text-primary hover:underline"
                          onClick={() => {
                            setActiveTab('notifications')
                            setShowNotifications(false)
                          }}
                        >
                          View all notifications
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Search className="w-5 h-5" />
                </Button>

                {/* Search Dropdown */}
                {showSearch && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowSearch(false)}
                    />
                    <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                      <div className="p-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search students, meals, or settings..."
                            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="border-t border-border">
                        <div className="p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
                          <div className="space-y-1">
                            <button 
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex items-center gap-2"
                              onClick={() => {
                                setActiveTab('verify')
                                setShowSearch(false)
                              }}
                            >
                              <Hash className="w-4 h-4" />
                              Verify Meal
                            </button>
                            <button 
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex items-center gap-2"
                              onClick={() => {
                                setActiveTab('students')
                                setShowSearch(false)
                              }}
                            >
                              <Users className="w-4 h-4" />
                              View Students
                            </button>
                            <button 
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex items-center gap-2"
                              onClick={() => {
                                setActiveTab('analytics')
                                setShowSearch(false)
                              }}
                            >
                              <BarChart3 className="w-4 h-4" />
                              View Analytics
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-zinc-950">
          {activeTab === 'dashboard' && (
            <DashboardContent stats={todayStats} logs={logs || null} isLoading={isLoading} />
          )}
          {activeTab === 'verify' && <VerifyContent />}
          {activeTab === 'students' && <StudentsContent />}
          {activeTab === 'analytics' && <AnalyticsContent />}
          {activeTab === 'settings' && <SettingsContent />}
          {activeTab === 'profile' && <ProfileContent profile={profile || null} />}
          {activeTab === 'notifications' && <NotificationsContent notifications={notifications} />}
        </div>
      </main>
    </div>
  )
}

// Dashboard Content Component
function DashboardContent({ stats, logs, isLoading }: {
  stats: { totalMeals: number; lunchCount: number; dinnerCount: number; revenue: number }
  logs: Array<{
    log_id: string
    created_at: string
    meal_type: string
    status: string
    access_method: string
    users?: {
      full_name: string
      unique_short_id: number
      photo_url: string | null
    }
  }> | null
  isLoading: boolean
}) {
  const [activeStudents, setActiveStudents] = useState(0)
  const [leaveRequests, setLeaveRequests] = useState(0)
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [mealTypeFilter, setMealTypeFilter] = useState<'all' | 'LUNCH' | 'DINNER'>('all')
  const supabase = createClient()

  // Fetch real data
  useState(() => {
    const fetchData = async () => {
      // Get active students count
      const { data: students } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'STUDENT')
        .eq('is_active', true)
      
      setActiveStudents(students?.length || 0)

      // Get pending leave requests count
      const { data: leaves } = await supabase
        .from('leaves')
        .select('leave_id', { count: 'exact' })
        .eq('is_approved', false)
      
      setLeaveRequests(leaves?.length || 0)
    }
    fetchData()
  })

  const handleExportLogs = () => {
    try {
      const filteredLogs = mealTypeFilter === 'all' 
        ? logs 
        : logs?.filter((l) => l.meal_type === mealTypeFilter)

      const csvContent = [
        ['Date', 'Time', 'Student Name', 'Student ID', 'Meal Type', 'Status', 'Access Method'].join(','),
        ...(filteredLogs || []).map((log) => [
          new Date(log.created_at).toLocaleDateString('en-IN'),
          new Date(log.created_at).toLocaleTimeString('en-IN'),
          log.users?.full_name || 'Unknown',
          log.users?.unique_short_id || 'N/A',
          log.meal_type,
          log.status,
          log.access_method
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meal-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export logs. Please try again.')
    }
  }

  const filteredLogs = mealTypeFilter === 'all' 
    ? logs 
    : logs?.filter((l) => l.meal_type === mealTypeFilter)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
              Today
            </span>
          </div>
          <h3 className="text-3xl font-bold mb-1">{stats.totalMeals}</h3>
          <p className="text-sm text-muted-foreground">Total Meals Served</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>Lunch: {stats.lunchCount} | Dinner: {stats.dinnerCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              Revenue
            </span>
          </div>
          <h3 className="text-3xl font-bold mb-1">₹{stats.revenue}</h3>
          <p className="text-sm text-muted-foreground">Today&apos;s Revenue</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>₹50 per meal</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
              Active
            </span>
          </div>
          <h3 className="text-3xl font-bold mb-1">{activeStudents}</h3>
          <p className="text-sm text-muted-foreground">Active Students</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Subscribed members</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
              Pending
            </span>
          </div>
          <h3 className="text-3xl font-bold mb-1">{leaveRequests}</h3>
          <p className="text-sm text-muted-foreground">Leave Requests</p>
          <div className="mt-3">
            {leaveRequests > 0 ? (
              <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                Review Now →
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">No pending requests</span>
            )}
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Live Meal Feed</h3>
            <p className="text-sm text-muted-foreground mt-1">Real-time meal verification logs</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              {showFilterMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFilterMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-lg border border-border shadow-lg z-50 py-2">
                    <button
                      onClick={() => {
                        setMealTypeFilter('all')
                        setShowFilterMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-accent text-sm ${
                        mealTypeFilter === 'all' ? 'bg-accent font-medium' : ''
                      }`}
                    >
                      All Meals
                    </button>
                    <button
                      onClick={() => {
                        setMealTypeFilter('LUNCH')
                        setShowFilterMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-accent text-sm ${
                        mealTypeFilter === 'LUNCH' ? 'bg-accent font-medium' : ''
                      }`}
                    >
                      Lunch Only
                    </button>
                    <button
                      onClick={() => {
                        setMealTypeFilter('DINNER')
                        setShowFilterMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-accent text-sm ${
                        mealTypeFilter === 'DINNER' ? 'bg-accent font-medium' : ''
                      }`}
                    >
                      Dinner Only
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs && filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredLogs.map((log) => (
                <div
                  key={log.log_id}
                  className="flex items-center gap-4 p-4 bg-accent/50 hover:bg-accent rounded-lg transition-all animate-in slide-in-from-top-2 fade-in duration-300 border border-border/50"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20">
                    {log.users?.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={log.users.photo_url}
                        alt={log.users.full_name || 'Student'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-primary">
                        {log.users?.full_name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">
                        {log.users?.full_name || 'Unknown'}
                      </p>
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                        #{log.users?.unique_short_id || '---'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`font-bold uppercase ${
                        log.status === 'CONSUMED' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {log.meal_type}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground text-xs">
                        via {log.access_method.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No meals logged today yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Verified meals will appear here in real-time
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Verify Content Component
function VerifyContent() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Verification Interface */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-border shadow-sm">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Manual ID Verification</h3>
          <p className="text-muted-foreground">
            Enter student&apos;s unique short ID to verify and log meals
          </p>
        </div>
        <ManualVerify />
      </div>
    </div>
  )
}

// Students Content Component
function StudentsContent() {
  return <StudentsList />
}

// Analytics Content Component
function AnalyticsContent() {
  return <AnalyticsDashboard />
}

// Settings Content Component
function SettingsContent() {
  return <SettingsPanel />
}

// Profile Content Component
function ProfileContent({ profile }: {
  profile: {
    id: string
    full_name: string
    unique_short_id: number
    photo_url?: string | null
    created_at?: string
  } | null
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: '',
    address: ''
  })
  const supabase = createClient()

  // Fetch user email from auth session
  useState(() => {
    const fetchEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || '')
    }
    fetchEmail()
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" />
        <div className="px-8 pb-8">
          <div className="flex items-end gap-6 -mt-16">
            <div className="relative group cursor-pointer">
              <div className="w-32 h-32 bg-white dark:bg-zinc-900 rounded-full overflow-hidden flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-lg">
                {profile?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name || 'Owner'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-primary">
                    {profile?.full_name?.charAt(0) || 'O'}
                  </span>
                )}
              </div>
              {/* Edit Photo Overlay */}
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-white mx-auto mb-1" />
                  <p className="text-xs text-white font-medium">Change Photo</p>
                </div>
              </div>
            </div>
            <div className="flex-1 pt-4">
              <h2 className="text-2xl font-bold">{profile?.full_name || 'Owner'}</h2>
              <p className="text-muted-foreground">Mess Owner</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono bg-primary/10 text-primary px-3 py-1 rounded">
                  ID: #{profile?.unique_short_id || '---'}
                </span>
                <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1 rounded">
                  Active
                </span>
              </div>
            </div>
            <Button
              variant={isEditing ? 'default' : 'outline'}
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <p className="mt-1 font-medium">{profile?.full_name || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <p className="mt-1 font-medium">{userEmail || 'Not set'}</p>
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="mt-1 font-medium">{formData.phone || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              {isEditing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  placeholder="Enter address"
                />
              ) : (
                <p className="mt-1 font-medium">{formData.address || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Account Information</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="mt-1 font-mono text-sm">{profile?.id || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Short ID</label>
              <p className="mt-1 font-mono text-sm">#{profile?.unique_short_id || '---'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p className="mt-1 font-medium">Owner</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Status</label>
              <div className="mt-1">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full" />
                  Active
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <p className="mt-1 font-medium">
                {profile?.created_at 
                  ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Notifications Content Component
function NotificationsContent({ notifications }: {
  notifications: Array<{
    type: string
    title: string
    message: string
    time: string
  }>
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">All Notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {notifications.length > 0 
                ? `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`
                : 'No notifications yet'}
            </p>
          </div>
          {notifications.length > 0 && (
            <Button variant="outline" size="sm">
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-border">
            {notifications.map((notification, index: number) => (
              <div key={index} className="p-6 hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.type === 'info' ? 'bg-blue-100 dark:bg-blue-900/20' :
                    notification.type === 'warning' ? 'bg-orange-100 dark:bg-orange-900/20' :
                    'bg-green-100 dark:bg-green-900/20'
                  }`}>
                    <Bell className={`w-5 h-5 ${
                      notification.type === 'info' ? 'text-blue-600 dark:text-blue-400' :
                      notification.type === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                      'text-green-600 dark:text-green-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <h4 className="text-lg font-semibold mb-2">No notifications yet</h4>
            <p className="text-sm text-muted-foreground">
              You&apos;ll see important updates and alerts here when they arrive
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
