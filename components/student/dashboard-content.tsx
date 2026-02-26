'use client'

import { useState } from 'react'
import { useAnimatedCounter } from '@/hooks/use-animated-counter'
import {
  Clock,
  CheckCircle,
  XCircle,
  Utensils,
  Package,
  Calendar,
  History,
  User,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Bell,

} from 'lucide-react'

// --- StatCard ---

type StatColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

const COLOR_CLASSES: Record<StatColor, string> = {
  green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-500/20',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-500/20',
  blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
  gray: 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 border-gray-500/20',
}

function StatCard({ icon: Icon, title, value, subtitle, color, delay, trend, isUrgent }: {
  icon: React.ElementType
  title: string
  value: string
  subtitle: string
  color: StatColor
  delay: string
  trend?: 'up' | 'down'
  isUrgent?: boolean
}) {
  return (
    <div
      className="relative bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 animate-in slide-in-from-bottom-2 duration-500 group overflow-hidden"
      style={{ animationDelay: delay }}
    >
      {isUrgent && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-red-100 via-red-50 to-red-100 dark:from-red-900/30 dark:via-red-950/20 dark:to-red-900/30 animate-red-pulse" />
          <div className="absolute bottom-3 right-3 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-shake-subtle z-20">
            <Bell className="w-4 h-4 text-white" />
          </div>
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${COLOR_CLASSES[color]} border-2 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
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

// --- QuickActionCard with ripple effect ---

function QuickActionCard({ icon: Icon, title, description, gradient, onClick, delay }: {
  icon: React.ElementType
  title: string
  description: string
  gradient: string
  onClick: () => void
  delay: string
}): React.ReactElement {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples(prev => [...prev, { x, y, id }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
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
          style={{ left: ripple.x, top: ripple.y, width: 0, height: 0 }}
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

// --- Main DashboardContent ---

interface StudentDashboardContentProps {
  profile: {
    id: string
    full_name?: string
    unique_short_id?: number
    photo_url?: string | null
    meal_plan?: string | null
    subscription_end_date?: string | null
  } | null
  hasLunch: boolean
  hasDinner: boolean
  daysRemaining: number
  totalMeals: number
  onNavigate: (tab: string) => void
  isLoading: boolean
}

export function StudentDashboardContent({
  profile,
  hasLunch,
  hasDinner,
  daysRemaining,
  totalMeals,
  onNavigate,
  isLoading,
}: StudentDashboardContentProps): React.ReactElement {
  const animatedDays = useAnimatedCounter({ target: daysRemaining, enabled: !isLoading })
  const animatedMeals = useAnimatedCounter({ target: totalMeals, enabled: !isLoading })

  if (isLoading) {
    return (
      <div className="space-y-6">
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
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
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
                <img src={profile.photo_url} alt={profile.full_name || 'Student'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 lg:w-12 lg:h-12 text-white" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Quick Actions */}
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

      {/* Subscription Alerts */}
      {daysRemaining <= 7 && daysRemaining > 0 && (
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
                Your subscription will expire in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. Please contact the mess owner to renew your subscription.
              </p>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const hasExpiredSubscription = daysRemaining <= 0 && profile && 'subscription_end_date' in profile && profile.subscription_end_date
        return hasExpiredSubscription ? (
          <div className="relative p-6 rounded-2xl border-2 bg-red-50 dark:bg-red-950/20 border-red-500/30 animate-in slide-in-from-bottom-2 duration-500 overflow-hidden group" style={{ animationDelay: '800ms' }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-red-500/5" />
            <div className="flex gap-4 relative z-10">
              <XCircle className="w-6 h-6 flex-shrink-0 animate-pulse text-red-600 dark:text-red-400" />
              <div>
                <h4 className="font-bold mb-1 text-red-900 dark:text-red-100">Subscription Expired</h4>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Your subscription has expired. Please contact the mess owner immediately to renew your subscription and continue enjoying meals.
                </p>
              </div>
            </div>
          </div>
        ) : null
      })()}
    </div>
  )
}
