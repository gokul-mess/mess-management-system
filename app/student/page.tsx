'use client'

import { useState, useEffect } from 'react'
import { useProfile } from '@/hooks/use-profile'
import { useDailyLogs } from '@/hooks/use-daily-logs'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui-store'
import { useAuthStore } from '@/store/auth-store'
import { 
  Calendar, 
  History, 
  User,
  LogOut,
  Clock,
  CheckCircle,
  XCircle,
  Utensils,
  Package,
  X,
  Home,
  AlertCircle,
  Sparkles,
  Menu,
  Bell,
  Activity,
  Zap,
  TrendingUp,
  Hash
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StudentDashboard() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { logs, isLoading: logsLoading } = useDailyLogs()
  const router = useRouter()
  const supabase = createClient()
  
  // Zustand stores
  const { activeTab, setActiveTab, showParcelOTP, setShowParcelOTP, sidebarCollapsed, toggleSidebar } = useUIStore()
  const { setUser } = useAuthStore()

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Array<{
    type: string
    title: string
    message: string
    time: string
  }>>([])

  // Sync profile with auth store
  useEffect(() => {
    if (profile) {
      setUser(profile)
    }
  }, [profile, setUser])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!profile?.id) return
      
      // TODO: Fetch real notifications from database
      // For now, using sample notifications based on subscription status
      const sampleNotifications: Array<{
        type: string
        title: string
        message: string
        time: string
      }> = []
      
      // Check subscription days
      const daysRemaining = profile?.subscription_end_date 
        ? Math.ceil((new Date(profile.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0
      
      if (daysRemaining <= 5 && daysRemaining > 0) {
        sampleNotifications.push({
          type: 'warning',
          title: 'Subscription Expiring Soon',
          message: `Your subscription will expire in ${daysRemaining} days. Please renew to continue enjoying meals.`,
          time: 'Just now'
        })
      }
      
      setNotifications(sampleNotifications)
    }
    
    fetchNotifications()
  }, [profile])

  // Page loading effect
  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Calculate today's meals
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = logs?.filter(log => log.date === today && log.user_id === profile?.id) || []
  const hasLunch = todayLogs.some(log => log.meal_type === 'LUNCH')
  const hasDinner = todayLogs.some(log => log.meal_type === 'DINNER')

  // Calculate subscription days remaining
  const daysRemaining = profile?.subscription_end_date 
    ? Math.ceil((new Date(profile.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Calculate total meals consumed
  const totalMeals = logs?.filter(log => log.user_id === profile?.id).length || 0

  if (isPageLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-2xl mb-4 animate-pulse">
            <Sparkles className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-zinc-900 border-r border-border hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 relative shadow-xl`}>
        {/* Logo */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between h-[73px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 hover:rotate-12 duration-300">
                <Sparkles className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">Gokul Mess</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Student Portal</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center relative z-10">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 hover:rotate-12 duration-300">
                <Sparkles className="text-white w-5 h-5" />
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
            icon={Home}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={Package}
            label="Parcel OTP"
            active={activeTab === 'parcel'}
            onClick={() => setActiveTab('parcel')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={Calendar}
            label="Leave Request"
            active={activeTab === 'leave'}
            onClick={() => setActiveTab('leave')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={History}
            label="Meal History"
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            collapsed={sidebarCollapsed}
          />
          <NavItem
            icon={User}
            label="My Profile"
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
                        alt={profile.full_name || 'Student'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name || 'Student'}</p>
                  <p className="text-xs text-muted-foreground">ID: #{profile?.unique_short_id || '---'}</p>
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

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 border-r border-border z-50 lg:hidden animate-in slide-in-from-left duration-300 shadow-2xl">
            {/* Logo */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between h-[73px] bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-lg">
                  <Sparkles className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground leading-tight">Gokul Mess</h1>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Student Portal</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 hover:bg-accent rounded-lg transition-all hover:rotate-90 duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <NavItem
                icon={Home}
                label="Dashboard"
                active={activeTab === 'dashboard'}
                onClick={() => {
                  setActiveTab('dashboard')
                  setMobileMenuOpen(false)
                }}
                collapsed={false}
              />
              <NavItem
                icon={Package}
                label="Parcel OTP"
                active={activeTab === 'parcel'}
                onClick={() => {
                  setActiveTab('parcel')
                  setMobileMenuOpen(false)
                }}
                collapsed={false}
              />
              <NavItem
                icon={Calendar}
                label="Leave Request"
                active={activeTab === 'leave'}
                onClick={() => {
                  setActiveTab('leave')
                  setMobileMenuOpen(false)
                }}
                collapsed={false}
              />
              <NavItem
                icon={History}
                label="Meal History"
                active={activeTab === 'history'}
                onClick={() => {
                  setActiveTab('history')
                  setMobileMenuOpen(false)
                }}
                collapsed={false}
              />
              <NavItem
                icon={User}
                label="My Profile"
                active={activeTab === 'profile'}
                onClick={() => {
                  setActiveTab('profile')
                  setMobileMenuOpen(false)
                }}
                collapsed={false}
              />
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
                        alt={profile.full_name || 'Student'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name || 'Student'}</p>
                  <p className="text-xs text-muted-foreground">ID: #{profile?.unique_short_id || '---'}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-all"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-border flex-shrink-0 h-[73px] shadow-sm sticky top-0 z-30">
          <div className="px-4 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-accent rounded-lg transition-all hover:scale-110 active:scale-95"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  {activeTab === 'dashboard' && (
                    <>
                      <Home className="w-5 h-5 text-primary animate-pulse" />
                      Dashboard
                    </>
                  )}
                  {activeTab === 'parcel' && (
                    <>
                      <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Parcel OTP
                    </>
                  )}
                  {activeTab === 'leave' && (
                    <>
                      <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      Leave Request
                    </>
                  )}
                  {activeTab === 'history' && (
                    <>
                      <History className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Meal History
                    </>
                  )}
                  {activeTab === 'profile' && (
                    <>
                      <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      My Profile
                    </>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {new Date().toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-accent rounded-lg transition-all hover:scale-110 active:scale-95 group"
                >
                  <Bell className="w-5 h-5 group-hover:animate-pulse" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-lg z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
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
                            <div key={index} className="p-4 hover:bg-accent cursor-pointer border-b border-border transition-colors">
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                  notification.type === 'info' ? 'bg-blue-500' :
                                  notification.type === 'warning' ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`} />
                                <div className="flex-1 min-w-0">
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
                          className="text-sm text-primary hover:underline font-medium"
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
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'dashboard' && (
              <DashboardContent 
                profile={profile || null}
                hasLunch={hasLunch}
                hasDinner={hasDinner}
                daysRemaining={daysRemaining}
                totalMeals={totalMeals}
                onNavigate={setActiveTab}
                isLoading={profileLoading || logsLoading}
              />
            )}
            {activeTab === 'parcel' && (
              <ParcelOTPContent
                profile={profile || null}
                showParcelOTP={showParcelOTP}
                setShowParcelOTP={setShowParcelOTP}
              />
            )}
            {activeTab === 'leave' && <LeaveContent profile={profile || null} />}
            {activeTab === 'history' && <HistoryContent profile={profile || null} logs={logs || null} />}
            {activeTab === 'profile' && <ProfileContent profile={profile || null} onSignOut={handleSignOut} />}
            {activeTab === 'notifications' && <NotificationsContent notifications={notifications} />}
          </div>
        </div>
      </main>
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

// Dashboard Content Component
function DashboardContent({ profile, hasLunch, hasDinner, daysRemaining, totalMeals, onNavigate, isLoading }: {
  profile: { id: string; full_name?: string; unique_short_id?: number; photo_url?: string | null; meal_plan?: string | null } | null
  hasLunch: boolean
  hasDinner: boolean
  daysRemaining: number
  totalMeals: number
  onNavigate: (tab: string) => void
  isLoading: boolean
}) {
  const [animatedDays, setAnimatedDays] = useState(0)
  const [animatedMeals, setAnimatedMeals] = useState(0)

  // Animated counter effect
  useEffect(() => {
    if (!isLoading && daysRemaining > 0) {
      const duration = 1000
      const steps = 30
      const increment = daysRemaining / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= daysRemaining) {
          setAnimatedDays(daysRemaining)
          clearInterval(timer)
        } else {
          setAnimatedDays(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [daysRemaining, isLoading])

  useEffect(() => {
    if (!isLoading && totalMeals > 0) {
      const duration = 1000
      const steps = 30
      const increment = totalMeals / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= totalMeals) {
          setAnimatedMeals(totalMeals)
          clearInterval(timer)
        } else {
          setAnimatedMeals(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [totalMeals, isLoading])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Loading */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-2xl p-6 lg:p-8 h-48 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 dark:bg-zinc-800 rounded-2xl p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Enhanced Effects */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-white/3 rounded-full -ml-16 -mt-16 blur-2xl animate-ping" style={{ animationDuration: '3s' }} />
        
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <p className="text-white/90 text-sm font-medium">Welcome back,</p>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold mb-3 animate-in slide-in-from-left duration-500">
              {profile?.full_name || 'Student'}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30 hover:bg-white/30 transition-all hover:scale-105">
                <span className="text-sm font-semibold">ID: #{profile?.unique_short_id || '---'}</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/30 hover:bg-white/30 transition-all hover:scale-105">
                <Utensils className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {profile?.meal_plan === 'L' ? 'Lunch Only' : 
                   profile?.meal_plan === 'D' ? 'Dinner Only' : 
                   profile?.meal_plan === 'DL' ? 'Both Meals' : 'No Plan'}
                </span>
              </div>
            </div>
          </div>
          <div className="relative group/avatar">
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-white/20 rounded-2xl blur-xl group-hover/avatar:blur-2xl transition-all" />
            <div className="relative w-20 h-20 lg:w-24 lg:h-24 bg-white/20 backdrop-blur-sm rounded-2xl overflow-hidden flex items-center justify-center border-4 border-white/30 shadow-2xl animate-in zoom-in duration-500 hover:scale-110 hover:rotate-6 transition-all">
              {profile?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photo_url}
                  alt={profile.full_name || 'Student'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 lg:w-12 lg:h-12 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards with Enhanced Animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          icon={Clock}
          title="Days Remaining"
          value={animatedDays.toString()}
          subtitle="subscription days"
          color={daysRemaining > 7 ? 'green' : daysRemaining > 3 ? 'yellow' : 'red'}
          delay="0ms"
          trend={daysRemaining > 7 ? 'up' : 'down'}
          isUrgent={daysRemaining < 5}
        />
        <StatCard
          icon={Utensils}
          title="Total Meals"
          value={animatedMeals.toString()}
          subtitle="consumed"
          color="blue"
          delay="100ms"
          trend="up"
        />
        <StatCard
          icon={CheckCircle}
          title="Today's Lunch"
          value={hasLunch ? 'Done' : 'Pending'}
          subtitle={hasLunch ? 'consumed' : 'not yet'}
          color={hasLunch ? 'green' : 'gray'}
          delay="200ms"
        />
        <StatCard
          icon={CheckCircle}
          title="Today's Dinner"
          value={hasDinner ? 'Done' : 'Pending'}
          subtitle={hasDinner ? 'consumed' : 'not yet'}
          color={hasDinner ? 'green' : 'gray'}
          delay="300ms"
        />
      </div>

      {/* Quick Actions with Ripple Effect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <QuickActionCard
          icon={Package}
          title="Generate Parcel OTP"
          description="For delegate collection"
          gradient="from-blue-500 to-blue-600"
          onClick={() => onNavigate('parcel')}
          delay="500ms"
        />
        <QuickActionCard
          icon={Calendar}
          title="Mark Leave"
          description="Request meal leave"
          gradient="from-purple-500 to-purple-600"
          onClick={() => onNavigate('leave')}
          delay="600ms"
        />
        <QuickActionCard
          icon={History}
          title="View History"
          description="Past consumption"
          gradient="from-green-500 to-green-600"
          onClick={() => onNavigate('history')}
          delay="700ms"
        />
      </div>

      {/* Subscription Alert with Glow Effect */}
      {daysRemaining <= 7 && (
        <div className={`relative p-6 rounded-2xl border-2 animate-in slide-in-from-bottom-2 duration-500 overflow-hidden group ${
          daysRemaining <= 3 
            ? 'bg-red-50 dark:bg-red-950/20 border-red-500/30' 
            : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500/30'
        }`} style={{ animationDelay: '800ms' }}>
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
            daysRemaining <= 3 ? 'bg-red-500/5' : 'bg-yellow-500/5'
          }`} />
          <div className="flex gap-4 relative z-10">
            <AlertCircle className={`w-6 h-6 flex-shrink-0 animate-pulse ${
              daysRemaining <= 3 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
            }`} />
            <div>
              <h4 className={`font-bold mb-1 ${
                daysRemaining <= 3 ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100'
              }`}>
                {daysRemaining <= 3 ? 'Urgent: Subscription Expiring Soon!' : 'Subscription Running Low'}
              </h4>
              <p className={`text-sm ${
                daysRemaining <= 3 ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                Your subscription will expire in {daysRemaining} days. Please contact the mess owner to renew your subscription.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced Stat Card Component with Trend Indicator
function StatCard({ icon: Icon, title, value, subtitle, color, delay, trend, isUrgent }: {
  icon: React.ElementType
  title: string
  value: string
  subtitle: string
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray'
  delay: string
  trend?: 'up' | 'down'
  isUrgent?: boolean
}) {
  const colorClasses = {
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-500/20',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-500/20',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
    gray: 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-500/20'
  }

  return (
    <div 
      className={`relative bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 animate-in slide-in-from-bottom-2 duration-500 group overflow-hidden`}
      style={{ animationDelay: delay }}
    >
      {isUrgent && (
        <>
          {/* Pulsing Red Background - Dim to Bright */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-100 via-red-50 to-red-100 dark:from-red-900/30 dark:via-red-950/20 dark:to-red-900/30 animate-red-pulse" />
          {/* Shaking Alarm Icon Badge - Bottom Right */}
          <div className="absolute bottom-3 right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-shake-subtle z-20">
            <Bell className="w-4 h-4 text-white" />
          </div>
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${colorClasses[color]} border-2 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <TrendingUp className={`w-5 h-5 ${trend === 'down' ? 'rotate-180' : ''} ${
              trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`} />
          )}
        </div>
        <h3 className="text-3xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{value}</h3>
        <p className="text-sm font-medium text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

// Enhanced Quick Action Card Component with Ripple Effect
function QuickActionCard({ icon: Icon, title, description, gradient, onClick, delay }: {
  icon: React.ElementType
  title: string
  description: string
  gradient: string
  onClick: () => void
  delay: string
}) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples([...ripples, { x, y, id }])
    setTimeout(() => {
      setRipples(ripples => ripples.filter(r => r.id !== id))
    }, 600)
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      className="relative group bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 text-left animate-in slide-in-from-bottom-2 duration-500 overflow-hidden"
      style={{ animationDelay: delay }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-primary/30 rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
          }}
        />
      ))}
      <div className="relative z-10">
        <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}

// Parcel OTP Content Component (continuing in next part...)

// PARCEL OTP CONTENT - Enhanced with Dashboard Color Theme
function ParcelOTPContent({ profile, showParcelOTP, setShowParcelOTP }: {
  profile: { id: string; full_name?: string } | null
  showParcelOTP: boolean
  setShowParcelOTP: (show: boolean) => void
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentOTP, setCurrentOTP] = useState<{ code: string; expiresAt: string } | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpHistory, setOtpHistory] = useState<Array<{
    otp_id: string
    otp_code: string
    created_at: string
    expires_at: string
    is_used: boolean
  }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [selectedOTP, setSelectedOTP] = useState<{
    otp_id: string
    otp_code: string
    created_at: string
    expires_at: string
    is_used: boolean
  } | null>(null)
  const supabase = createClient()

  // Fetch OTP history
  useEffect(() => {
    const fetchOTPHistory = async () => {
      if (!profile?.id) return
      
      try {
        const { data, error } = await supabase
          .from('parcel_otps')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error
        setOtpHistory(data || [])
      } catch (err) {
        console.error('Error fetching OTP history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchOTPHistory()
  }, [profile?.id, supabase])

  // Generate 6-digit OTP
  const generateOTP = async () => {
    if (!profile?.id) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

      const { error: insertError } = await supabase
        .from('parcel_otps')
        .insert({
          user_id: profile.id,
          otp_code: otpCode,
          expires_at: expiresAt,
          is_used: false
        })

      if (insertError) throw insertError

      setCurrentOTP({ code: otpCode, expiresAt })
      setShowParcelOTP(true)
      setShowConfetti(true)
      
      // Refresh history
      const { data } = await supabase
        .from('parcel_otps')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) setOtpHistory(data)
      
      setTimeout(() => setShowConfetti(false), 3000)
    } catch (err) {
      console.error('Error generating OTP:', err)
      setError('Failed to generate OTP. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const closeModal = () => {
    setShowParcelOTP(false)
    setCurrentOTP(null)
    setShowConfetti(false)
  }

  const closeDetailsModal = () => {
    setSelectedOTP(null)
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const diff = expiry - now
    if (diff <= 0) return 'Expired'
    const minutes = Math.floor(diff / 60000)
    return `${minutes} min left`
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header matching dashboard style */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-blue-400/30 shadow-xl">
            <Package className="w-8 h-8 text-blue-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Parcel OTP</h2>
            <p className="text-slate-300 text-sm">Generate secure OTP for parcel collection</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Main Card - Dashboard Style */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Generate New OTP</h3>
              <p className="text-xs text-muted-foreground">Valid for 15 minutes</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-xl p-5 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-blue-900/30 group hover:scale-105 transition-all shadow-md">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-transparent dark:from-blue-900/20 animate-pulse" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1 text-blue-900 dark:text-blue-100">Quick & Secure</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">OTP expires in 15 minutes</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl p-5 border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-green-900/30 group hover:scale-105 transition-all shadow-md">
              <div className="absolute inset-0 bg-gradient-to-r from-green-100/50 to-transparent dark:from-green-900/20 animate-pulse" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1 text-green-900 dark:text-green-100">Easy Collection</h3>
                  <p className="text-xs text-green-700 dark:text-green-300">Share with anyone to collect</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateOTP}
            disabled={isGenerating}
            className="relative w-full py-6 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
          >
            {isGenerating ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-primary/30 animate-pulse" />
                <span className="relative flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Generating OTP...
                </span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate New OTP
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* OTP History */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Recent OTPs</h3>
              <p className="text-xs text-muted-foreground">Click on any OTP to view details</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : otpHistory.length > 0 ? (
            otpHistory.map((otp, index) => {
              const isExpired = new Date(otp.expires_at).getTime() < Date.now()
              return (
                <button
                  key={otp.otp_id}
                  onClick={() => setSelectedOTP(otp)}
                  className="w-full p-5 hover:bg-accent/30 transition-all duration-300 animate-in slide-in-from-right-2 text-left cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        otp.is_used 
                          ? 'bg-gray-100 dark:bg-gray-900/30' 
                          : isExpired
                          ? 'bg-red-100 dark:bg-red-950/30'
                          : 'bg-green-100 dark:bg-green-950/30'
                      }`}>
                        {otp.is_used ? (
                          <CheckCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        ) : isExpired ? (
                          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-lg tracking-wider">{otp.otp_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(otp.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      otp.is_used
                        ? 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400'
                        : isExpired
                        ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                    }`}>
                      {otp.is_used ? 'Used' : isExpired ? 'Expired' : getTimeRemaining(otp.expires_at)}
                    </span>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="p-16 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No OTPs generated yet</p>
            </div>
          )}
        </div>
      </div>

      {/* OTP Modal */}
      {showParcelOTP && currentOTP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          {/* Confetti Effect */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-10%',
                    backgroundColor: ['#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981'][Math.floor(Math.random() * 5)],
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-border animate-in zoom-in-95 duration-300 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-all hover:scale-110 hover:rotate-90 duration-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-500">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-center mb-2">OTP Generated!</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">Share this code to collect your parcel</p>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 mb-6 border-2 border-primary/20 animate-glow">
              <p className="text-6xl font-bold text-center tracking-wider bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {currentOTP.code}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
              <Clock className="w-4 h-4" />
              <span>Expires in 15 minutes</span>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentOTP.code)
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Copy OTP
              </button>
              <button
                onClick={closeModal}
                className="w-full py-3 rounded-xl border-2 border-border bg-accent hover:bg-accent/80 font-semibold transition-all hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Details Modal */}
      {selectedOTP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-border animate-in zoom-in-95 duration-300 relative">
            <button
              onClick={closeDetailsModal}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-all hover:scale-110 hover:rotate-90 duration-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                selectedOTP.is_used
                  ? 'bg-gradient-to-br from-gray-500 to-gray-600'
                  : new Date(selectedOTP.expires_at).getTime() < Date.now()
                  ? 'bg-gradient-to-br from-red-500 to-red-600'
                  : 'bg-gradient-to-br from-green-500 to-emerald-500'
              }`}>
                {selectedOTP.is_used ? (
                  <CheckCircle className="w-10 h-10 text-white" />
                ) : new Date(selectedOTP.expires_at).getTime() < Date.now() ? (
                  <XCircle className="w-10 h-10 text-white" />
                ) : (
                  <Clock className="w-10 h-10 text-white" />
                )}
              </div>
            </div>

            <h3 className="text-2xl font-bold text-center mb-2">OTP Details</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {selectedOTP.is_used ? 'This OTP has been used' : 
               new Date(selectedOTP.expires_at).getTime() < Date.now() ? 'This OTP has expired' : 
               'This OTP is active'}
            </p>

            <div className="space-y-4">
              {/* OTP Code */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border-2 border-primary/20">
                <p className="text-5xl font-bold text-center tracking-wider bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {selectedOTP.otp_code}
                </p>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-accent/50 rounded-xl">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedOTP.is_used
                      ? 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400'
                      : new Date(selectedOTP.expires_at).getTime() < Date.now()
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                  }`}>
                    {selectedOTP.is_used ? 'Used' : 
                     new Date(selectedOTP.expires_at).getTime() < Date.now() ? 'Expired' : 'Active'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/50 rounded-xl">
                  <span className="text-sm font-medium text-muted-foreground">Generated</span>
                  <span className="text-sm font-bold">{formatDateTime(selectedOTP.created_at)}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-accent/50 rounded-xl">
                  <span className="text-sm font-medium text-muted-foreground">Expires</span>
                  <span className="text-sm font-bold">{formatDateTime(selectedOTP.expires_at)}</span>
                </div>

                {selectedOTP.is_used && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-200 dark:border-gray-900/50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Usage Information</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This OTP was used for parcel collection. The owner verified and marked it as used in the system.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={closeDetailsModal}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// LEAVE REQUEST CONTENT - Enhanced with Dashboard Color Theme
function LeaveContent({ profile }: { profile: { id: string; full_name?: string } | null }) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [leaveHistory, setLeaveHistory] = useState<Array<{
    leave_id: string
    start_date: string
    end_date: string
    is_approved: boolean
    created_at: string
  }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const supabase = createClient()

  // Fetch leave history
  useEffect(() => {
    const fetchLeaveHistory = async () => {
      if (!profile?.id) return
      
      try {
        const { data, error } = await supabase
          .from('leaves')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setLeaveHistory(data || [])
      } catch (err) {
        console.error('Error fetching leave history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchLeaveHistory()
  }, [profile?.id, supabase])

  // Form validation
  const validateForm = (): string | null => {
    if (!startDate || !endDate) {
      return 'Please select both start and end dates'
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (start < today) {
      return 'Start date cannot be in the past'
    }

    if (end < start) {
      return 'End date must be after start date'
    }

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 30) {
      return 'Leave duration cannot exceed 30 days'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile?.id) return

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('leaves')
        .insert({
          user_id: profile.id,
          start_date: startDate,
          end_date: endDate,
          is_approved: false
        })

      if (insertError) throw insertError

      setSuccess(true)
      setStartDate('')
      setEndDate('')
      setReason('')

      // Refresh leave history
      const { data } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) setLeaveHistory(data)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error submitting leave:', err)
      setError('Failed to submit leave request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header matching dashboard style */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-purple-400/30 shadow-xl">
            <Calendar className="w-8 h-8 text-purple-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Leave Request</h2>
            <p className="text-slate-300 text-sm">Request leave for your meal subscription</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Leave request submitted successfully!</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Leave Request Form - Dashboard Style */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center animate-pulse">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Request New Leave</h3>
              <p className="text-xs text-muted-foreground">Fill in the details below</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-foreground">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium hover:border-primary/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-foreground">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium hover:border-primary/50"
                  required
                />
              </div>
            </div>

            {/* Duration Display */}
            {startDate && endDate && calculateDays() > 0 && (
              <div className="relative overflow-hidden rounded-xl p-5 border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 animate-in slide-in-from-top-2 duration-300 group hover:scale-105 transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent animate-pulse" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Leave Duration</span>
                  </div>
                  <span className="text-3xl font-bold text-primary">
                    {calculateDays()} {calculateDays() === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="relative w-full py-6 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
            >
              {isSubmitting ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-primary/30 animate-pulse" />
                  <span className="relative flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Submit Leave Request
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Leave History</h3>
              <p className="text-xs text-muted-foreground">Your recent leave requests</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : leaveHistory.length > 0 ? (
            leaveHistory.map((leave, index) => (
              <div 
                key={leave.leave_id} 
                className="p-5 hover:bg-accent/30 transition-all duration-300 animate-in slide-in-from-right-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      leave.is_approved 
                        ? 'bg-green-100 dark:bg-green-950/30' 
                        : 'bg-yellow-100 dark:bg-yellow-950/30'
                    }`}>
                      {leave.is_approved ? (
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold">
                        {new Date(leave.start_date).toLocaleDateString('en-IN')} - {new Date(leave.end_date).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    leave.is_approved
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                  }`}>
                    {leave.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-16 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No leave requests yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// HISTORY CONTENT - Enhanced with Dashboard Color Theme & Advanced Filters
function HistoryContent({ profile, logs }: {
  profile: { id: string } | null
  logs: Array<{
    log_id: string
    user_id: string
    meal_type: string
    status: string
    created_at: string
  }> | null | undefined
}) {
  const [filter, setFilter] = useState<'ALL' | 'LUNCH' | 'DINNER'>('ALL')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const userLogs = logs?.filter((log) => log.user_id === profile?.id) || []

  // Filter by meal type
  const filteredByMeal = filter === 'ALL' 
    ? userLogs 
    : userLogs.filter(log => log.meal_type === filter)

  // Filter by date range
  const now = new Date()
  const filteredByDate = filteredByMeal.filter(log => {
    const logDate = new Date(log.created_at)
    
    if (dateRange === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return logDate >= today && logDate < tomorrow
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return logDate >= weekAgo
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return logDate >= monthAgo
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59, 999)
      return logDate >= start && logDate <= end
    }
    return true
  })

  // Search filter
  const filteredLogs = filteredByDate.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.meal_type.toLowerCase().includes(query) ||
      new Date(log.created_at).toLocaleDateString('en-IN').includes(query)
    )
  })

  // Sort logs
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })

  // Calculate stats
  const totalMeals = sortedLogs.length
  const lunchCount = sortedLogs.filter(log => log.meal_type === 'LUNCH').length
  const dinnerCount = sortedLogs.filter(log => log.meal_type === 'DINNER').length
  const thisMonthCount = userLogs.filter(log => {
    const logDate = new Date(log.created_at)
    return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear()
  }).length
  const todayCount = userLogs.filter(log => {
    const logDate = new Date(log.created_at)
    const today = new Date()
    return logDate.toDateString() === today.toDateString()
  }).length

  // Group logs by date
  const groupedLogs = sortedLogs.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('en-IN')
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {} as Record<string, typeof sortedLogs>)

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header matching dashboard style */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-green-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-green-400/30 shadow-xl">
            <History className="w-8 h-8 text-green-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Meal History</h2>
            <p className="text-slate-300 text-sm">Track your consumption records</p>
          </div>
        </div>
      </div>

      {/* Stats Cards - Dashboard Style */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-primary/10 border-2 border-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Utensils className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{totalMeals}</h3>
            <p className="text-sm font-medium text-foreground mb-1">Total Meals</p>
            <p className="text-xs text-muted-foreground">filtered results</p>
          </div>
        </div>

        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 border-2 border-green-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{lunchCount}</h3>
            <p className="text-sm font-medium text-foreground mb-1">Lunch</p>
            <p className="text-xs text-muted-foreground">meals consumed</p>
          </div>
        </div>

        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/30 border-2 border-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{dinnerCount}</h3>
            <p className="text-sm font-medium text-foreground mb-1">Dinner</p>
            <p className="text-xs text-muted-foreground">meals consumed</p>
          </div>
        </div>

        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/30 border-2 border-orange-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{thisMonthCount}</h3>
            <p className="text-sm font-medium text-foreground mb-1">This Month</p>
            <p className="text-xs text-muted-foreground">total meals</p>
          </div>
        </div>

        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/30 border-2 border-blue-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{todayCount}</h3>
            <p className="text-sm font-medium text-foreground mb-1">Today</p>
            <p className="text-xs text-muted-foreground">meals consumed</p>
          </div>
        </div>
      </div>

      {/* Basic Filters - Always Visible */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Quick Filters</h3>
              <p className="text-xs text-muted-foreground">Filter your meal history</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Meal Type Filter */}
          <div>
            <label className="block text-sm font-bold mb-3">Meal Type</label>
            <div className="flex gap-2 flex-wrap">
              {(['ALL', 'LUNCH', 'DINNER'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    filter === type
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg scale-105'
                      : 'bg-accent hover:bg-accent/80 text-foreground hover:scale-105'
                  }`}
                >
                  {type === 'ALL' ? 'All Meals' : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-bold mb-3">Date Range</label>
            <div className="flex gap-2 flex-wrap">
              {(['today', 'week', 'month', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    dateRange === range
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg scale-105'
                      : 'bg-accent hover:bg-accent/80 text-foreground hover:scale-105'
                  }`}
                >
                  {range === 'today' ? 'Today' : 
                   range === 'week' ? 'Last 7 Days' : 
                   range === 'month' ? 'Last 30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-accent/50 hover:bg-accent transition-all border border-border group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-all">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold">Advanced Filters</span>
            </div>
            <div className={`transition-transform duration-300 ${showAdvancedFilters ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* Advanced Filters - Collapsible */}
          {showAdvancedFilters && (
            <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
              {/* Search Bar */}
              <div>
                <label className="block text-sm font-bold mb-3">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by meal type or date..."
                    className="w-full px-4 py-3 pl-10 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
                  />
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              {/* Custom Date Range */}
              <div>
                <label className="block text-sm font-bold mb-3">Custom Date Range</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value)
                        setDateRange('custom')
                      }}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value)
                        setDateRange('custom')
                      }}
                      min={customStartDate}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Sort & View Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-3">Sort Order</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortOrder('newest')}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        sortOrder === 'newest'
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg'
                          : 'bg-accent hover:bg-accent/80 text-foreground'
                      }`}
                    >
                      Newest First
                    </button>
                    <button
                      onClick={() => setSortOrder('oldest')}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        sortOrder === 'oldest'
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg'
                          : 'bg-accent hover:bg-accent/80 text-foreground'
                      }`}
                    >
                      Oldest First
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-3">View Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('grouped')}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        viewMode === 'grouped'
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg'
                          : 'bg-accent hover:bg-accent/80 text-foreground'
                      }`}
                    >
                      Grouped
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        viewMode === 'list'
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg'
                          : 'bg-accent hover:bg-accent/80 text-foreground'
                      }`}
                    >
                      List
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meal History List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Consumption Records</h3>
                <p className="text-xs text-muted-foreground">
                  {sortedLogs.length} {sortedLogs.length === 1 ? 'meal' : 'meals'} found
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-h-[600px] overflow-y-auto">
          {sortedLogs.length > 0 ? (
            viewMode === 'grouped' ? (
              // Grouped View
              Object.entries(groupedLogs).map(([date, dateLogs], dateIndex) => (
                <div key={date} className="border-b border-border last:border-0">
                  <div className="px-6 py-3 bg-accent/20 sticky top-0 z-10 backdrop-blur-sm">
                    <p className="text-sm font-bold text-foreground">{date}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {dateLogs.map((log, logIndex) => (
                      <div 
                        key={log.log_id} 
                        className="p-5 hover:bg-accent/30 transition-all duration-300 animate-in slide-in-from-right-2"
                        style={{ animationDelay: `${(dateIndex * 100) + (logIndex * 50)}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            log.meal_type === 'LUNCH'
                              ? 'bg-yellow-100 dark:bg-yellow-950/30'
                              : 'bg-purple-100 dark:bg-purple-950/30'
                          }`}>
                            <Utensils className={`w-6 h-6 ${
                              log.meal_type === 'LUNCH'
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-purple-600 dark:text-purple-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold">{log.meal_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString('en-IN', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              // List View
              <div className="divide-y divide-border">
                {sortedLogs.map((log, index) => (
                  <div 
                    key={log.log_id} 
                    className="p-5 hover:bg-accent/30 transition-all duration-300 animate-in slide-in-from-right-2"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        log.meal_type === 'LUNCH'
                          ? 'bg-yellow-100 dark:bg-yellow-950/30'
                          : 'bg-purple-100 dark:bg-purple-950/30'
                      }`}>
                        <Utensils className={`w-6 h-6 ${
                          log.meal_type === 'LUNCH'
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{log.meal_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </p>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="p-16 text-center">
              <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-medium">No meals found for selected filters</p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
// PROFILE CONTENT - Full Implementation with Editing Capability
function ProfileContent({ profile, onSignOut }: {
  profile: {
    id: string
    full_name?: string
    unique_short_id?: number
    photo_url?: string | null
    phone?: string | null
    address?: string | null
    meal_plan?: string | null
    subscription_start_date?: string | null
    subscription_end_date?: string | null
    is_active?: boolean
    photo_update_allowed?: boolean
    permission_expires_at?: string | null
  } | null
  onSignOut: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const supabase = createClient()

  const daysRemaining = profile?.subscription_end_date 
    ? Math.ceil((new Date(profile.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Check if photo upload permission is valid
  const canUpdatePhoto = profile?.photo_update_allowed && 
    profile?.permission_expires_at && 
    new Date(profile.permission_expires_at) > new Date()

  const getTimeRemaining = () => {
    if (!profile?.permission_expires_at) return null
    const now = new Date().getTime()
    const expiry = new Date(profile.permission_expires_at).getTime()
    const diff = expiry - now
    if (diff <= 0) return 'Expired'
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    // Check permission
    if (!canUpdatePhoto) {
      setError('You do not have permission to update your photo. Please contact the mess owner.')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB')
      return
    }

    setIsUploadingPhoto(true)
    setError(null)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update user profile and disable photo update permission
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          photo_url: publicUrl,
          photo_update_allowed: false,
          permission_expires_at: null
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error('Error uploading photo:', err)
      setError('Failed to upload photo. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header matching dashboard style */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-orange-400/30 shadow-xl">
            <User className="w-8 h-8 text-orange-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">My Profile</h2>
            <p className="text-slate-300 text-sm">View your account information</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Photo updated successfully!</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Photo Upload Permission Notice */}
      {canUpdatePhoto && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500/30 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">Photo Update Enabled</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You can update your profile photo. Permission expires in {getTimeRemaining()}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-yellow-400/10 animate-pulse" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col items-center -mt-16">
            {/* Profile Photo */}
            <div className="relative group">
              <div className="w-28 h-28 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-2xl">
                {isUploadingPhoto ? (
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                ) : profile?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name || 'Student'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-14 h-14 text-muted-foreground" />
                )}
              </div>
              
              {/* Photo Upload Button - Only shown if permission is granted */}
              {canUpdatePhoto && (
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all hover:scale-110 opacity-0 group-hover:opacity-100">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={isUploadingPhoto}
                  />
                  <Sparkles className="w-5 h-5 text-white" />
                </label>
              )}
            </div>

            <h3 className="text-2xl font-bold mt-4">{profile?.full_name || 'Student'}</h3>
            <p className="text-sm text-muted-foreground">Student</p>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold border-2 border-primary/20">
              <Hash className="w-4 h-4" />
              {profile?.unique_short_id || '---'}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            {/* Info Notice */}
            <div className="bg-accent/50 border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Profile Information</p>
                  <p className="text-xs text-muted-foreground">
                    Your profile details are managed by the mess owner. Contact them for any updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Full Name (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Full Name</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border">
                <p className="font-semibold text-foreground">{profile?.full_name || 'Not set'}</p>
              </div>
            </div>

            {/* Phone Number (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Phone Number</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border">
                <p className="font-semibold text-foreground">{profile?.phone || 'Not set'}</p>
              </div>
            </div>

            {/* Address (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Address</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border min-h-[80px]">
                <p className="font-semibold text-foreground">{profile?.address || 'Not set'}</p>
              </div>
            </div>

            {/* Meal Plan (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Meal Plan</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-primary" />
                  <p className="font-semibold text-foreground">
                    {profile?.meal_plan === 'DL' ? 'Lunch & Dinner' : 
                     profile?.meal_plan === 'L' ? 'Lunch Only' : 
                     profile?.meal_plan === 'D' ? 'Dinner Only' : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription Status */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Subscription Status</label>
              <div className={`p-5 rounded-xl border-2 ${
                daysRemaining > 7 ? 'bg-green-50 dark:bg-green-950/20 border-green-500/30' :
                daysRemaining > 3 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500/30' :
                'bg-red-50 dark:bg-red-950/20 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-bold text-4xl ${
                      daysRemaining > 7 ? 'text-green-600 dark:text-green-400' :
                      daysRemaining > 3 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>{daysRemaining}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">days remaining</p>
                  </div>
                  {daysRemaining > 7 ? (
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                  ) : daysRemaining > 3 ? (
                    <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="mt-8">
            <Button
              variant="outline"
              className="w-full py-6 text-base font-semibold rounded-xl border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-all group"
              onClick={onSignOut}
            >
              <LogOut className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Sign Out
            </Button>
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
              <div 
                key={index} 
                className="p-6 hover:bg-accent transition-colors cursor-pointer animate-in slide-in-from-left duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
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
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
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
