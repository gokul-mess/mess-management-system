'use client'

import { useDailyLogs } from '@/hooks/use-daily-logs'
import { useProfile } from '@/hooks/use-profile'
import { Button } from '@/components/ui/button'
import { ManualVerify } from '@/components/owner/manual-verify'
import { StudentsList } from '@/components/owner/students-list'
import { AnalyticsDashboard } from '@/components/owner/analytics-dashboard'
import { SettingsPanel } from '@/components/owner/settings-panel'
import { ProfilePage } from '@/components/owner/profile-page'
import { useUIStore } from '@/store/ui-store'
import { useAuthStore } from '@/store/auth-store'
import { useState, useEffect, useRef, useCallback } from 'react'
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
  X,
  Filter,
  Zap,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock
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
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-zinc-900 border-r border-border flex flex-col flex-shrink-0 transition-all duration-300 relative shadow-xl`}>
        {/* Logo */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between h-[73px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 hover:rotate-12 duration-300 group">
                <span className="text-white font-bold text-lg group-hover:scale-110 transition-transform">G</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">Gokul Mess</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Owner Portal</p>
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
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 z-50 bg-white dark:bg-zinc-900 border border-border rounded-full p-1.5 shadow-lg hover:shadow-xl hover:bg-accent transition-all hover:scale-110 active:scale-95"
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
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={Hash}
            label="Verify Meal"
            active={activeTab === 'verify'}
            onClick={() => setActiveTab('verify')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={Users}
            label="Students"
            active={activeTab === 'students'}
            onClick={() => setActiveTab('students')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={BarChart3}
            label="Analytics"
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={Settings}
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={UserCheck}
            label="Profile"
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            collapsed={sidebarCollapsed}
          />
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border bg-gradient-to-t from-accent/30 to-transparent">
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-3 mb-3 group">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20 group-hover:border-primary/40 transition-all group-hover:scale-110">
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
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name || 'Owner'}</p>
                  <p className="text-xs text-muted-foreground">Owner</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-all group"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                Sign Out
              </Button>
            </>
          ) : (
            <button
              onClick={handleSignOut}
              className="w-full flex justify-center p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 group-hover:animate-pulse" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-border flex-shrink-0 h-[73px] relative overflow-visible z-50">
          {/* Animated shimmer background */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          
          <div className="px-8 h-full flex items-center justify-between relative z-10">
            <div className="flex items-center gap-8">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {activeTab === 'dashboard' && (
                  <>
                    <LayoutDashboard className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                    <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                      Dashboard Overview
                    </span>
                  </>
                )}
                {activeTab === 'verify' && (
                  <>
                    <Hash className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
                    <span className="bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                      Verify Meal
                    </span>
                  </>
                )}
                {activeTab === 'students' && (
                  <>
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
                    <span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                      Student Management
                    </span>
                  </>
                )}
                {activeTab === 'analytics' && (
                  <>
                    <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-pulse" />
                    <span className="bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
                      Analytics & Reports
                    </span>
                  </>
                )}
                {activeTab === 'settings' && (
                  <>
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400 animate-pulse" />
                    <span className="bg-gradient-to-r from-gray-600 to-gray-400 bg-clip-text text-transparent">
                      Settings
                    </span>
                  </>
                )}
                {activeTab === 'profile' && (
                  <>
                    <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                      My Profile
                    </span>
                  </>
                )}
                {activeTab === 'notifications' && (
                  <>
                    <Bell className="w-5 h-5 text-red-600 dark:text-red-400 animate-pulse" />
                    <span className="bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
                      Notifications
                    </span>
                  </>
                )}
              </h2>
              <p className="text-xs text-muted-foreground hidden sm:block animate-in fade-in duration-500">
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
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 hover:bg-accent rounded-lg transition-all hover:scale-110 active:scale-95 group ${
                    notifications.length > 0 ? 'animate-shake' : ''
                  }`}
                >
                  <Bell className={`w-5 h-5 ${notifications.length > 0 ? 'group-hover:animate-shake' : 'group-hover:animate-pulse'}`} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 top-[73px] z-[100] backdrop-blur-sm bg-black/20 animate-in fade-in duration-200" 
                      onClick={() => setShowNotifications(false)}
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
                <button 
                  onClick={() => setShowSearch(!showSearch)}
                  className="relative p-2 hover:bg-accent rounded-lg transition-all hover:scale-110 active:scale-95 group"
                >
                  <Search className="w-5 h-5 group-hover:animate-pulse" />
                </button>

                {/* Search Dropdown */}
                {showSearch && (
                  <>
                    <div 
                      className="fixed inset-0 top-[73px] z-[100] backdrop-blur-sm bg-black/20 animate-in fade-in duration-200" 
                      onClick={() => setShowSearch(false)}
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
                      <div className="border-t border-border">
                        <div className="p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Quick Actions</p>
                          <div className="space-y-1">
                            <button 
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex items-center gap-2 transition-all hover:scale-105 hover:shadow-sm"
                              onClick={() => {
                                setActiveTab('verify')
                                setShowSearch(false)
                              }}
                            >
                              <Hash className="w-4 h-4 text-green-600 dark:text-green-400" />
                              Verify Meal
                            </button>
                            <button 
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex items-center gap-2 transition-all hover:scale-105 hover:shadow-sm"
                              onClick={() => {
                                setActiveTab('students')
                                setShowSearch(false)
                              }}
                            >
                              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              View Students
                            </button>
                            <button 
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex items-center gap-2 transition-all hover:scale-105 hover:shadow-sm"
                              onClick={() => {
                                setActiveTab('analytics')
                                setShowSearch(false)
                              }}
                            >
                              <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
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
          {activeTab === 'profile' && <ProfilePage profile={profile || null} />}
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
  
  // Animated counter states
  const [animatedMeals, setAnimatedMeals] = useState(0)
  const [animatedRevenue, setAnimatedRevenue] = useState(0)
  const [animatedStudents, setAnimatedStudents] = useState(0)
  const [animatedLeaves, setAnimatedLeaves] = useState(0)
  
  const supabase = createClient()

  // Animated counter effect for meals
  useEffect(() => {
    if (!isLoading && stats.totalMeals > 0) {
      const duration = 1000
      const steps = 30
      const increment = stats.totalMeals / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= stats.totalMeals) {
          setAnimatedMeals(stats.totalMeals)
          clearInterval(timer)
        } else {
          setAnimatedMeals(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [stats.totalMeals, isLoading])

  // Animated counter effect for revenue
  useEffect(() => {
    if (!isLoading && stats.revenue > 0) {
      const duration = 1000
      const steps = 30
      const increment = stats.revenue / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= stats.revenue) {
          setAnimatedRevenue(stats.revenue)
          clearInterval(timer)
        } else {
          setAnimatedRevenue(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [stats.revenue, isLoading])

  // Animated counter effect for students
  useEffect(() => {
    if (!isLoading && activeStudents > 0) {
      const duration = 1000
      const steps = 30
      const increment = activeStudents / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= activeStudents) {
          setAnimatedStudents(activeStudents)
          clearInterval(timer)
        } else {
          setAnimatedStudents(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [activeStudents, isLoading])

  // Animated counter effect for leaves
  useEffect(() => {
    if (!isLoading && leaveRequests > 0) {
      const duration = 1000
      const steps = 30
      const increment = leaveRequests / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= leaveRequests) {
          setAnimatedLeaves(leaveRequests)
          clearInterval(timer)
        } else {
          setAnimatedLeaves(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [leaveRequests, isLoading])

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
        {/* Total Meals Card */}
        <div className="group bg-white dark:bg-zinc-900 rounded-xl p-6 border-2 border-border hover:border-blue-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          
          {/* Particle effects */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:animate-bounce" />
              </div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full shadow-sm group-hover:shadow-green-500/50 group-hover:scale-105 transition-all">
                Today
              </span>
            </div>
            <h3 className="text-4xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {animatedMeals}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Total Meals Served</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400 animate-pulse" />
              <span>Lunch: {stats.lunchCount} | Dinner: {stats.dinnerCount}</span>
            </div>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="group bg-white dark:bg-zinc-900 rounded-xl p-6 border-2 border-border hover:border-green-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/10 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          
          {/* Particle effects */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:animate-bounce" />
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full shadow-sm group-hover:shadow-blue-500/50 group-hover:scale-105 transition-all flex items-center gap-1">
                <Zap className="w-3 h-3 animate-pulse" />
                Revenue
              </span>
            </div>
            <h3 className="text-4xl font-bold mb-1 bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              ₹{animatedRevenue}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Today&apos;s Revenue</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 text-yellow-600 dark:text-yellow-400 animate-pulse" />
              <span>₹50 per meal</span>
            </div>
          </div>
        </div>

        {/* Active Students Card */}
        <div className="group bg-white dark:bg-zinc-900 rounded-xl p-6 border-2 border-border hover:border-purple-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          
          {/* Particle effects */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:animate-bounce" />
              </div>
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full shadow-sm group-hover:shadow-purple-500/50 group-hover:scale-105 transition-all">
                Active
              </span>
            </div>
            <h3 className="text-4xl font-bold mb-1 bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              {animatedStudents}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Active Students</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400 animate-pulse" />
              <span>Subscribed members</span>
            </div>
          </div>
        </div>

        {/* Leave Requests Card */}
        <div className="group bg-white dark:bg-zinc-900 rounded-xl p-6 border-2 border-border hover:border-orange-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          
          {/* Particle effects */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400 group-hover:animate-bounce" />
              </div>
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full shadow-sm group-hover:shadow-orange-500/50 group-hover:scale-105 transition-all">
                Pending
              </span>
            </div>
            <h3 className="text-4xl font-bold mb-1 bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              {animatedLeaves}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">Leave Requests</p>
            <div className="mt-3">
              {leaveRequests > 0 ? (
                <button className="text-xs text-primary hover:underline font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Review Now 
                  <TrendingUp className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-green-600 dark:text-green-400" />
                  No pending requests
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm relative overflow-hidden">
        {/* Live indicator */}
        <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">LIVE</span>
        </div>
        
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Live Meal Feed
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Real-time meal verification logs</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="hover:scale-105 transition-transform"
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
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-lg border border-border shadow-lg z-50 py-2 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        setMealTypeFilter('all')
                        setShowFilterMenu(false)
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-accent text-sm transition-all ${
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
                      className={`w-full text-left px-4 py-2 hover:bg-accent text-sm transition-all ${
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
                      className={`w-full text-left px-4 py-2 hover:bg-accent text-sm transition-all ${
                        mealTypeFilter === 'DINNER' ? 'bg-accent font-medium' : ''
                      }`}
                    >
                      Dinner Only
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExportLogs} className="hover:scale-105 transition-transform">
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
              {filteredLogs.map((log, index) => (
                <div
                  key={log.log_id}
                  className="group flex items-center gap-4 p-4 bg-gradient-to-r from-accent/50 to-accent/30 hover:from-accent hover:to-accent/70 rounded-xl transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg hover:scale-[1.02] relative overflow-hidden animate-in slide-in-from-left fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Spotlight effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  
                  {/* Student photo with animated border */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300 shadow-lg relative z-10">
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
                    {/* Animated ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping opacity-0 group-hover:opacity-75" style={{ animationDuration: '2s' }} />
                  </div>
                  
                  <div className="flex-1 relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {log.users?.full_name || 'Unknown'}
                      </p>
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded group-hover:bg-primary/20 group-hover:scale-105 transition-all">
                        #{log.users?.unique_short_id || '---'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      <span className={`font-bold uppercase px-2 py-0.5 rounded-full text-xs ${
                        log.status === 'CONSUMED' 
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 shadow-sm shadow-green-500/50' 
                          : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 shadow-sm shadow-orange-500/50'
                      } group-hover:scale-105 transition-transform`}>
                        {log.status}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                        log.meal_type === 'LUNCH'
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/50'
                          : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/50'
                      } group-hover:scale-105 transition-transform`}>
                        {log.meal_type}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        via {log.access_method.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right relative z-10">
                    <p className="text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">
                      {new Date(log.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {getTimeAgo(log.created_at)}
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
  const [lastVerified, setLastVerified] = useState<{
    name: string
    id: number
    photo: string | null
    mealType: string
    method: string
    timestamp: string
    success: boolean
  } | null>(null)

  const handleVerificationSuccess = (data: unknown) => {
    // Type guard to ensure data has the expected shape
    const verificationData = data as {
      student?: {
        full_name?: string
        unique_short_id?: number
        photo_url?: string | null
      }
      mealType?: string
      method?: string
    }
    
    setLastVerified({
      name: verificationData.student?.full_name || 'Unknown',
      id: verificationData.student?.unique_short_id || 0,
      photo: verificationData.student?.photo_url || null,
      mealType: verificationData.mealType || 'UNKNOWN',
      method: verificationData.method === 'OTP' ? 'Parcel OTP' : 'Student ID',
      timestamp: new Date().toISOString(),
      success: true
    })
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Verification Interface */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-border shadow-sm hover:shadow-lg transition-shadow min-h-[600px] flex flex-col">
          <div className="mb-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 group hover:scale-110 hover:rotate-12 transition-all duration-300 shadow-lg">
              <Hash className="w-8 h-8 text-primary group-hover:animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Manual ID Verification
            </h3>
            <p className="text-muted-foreground text-sm">
              Enter student&apos;s unique short ID to verify and log meals
            </p>
          </div>
          <div className="flex-1">
            <ManualVerify onSuccess={handleVerificationSuccess} />
          </div>
        </div>

        {/* Right Column - Last Verified Display */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-border shadow-sm min-h-[600px] flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Last Verified
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Most recent meal verification
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center">{lastVerified ? (
            <div className="space-y-6 animate-in slide-in-from-right fade-in duration-500">
              {/* Success Banner */}
              <div className={`p-4 rounded-xl border-2 ${
                lastVerified.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500/50'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-500/50'
              } animate-in slide-in-from-top-2 duration-300`}>
                <div className="flex items-center gap-3">
                  {lastVerified.success ? (
                    <>
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-green-900 dark:text-green-100">
                          ✓ Verification Successful
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Meal logged successfully
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                        <XCircle className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-red-900 dark:text-red-100">
                          ✗ Verification Failed
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Please try again
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Student Card - Horizontal Layout */}
              <div className="relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-accent/50 to-accent/20 p-6 group hover:shadow-xl transition-all duration-300">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                
                <div className="relative z-10">
                  {/* Horizontal Layout: Photo Left, Details Right */}
                  <div className="flex items-center gap-6">
                    {/* Student Photo */}
                    <div className="relative flex-shrink-0">
                      <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-4 border-primary/30 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-300 shadow-2xl">
                        {lastVerified.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={lastVerified.photo}
                            alt={lastVerified.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl font-bold text-primary">
                            {lastVerified.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      {/* Animated ring */}
                      <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                      {/* Success checkmark */}
                      {lastVerified.success && (
                        <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-in zoom-in duration-500 shadow-lg">
                          <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Student Details */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                          {lastVerified.name}
                        </h4>
                        <p className="text-sm text-muted-foreground font-mono mt-1">
                          ID: #{lastVerified.id}
                        </p>
                      </div>

                      {/* Meal Info */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                          lastVerified.mealType === 'LUNCH'
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/50'
                            : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/50'
                        } group-hover:scale-105 transition-transform`}>
                          {lastVerified.mealType}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 group-hover:scale-105 transition-transform">
                          {lastVerified.method}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <div className="pt-2 border-t border-border">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(lastVerified.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getTimeAgo(lastVerified.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 animate-pulse">
                <UserCheck className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
              <h4 className="text-lg font-semibold mb-2">No Verifications Yet</h4>
              <p className="text-sm text-muted-foreground max-w-xs">
                Verified student details will appear here after successful meal verification
              </p>
            </div>
          )}
          </div>
        </div>
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

// Notifications Content Component with Enhanced Animations
function NotificationsContent({ notifications: initialNotifications }: {
  notifications: Array<{
    type: string
    title: string
    message: string
    time: string
  }>
}) {
  const [notifications, setNotifications] = useState(initialNotifications.map((n, i) => ({
    ...n,
    id: `notif-${i}`,
    read: false,
    priority: n.type === 'warning' ? 'high' : n.type === 'info' ? 'medium' : 'low',
    dismissing: false,
    swipeOffset: 0
  })))
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const touchStartX = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true, dismissing: true } : n)
    )
    
    // Remove after fade-out animation
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 500)
  }, [])

  // Auto-dismiss high priority notifications after 10 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    notifications.forEach((notif) => {
      if (notif.priority === 'high' && !notif.read) {
        const timer = setTimeout(() => {
          handleMarkAsRead(notif.id)
        }, 10000)
        timers.push(timer)
      }
    })

    return () => timers.forEach(timer => clearTimeout(timer))
  }, [notifications, handleMarkAsRead])

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true, dismissing: true })))
    
    setTimeout(() => {
      setNotifications([])
    }, 500)
  }

  const handleDismiss = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, dismissing: true } : n)
    )
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 300)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    touchCurrentX.current = e.touches[0].clientX
    const offset = touchCurrentX.current - touchStartX.current
    
    if (offset < 0) { // Only allow left swipe
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, swipeOffset: offset } : n)
      )
    }
  }

  const handleTouchEnd = (id: string) => {
    const notification = notifications.find(n => n.id === id)
    if (notification && notification.swipeOffset < -100) {
      handleDismiss(id)
    } else {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, swipeOffset: 0 } : n)
      )
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return Bell
      case 'warning':
        return Clock
      case 'success':
        return CheckCircle
      case 'error':
        return XCircle
      default:
        return Bell
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header with Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary animate-pulse" />
              All Notifications
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
              className="hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-950/20 dark:hover:text-green-400 dark:hover:border-green-900/50 transition-all group"
            >
              <CheckCircle className="w-4 h-4 mr-2 group-hover:animate-bounce" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'unread'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === 'read'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type)
              
              return (
                <div
                  key={notification.id}
                  className={`relative overflow-hidden transition-all duration-300 ${
                    notification.dismissing ? 'opacity-0 scale-95 -translate-x-full' : 'opacity-100 scale-100'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    transform: `translateX(${notification.swipeOffset}px)`,
                    transition: notification.swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none'
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={(e) => handleTouchMove(e, notification.id)}
                  onTouchEnd={() => handleTouchEnd(notification.id)}
                >
                  {/* Priority Glow Effect */}
                  {notification.priority === 'high' && !notification.read && (
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent animate-pulse pointer-events-none" />
                  )}

                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/80 to-primary/60 animate-pulse" />
                  )}

                  <div 
                    className={`p-6 hover:bg-accent transition-all cursor-pointer group animate-in slide-in-from-right-4 duration-300 ${
                      notification.read ? 'opacity-60' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon with Type-based Styling */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative transition-all duration-300 group-hover:scale-110 ${
                        notification.type === 'info' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        notification.type === 'warning' ? 'bg-orange-100 dark:bg-orange-900/20' :
                        notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/20' :
                        notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/20' :
                        'bg-gray-100 dark:bg-gray-900/20'
                      }`}>
                        <Icon className={`w-6 h-6 transition-all duration-300 ${
                          notification.type === 'info' ? 'text-blue-600 dark:text-blue-400' :
                          notification.type === 'warning' ? 'text-orange-600 dark:text-orange-400 group-hover:animate-bounce' :
                          notification.type === 'success' ? 'text-green-600 dark:text-green-400' :
                          notification.type === 'error' ? 'text-red-600 dark:text-red-400 group-hover:animate-shake' :
                          'text-gray-600 dark:text-gray-400'
                        } ${!notification.read ? 'animate-pulse' : ''}`} />
                        
                        {/* Priority Badge */}
                        {notification.priority === 'high' && !notification.read && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-ping" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </h4>
                          {notification.priority === 'high' && !notification.read && (
                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full animate-pulse">
                              Priority
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.time}
                          </p>
                          {!notification.read && (
                            <span className="text-xs font-medium text-primary">New</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                            className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-all hover:scale-110"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDismiss(notification.id)
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-all hover:scale-110"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Auto-dismiss Countdown for High Priority */}
                    {notification.priority === 'high' && !notification.read && (
                      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-500 to-red-500 animate-countdown"
                          style={{ animation: 'countdown 10s linear forwards' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Swipe Indicator */}
                  {notification.swipeOffset < -20 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600 dark:text-red-400 animate-pulse">
                      <X className="w-6 h-6" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Bell className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <h4 className="text-lg font-semibold mb-2">
              {filter === 'unread' ? 'No unread notifications' : 
               filter === 'read' ? 'No read notifications' : 
               'No notifications yet'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {filter === 'all' 
                ? "You'll see important updates and alerts here when they arrive"
                : `Switch to "${filter === 'unread' ? 'All' : 'Unread'}" to see other notifications`}
            </p>
          </div>
        )}
      </div>

      {/* Swipe Hint */}
      {filteredNotifications.length > 0 && (
        <div className="text-center text-xs text-muted-foreground animate-in fade-in duration-700 delay-500">
          💡 Tip: Swipe left to dismiss notifications
        </div>
      )}
    </div>
  )
}

// Navigation Item Component with enhanced effects
function NavItem({ icon: Icon, label, active, onClick, collapsed }: {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
  collapsed: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group ${
        active
          ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30'
          : 'text-muted-foreground hover:bg-gradient-to-r hover:from-accent hover:to-accent/50 hover:text-accent-foreground'
      }`}
      title={collapsed ? label : ''}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
      )}
      <Icon className={`w-5 h-5 flex-shrink-0 relative z-10 transition-transform duration-300 ${
        active ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-12'
      }`} />
      {!collapsed && (
        <span className="font-medium relative z-10">{label}</span>
      )}
      {active && !collapsed && (
        <Zap className="w-4 h-4 ml-auto animate-pulse" />
      )}
    </button>
  )
}

// Helper function to get time ago
function getTimeAgo(dateString: string): string {
  const now = new Date()
  const past = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}
