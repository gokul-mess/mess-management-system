'use client'

import { useState, useEffect, useMemo } from 'react'
import { useProfile } from '@/hooks/use-profile'
import { useDailyLogs } from '@/hooks/use-daily-logs'
import { useAllLogs } from '@/hooks/use-all-logs'
import { useUIStore } from '@/store/ui-store'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/lib/supabase/client'
import { DashboardSidebar, MobileSidebar } from '@/components/shared/dashboard-sidebar'
import { DashboardHeader } from '@/components/shared/dashboard-header'
import { StudentDashboardContent } from '@/components/student/dashboard-content'
import { ParcelOTPContent } from '@/components/student/parcel-otp-content'
import { LeaveContent } from '@/components/student/leave-content'
import { HistoryContent } from '@/components/student/history-content'
import { ProfileContent } from '@/components/student/profile-content'
import { NotificationsContent } from '@/components/shared/notifications-content'
import { ReportsContent } from '@/components/student/reports-content'
import type { SidebarNavItem } from '@/components/shared/dashboard-sidebar'
import type { HeaderTab } from '@/components/shared/dashboard-header'
import {
  Home,
  Package,
  Calendar,
  History,
  User,
  Sparkles,
  FileText,
} from 'lucide-react'
import { signOut } from '@/app/auth/actions'

// --- Constants ---

const STUDENT_NAV_ITEMS: SidebarNavItem[] = [
  { icon: Home, label: 'Dashboard', tab: 'dashboard' },
  { icon: Package, label: 'Parcel OTP', tab: 'parcel' },
  { icon: Calendar, label: 'Leave Request', tab: 'leave' },
  { icon: History, label: 'Meal History', tab: 'history' },
  { icon: FileText, label: 'Reports', tab: 'reports' },
  { icon: User, label: 'My Profile', tab: 'profile' },
]

const STUDENT_HEADER_TABS: HeaderTab[] = [
  { tab: 'dashboard', icon: Home, label: 'Dashboard', color: 'text-primary' },
  { tab: 'parcel', icon: Package, label: 'Parcel OTP', color: 'text-blue-600 dark:text-blue-400' },
  { tab: 'leave', icon: Calendar, label: 'Leave Request', color: 'text-purple-600 dark:text-purple-400' },
  { tab: 'history', icon: History, label: 'Meal History', color: 'text-green-600 dark:text-green-400' },
  { tab: 'reports', icon: FileText, label: 'Reports', color: 'text-cyan-600 dark:text-cyan-400' },
  { tab: 'profile', icon: User, label: 'My Profile', color: 'text-orange-600 dark:text-orange-400' },
]

