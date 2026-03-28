'use client'

import { useDailyLogs } from '@/hooks/use-daily-logs'
import { useProfile } from '@/hooks/use-profile'
import { StudentsList } from '@/components/owner/students-list'
import { AnalyticsDashboard } from '@/components/owner/analytics-dashboard'
import { SettingsPanel } from '@/components/owner/settings-panel'
import { ProfilePage } from '@/components/owner/profile-page'
import { OwnerDashboardContent } from '@/components/owner/dashboard-content'
import { VerifyContent } from '@/components/owner/verify-content'
import { MenuPhotoPage } from '@/components/owner/menu-photo-page'
import { DashboardSidebar } from '@/components/shared/dashboard-sidebar'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { NotificationsContent } from '@/components/shared/notifications-content'
import type { SidebarNavItem } from '@/components/shared/dashboard-sidebar'
import type { HeaderTab } from '@/components/shared/dashboard-header'
import { useUIStore } from '@/store/ui-store'
import { useAuthStore } from '@/store/auth-store'
import { useState, useEffect } from 'react'
import { LeaveRequests } from '@/components/owner/leave-requests'
import { createClient } from '@/lib/supabase/client'
import { runMaintenanceTasks, shouldRunMaintenance, updateMaintenanceTimestamp } from '@/lib/subscription-maintenance'
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings,
  Hash,
  UserCheck,
  Bell,
  UtensilsCrossed,
  Calendar,
} from 'lucide-react'
import { signOut } from '@/app/auth/actions'

// --- Constants ---

const OWNER_NAV_ITEMS: SidebarNavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', tab: 'dashboard' },
  { icon: Hash, label: 'Verify Meal', tab: 'verify' },
  { icon: Users, label: 'Students', tab: 'students' },
  { icon: Calendar, label: 'Leave Requests', tab: 'leaves' },
  { icon: BarChart3, label: 'Analytics', tab: 'analytics' },
  { icon: UtensilsCrossed, label: 'Menu Photo', tab: 'menu' },
  { icon: Settings, label: 'Settings', tab: 'settings' },
  { icon: UserCheck, label: 'Profile', tab: 'profile' },
]

const OWNER_HEADER_TABS: HeaderTab[] = [
  { tab: 'dashboard', icon: LayoutDashboard, label: 'Dashboard Overview', color: 'text-blue-600 dark:text-blue-400' },
  { tab: 'verify', icon: Hash, label: 'Verify Meal', color: 'text-green-600 dark:text-green-400' },
  { tab: 'students', icon: Users, label: 'Student Management', color: 'text-purple-600 dark:text-purple-400' },
  { tab: 'leaves', icon: Calendar, label: 'Leave Requests', color: 'text-yellow-600 dark:text-yellow-400' },
  { tab: 'analytics', icon: BarChart3, label: 'Analytics & Reports', color: 'text-orange-600 dark:text-orange-400' },
  { tab: 'menu', icon: UtensilsCrossed, label: 'Menu Photo', color: 'text-amber-600 dark:text-amber-400' },
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
  const { logs, isPending: isLoading } = useDailyLogs()
  const { data: profile } = useProfile()
  
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
  
  // Run maintenance tasks on dashboard load (max once per hour)
  useEffect(() => {
    const runMaintenance = async () => {
      if (shouldRunMaintenance()) {
        const supabase = createClient()
        await runMaintenanceTasks(supabase)
        updateMaintenanceTimestamp()
      }
    }
    
    runMaintenance()
  }, [])
  
  const [notifications] = useState<Array<{
    type: string; title: string; message: string; time: string
  }>>([])

  const handleSignOut = () => {
    signOut()
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

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-zinc-950 flex flex-col">
          {activeTab === 'dashboard' && (
            <OwnerDashboardContent stats={todayStats} logs={logs || null} isLoading={isLoading} />
          )}
          {activeTab === 'verify' && <VerifyContent />}
          {activeTab === 'students' && <StudentsList />}
          {activeTab === 'leaves' && <LeaveRequests />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'menu' && <MenuPhotoPage />}
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
