'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  UserCheck,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Download,
  Filter,
  Zap,
  Sparkles,
} from 'lucide-react'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'
import { getTimeAgo } from '@/utils/format'

interface DashboardContentProps {
  stats: {
    totalMeals: number
    lunchCount: number
    dinnerCount: number
    revenue: number
  }
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
}

export function OwnerDashboardContent({ stats, logs, isLoading }: DashboardContentProps) {
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [mealTypeFilter, setMealTypeFilter] = useState<'all' | 'LUNCH' | 'DINNER'>('all')

  const { data: activeStudents = 0 } = useQuery({
    queryKey: ['owner', 'active-students'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('role', 'STUDENT')
        .eq('is_active', true)
      return data?.length ?? 0
    },
  })

  const { data: leaveRequests = 0 } = useQuery({
    queryKey: ['owner', 'pending-leaves'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('leaves')
        .select('leave_id', { count: 'exact' })
        .eq('is_approved', false)
      return data?.length ?? 0
    },
  })

  const animatedMeals = useAnimatedCounter({ target: stats.totalMeals, enabled: !isLoading })
  const animatedRevenue = useAnimatedCounter({ target: stats.revenue, enabled: !isLoading })
  const animatedStudents = useAnimatedCounter({ target: activeStudents, enabled: !isLoading })
  const animatedLeaves = useAnimatedCounter({ target: leaveRequests, enabled: !isLoading })

  const handleExportLogs = () => {
    try {
      const filteredLogs =
        mealTypeFilter === 'all' ? logs : logs?.filter((l) => l.meal_type === mealTypeFilter)

      const csvContent = [
        ['Date', 'Time', 'Student Name', 'Student ID', 'Meal Type', 'Status', 'Access Method'].join(','),
        ...(filteredLogs || []).map((log) =>
          [
            new Date(log.created_at).toLocaleDateString('en-IN'),
            new Date(log.created_at).toLocaleTimeString('en-IN'),
            log.users?.full_name || 'Unknown',
            log.users?.unique_short_id || 'N/A',
            log.meal_type,
            log.status,
            log.access_method,
          ].join(',')
        ),
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

  const filteredLogs =
    mealTypeFilter === 'all' ? logs : logs?.filter((l) => l.meal_type === mealTypeFilter)

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={UserCheck}
          value={animatedMeals}
          label="Total Meals Served"
          subtext={`Lunch: ${stats.lunchCount} | Dinner: ${stats.dinnerCount}`}
          badge="Today"
          colorScheme="blue"
        />
        <StatsCard
          icon={DollarSign}
          value={`₹${animatedRevenue}`}
          label="Today's Revenue"
          subtext="₹50 per meal"
          badge="Revenue"
          badgeIcon={Zap}
          colorScheme="green"
        />
        <StatsCard
          icon={Users}
          value={animatedStudents}
          label="Active Students"
          subtext="Subscribed members"
          badge="Active"
          colorScheme="purple"
        />
        <StatsCard
          icon={Calendar}
          value={animatedLeaves}
          label="Leave Requests"
          subtext={leaveRequests > 0 ? undefined : 'No pending requests'}
          badge="Pending"
          colorScheme="orange"
          action={
            leaveRequests > 0
              ? { label: 'Review Now', icon: TrendingUp }
              : undefined
          }
        />
      </div>

      {/* Live Feed */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm relative overflow-hidden">
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
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-lg border border-border shadow-lg z-50 py-2 animate-in slide-in-from-top-2 duration-200">
                    {(['all', 'LUNCH', 'DINNER'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setMealTypeFilter(type)
                          setShowFilterMenu(false)
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-accent text-sm transition-all ${
                          mealTypeFilter === type ? 'bg-accent font-medium' : ''
                        }`}
                      >
                        {type === 'all' ? 'All Meals' : `${type.charAt(0)}${type.slice(1).toLowerCase()} Only`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportLogs}
              className="hover:scale-105 transition-transform"
            >
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
                <MealLogRow key={log.log_id} log={log} index={index} />
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

// --- Sub-components ---

function StatsCard({
  icon: Icon,
  value,
  label,
  subtext,
  badge,
  badgeIcon: BadgeIcon,
  colorScheme,
  action,
}: {
  icon: React.ElementType
  value: number | string
  label: string
  subtext?: string
  badge: string
  badgeIcon?: React.ElementType
  colorScheme: 'blue' | 'green' | 'purple' | 'orange'
  action?: { label: string; icon: React.ElementType }
}) {
  const colorMap = {
    blue: {
      iconBg: 'from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      border: 'hover:border-blue-500/50',
      gradient: 'from-blue-600 to-blue-400',
      shimmer: 'from-blue-500/0 via-blue-500/10 to-blue-500/0',
      particle: 'bg-blue-500/5',
      badgeBg: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    },
    green: {
      iconBg: 'from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10',
      iconColor: 'text-green-600 dark:text-green-400',
      border: 'hover:border-green-500/50',
      gradient: 'from-green-600 to-green-400',
      shimmer: 'from-green-500/0 via-green-500/10 to-green-500/0',
      particle: 'bg-green-500/5',
      badgeBg: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    },
    purple: {
      iconBg: 'from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-800/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
      border: 'hover:border-purple-500/50',
      gradient: 'from-purple-600 to-purple-400',
      shimmer: 'from-purple-500/0 via-purple-500/10 to-purple-500/0',
      particle: 'bg-purple-500/5',
      badgeBg: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
    },
    orange: {
      iconBg: 'from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10',
      iconColor: 'text-orange-600 dark:text-orange-400',
      border: 'hover:border-orange-500/50',
      gradient: 'from-orange-600 to-orange-400',
      shimmer: 'from-orange-500/0 via-orange-500/10 to-orange-500/0',
      particle: 'bg-orange-500/5',
      badgeBg: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
    },
  }

  const c = colorMap[colorScheme]

  return (
    <div
      className={`group bg-white dark:bg-zinc-900 rounded-xl p-6 border-2 border-border ${c.border} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-r ${c.shimmer} opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer`}
        style={{ backgroundSize: '200% 100%' }}
      />
      <div className={`absolute top-0 right-0 w-32 h-32 ${c.particle} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-12 h-12 bg-gradient-to-br ${c.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg`}
          >
            <Icon className={`w-6 h-6 ${c.iconColor} group-hover:animate-bounce`} />
          </div>
          <span
            className={`text-xs font-medium ${c.badgeBg} px-3 py-1 rounded-full shadow-sm group-hover:scale-105 transition-all flex items-center gap-1`}
          >
            {BadgeIcon && <BadgeIcon className="w-3 h-3 animate-pulse" />}
            {badge}
          </span>
        </div>
        <h3 className={`text-4xl font-bold mb-1 bg-gradient-to-r ${c.gradient} bg-clip-text text-transparent`}>
          {value}
        </h3>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          {action ? (
            <button className="text-xs text-primary hover:underline font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              {action.label}
              <action.icon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : subtext ? (
            <>
              <Sparkles className="w-3 h-3 text-green-600 dark:text-green-400 animate-pulse" />
              <span>{subtext}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-green-600 dark:text-green-400" />
              <span>No pending requests</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MealLogRow({
  log,
  index,
}: {
  log: {
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
  }
  index: number
}) {
  return (
    <div
      className="group flex items-center gap-4 p-4 bg-gradient-to-r from-accent/50 to-accent/30 hover:from-accent hover:to-accent/70 rounded-xl transition-all duration-300 border border-border/50 hover:border-primary/30 hover:shadow-lg hover:scale-[1.02] relative overflow-hidden animate-in slide-in-from-left fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />

      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300 shadow-lg relative z-10">
          {log.users?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={log.users.photo_url} alt={log.users.full_name || 'Student'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-primary">{log.users?.full_name?.charAt(0) || '?'}</span>
          )}
        </div>
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
          <span
            className={`font-bold uppercase px-2 py-0.5 rounded-full text-xs ${
              log.status === 'CONSUMED'
                ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 shadow-sm shadow-green-500/50'
                : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 shadow-sm shadow-orange-500/50'
            } group-hover:scale-105 transition-transform`}
          >
            {log.status}
          </span>
          <span className="text-muted-foreground">•</span>
          <span
            className={`font-medium px-2 py-0.5 rounded-full text-xs ${
              log.meal_type === 'LUNCH'
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/50'
                : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/50'
            } group-hover:scale-105 transition-transform`}
          >
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
          {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {getTimeAgo(log.created_at)}
        </p>
      </div>
    </div>
  )
}