export default function StudentDashboard() {
  const { data: profile, isPending: profileLoading } = useProfile()
  const { logs, isPending: logsLoading } = useDailyLogs()
  const { logs: allLogs } = useAllLogs(profile?.id)

  const { activeTab, setActiveTab, showParcelOTP, setShowParcelOTP, sidebarCollapsed, toggleSidebar } = useUIStore()
  const { setUser } = useAuthStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [now] = useState(() => Date.now())
  const [messEndDate, setMessEndDate] = useState<string | null>(null)
  const [messActiveMealPlan, setMessActiveMealPlan] = useState<string | null>(null)
  const [approvedLeaveDays, setApprovedLeaveDays] = useState<number>(0)

  // Fetch active mess period and approved leave days
  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()
    
    // Fetch active mess period
    supabase
      .from('mess_periods')
      .select('start_date, end_date, meal_plan')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.end_date) setMessEndDate(data.end_date)
        if (data?.meal_plan) setMessActiveMealPlan(data.meal_plan)
        
        // Fetch approved leaves within this mess period
        if (data?.start_date && data?.end_date) {
          supabase
            .from('leaves')
            .select('start_date, end_date')
            .eq('user_id', profile.id)
            .eq('is_approved', true)
            // Fetch leaves that overlap with the mess period
            // A leave overlaps if: leave.start_date <= mess.end_date AND leave.end_date >= mess.start_date
            .lte('start_date', data.end_date)
            .gte('end_date', data.start_date)
            .then(({ data: leaves }) => {
              if (leaves && leaves.length > 0) {
                // Calculate total leave days (inclusive) within the mess period
                const totalLeaveDays = leaves.reduce((sum, leave) => {
                  // Clamp leave dates to mess period boundaries
                  const leaveStart = new Date(leave.start_date)
                  const leaveEnd = new Date(leave.end_date)
                  const messStart = new Date(data.start_date!)
                  const messEnd = new Date(data.end_date!)
                  
                  // Get the overlapping range
                  const overlapStart = leaveStart > messStart ? leaveStart : messStart
                  const overlapEnd = leaveEnd < messEnd ? leaveEnd : messEnd
                  
                  // Calculate days (inclusive: both start and end dates count)
                  const days = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
                  return sum + days
                }, 0)
                setApprovedLeaveDays(totalLeaveDays)
              } else {
                setApprovedLeaveDays(0)
              }
            })
        }
      })
  }, [profile?.id])

  useEffect(() => {
    if (profile) setUser(profile)
  }, [profile, setUser])

  // Build subscription-based notifications using mess period end date
  const notifications = useMemo(() => {
    if (!profile?.id) return []
    const items: Array<{ type: string; title: string; message: string; time: string }> = []
    const daysLeft = messEndDate
      ? Math.max(0, Math.round((new Date(messEndDate).setHours(0,0,0,0) - new Date(new Date(now).toISOString().split('T')[0]).getTime()) / 86400000))
      : 0

    if (daysLeft > 0 && daysLeft <= 5) {
      items.push({
        type: 'warning',
        title: 'Subscription Expiring Soon',
        message: `Your subscription will expire in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please renew to continue enjoying meals.`,
        time: 'Just now',
      })
    } else if (daysLeft <= 0 && messEndDate) {
      items.push({
        type: 'error',
        title: 'Subscription Expired',
        message: 'Your subscription has expired. Please contact the mess owner to renew your subscription.',
        time: 'Just now',
      })
    }
    return items
  }, [profile?.id, messEndDate, now])

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleSignOut = () => {
    signOut()
  }

  const today = new Date(now).toISOString().split('T')[0]
  const todayLogs = logs?.filter(log => log.date === today && log.user_id === profile?.id) || []
  const hasLunch = todayLogs.some(log => log.meal_type === 'LUNCH')
  const hasDinner = todayLogs.some(log => log.meal_type === 'DINNER')
  
  // Days remaining calculation
  // The end_date in mess_periods is already extended by approved leave days
  // So this calculation already includes leave extensions
  const daysRemaining = messEndDate
    ? Math.max(0, Math.round((new Date(messEndDate).setHours(0,0,0,0) - new Date(new Date(now).toISOString().split('T')[0]).getTime()) / 86400000))
    : 0
  
  const totalMeals = allLogs?.length || 0

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
      <DashboardSidebar
        portalLabel="Student Portal"
        navItems={STUDENT_NAV_ITEMS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        profile={profile || null}
        roleLabel="Student"
        showStudentId
        onSignOut={handleSignOut}
      />

      <MobileSidebar
        portalLabel="Student Portal"
        navItems={STUDENT_NAV_ITEMS}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setMobileMenuOpen(false) }}
        profile={profile || null}
        roleLabel="Student"
        showStudentId
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          tabs={STUDENT_HEADER_TABS}
          activeTab={activeTab}
          notifications={notifications}
          showNotifications={showNotifications}
          onToggleNotifications={setShowNotifications}
          onViewAllNotifications={() => setActiveTab('notifications')}
          showMobileMenuButton
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'dashboard' && (
              <StudentDashboardContent
                profile={profile || null}
                hasLunch={hasLunch}
                hasDinner={hasDinner}
                daysRemaining={daysRemaining}
                totalMeals={totalMeals}
                onNavigate={setActiveTab}
                isLoading={profileLoading || logsLoading}
                messActiveMealPlan={messActiveMealPlan}
                approvedLeaveDays={approvedLeaveDays}
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
            {activeTab === 'history' && <HistoryContent profile={profile || null} />}
            {activeTab === 'reports' && <ReportsContent profile={profile || null} />}
            {activeTab === 'profile' && <ProfileContent profile={profile || null} onSignOut={handleSignOut} />}
            {activeTab === 'notifications' && <NotificationsContent notifications={notifications} />}
          </div>
        </div>
      </main>
    </div>
  )
}
