'use client'

import { useDailyLogs } from '@/hooks/use-daily-logs'
import { useProfile } from '@/hooks/use-profile'
import { StudentsList } from '@/components/owner/students-list'
import { AnalyticsDashboard } from '@/components/owner/analytics-dashboard'
import { SettingsPanel } from '@/components/owner/settings-panel'
import { ProfilePage } from '@/components/owner/profile-page'
import { OwnerDashboardContent } from '@/components/owner/dashboard-content'
import { VerifyContent } from '@/components/owner/verify-content'
import { DashboardSidebar } from '@/components/shared/dashboard-sidebar'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { NotificationsContent } from '@/components/shared/notifications-content'
import type { SidebarNavItem } from '@/components/shared/dashboard-sidebar'
import type { HeaderTab } from '@/components/shared/dashboard-header'
import { useUIStore } from '@/store/ui-store'
import { useAuthStore } from '@/store/auth-store'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings,
  Hash,
  UserCheck,
  Bell,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// --- Constants ---

const OWNER_NAV_ITEMS: SidebarNavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', tab: 'dashboard' },
  { icon: Hash, label: 'Verify Meal', tab: 'verify' },
  { icon: Users, label: 'Students', tab: 'students' },
  { icon: BarChart3, label: 'Analytics', tab: 'analytics' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
  { icon: UserCheck, label: 'Profile', tab: 'profile' },
]

const OWNER_HEADER_TABS: HeaderTab[] = [
  { tab: 'dashboard', icon: LayoutDashboard, label: 'Dashboard Overview', color: 'text-blue-600 dark:text-blue-400' },
  { tab: 'verify', icon: Hash, label: 'Verify Meal', color: 'text-green-600 dark:text-green-400' },
  { tab: 'students', icon: Users, label: 'Student Management', color: 'text-purple-600 dark:text-purple-400' },
  { tab: 'analytics', icon: BarChart3, label: 'Analytics & Reports', color: 'text-orange-600 dark:text-orange-400' },
  { tab: 'settings', icon: Settings, label: 'Settings', color: 'text-gray-600 dark:text-gray-400' },
  { tab: 'profile', icon: UserCheck, label: 'My Profile', color: 'text-indigo-600 dark:text-indigo-400' },
  { tab: 'notifications', icon: Bell, label: 'Notifications', color: 'text-red-600 dark:text-red-400' },
]

const SEARCH_ACTIONS = [
  { icon: Hash, label: 'Verify Meal', tab: 'verify', color: 'text-green-600 dark:text-green-400' },
  { icon: Users, label: 'View Students', tab: 'students', color: 'text-purple-600 dark:text-purple-400' },
  { icon: BarChart3, label: 'View Analytics', tab: 'analytics', color: 'text-orange-600 dark:text-orange-400' },
]

export default function OwnerDashboard() {
  const { logs, isLoading } = useDailyLogs()
  const { data: profile } = useProfile()
  const router = useRouter()
  const supabase = createClient()
  
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

  useEffect(() => {
    if (profile) setUser(profile)
  }, [profile, setUser])
  
  const [notifications] = useState<Array<{
    type: string; title: string; message: string; time: string
  }>>([])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const todayStats = {
    totalMeals: logs?.length || 0,
    lunchCount: logs?.filter(l => l.meal_type === 'LUNCH').length || 0,
    dinnerCount: logs?.filter(l => l.meal_type === 'DINNER').length || 0,
    revenue: (logs?.length || 0) * 50
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 overflow-hidden">
      <DashboardSidebar
        portalLabel="Owner Portal"
        navItems={OWNER_NAV_ITEMS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        profile={profile || null}
        roleLabel="Owner"
        onSignOut={handleSignOut}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          tabs={OWNER_HEADER_TABS}
          activeTab={activeTab}
          notifications={notifications}
          showNotifications={showNotifications}
          onToggleNotifications={setShowNotifications}
          onViewAllNotifications={() => setActiveTab('notifications')}
          showSearch={true}
          searchOpen={showSearch}
          onToggleSearch={setShowSearch}
          searchActions={SEARCH_ACTIONS}
          onSearchAction={setActiveTab}
        />

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-zinc-950">
          {activeTab === 'dashboard' && (
            <OwnerDashboardContent stats={todayStats} logs={logs || null} isLoading={isLoading} />
          )}
          {activeTab === 'verify' && <VerifyContent />}
          {activeTab === 'students' && <StudentsList />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'settings' && <SettingsPanel />}
          {activeTab === 'profile' && <ProfilePage profile={profile || null} />}
          {activeTab === 'notifications' && (
            <NotificationsContent notifications={notifications} enhanced />
          )}
        </div>
      </main>
    </div>
  )
}
