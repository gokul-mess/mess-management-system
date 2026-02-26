'use client'

import { useState } from 'react'
import { useAllLogs } from '@/hooks/use-all-logs'
import { formatDateTime } from '@/utils/format'
import {
  Calendar,
  History,
  Clock,
  CheckCircle,
  Utensils,
  Sparkles,
  Activity,
  Zap,
  TrendingUp,
} from 'lucide-react'

interface HistoryContentProps {
  profile: { id: string } | null
}

export function HistoryContent({ profile }: HistoryContentProps) {
  const { logs: allLogs } = useAllLogs(profile?.id)

  const [filter, setFilter] = useState<'ALL' | 'LUNCH' | 'DINNER'>('ALL')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const userLogs = allLogs || []

  // Filter by meal type
  const filteredByMeal = filter === 'ALL' ? userLogs : userLogs.filter(log => log.meal_type === filter)

  // Filter by date range
  const now = new Date()
  const filteredByDate = filteredByMeal.filter(log => {
    const logDate = new Date(log.created_at)
    if (dateRange === 'today') {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
      return logDate >= today && logDate < tomorrow
    } else if (dateRange === 'week') {
      return logDate >= new Date(now.getTime() - 7 * 86400000)
    } else if (dateRange === 'month') {
      return logDate >= new Date(now.getTime() - 30 * 86400000)
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate); end.setHours(23, 59, 59, 999)
      return logDate >= start && logDate <= end
    }
    return true
  })

  // Search filter
  const filteredLogs = filteredByDate.filter(log => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return log.meal_type.toLowerCase().includes(query) || new Date(log.created_at).toLocaleDateString('en-IN').includes(query)
  })

  // Sort
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })

  // Stats
  const totalMeals = sortedLogs.length
  const lunchCount = sortedLogs.filter(l => l.meal_type === 'LUNCH').length
  const dinnerCount = sortedLogs.filter(l => l.meal_type === 'DINNER').length
  const thisMonthCount = userLogs.filter(l => {
    const d = new Date(l.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const todayCount = userLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length

  // Group logs by date
  const groupedLogs = sortedLogs.reduce((acc, log) => {
    const date = new Date(log.created_at).toLocaleDateString('en-IN')
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {} as Record<string, typeof sortedLogs>)

  const STATS = [
    { icon: Utensils, badge: TrendingUp, value: totalMeals, label: 'Total Meals', sub: 'filtered results', color: 'primary' },
    { icon: Activity, badge: CheckCircle, value: lunchCount, label: 'Lunch', sub: 'meals consumed', color: 'green' },
    { icon: Activity, badge: CheckCircle, value: dinnerCount, label: 'Dinner', sub: 'meals consumed', color: 'purple' },
    { icon: Calendar, badge: Sparkles, value: thisMonthCount, label: 'This Month', sub: 'total meals', color: 'orange' },
    { icon: Clock, badge: Zap, value: todayCount, label: 'Today', sub: 'meals consumed', color: 'blue' },
  ] as const

  const colorMap: Record<string, string> = {
    primary: 'from-primary/5',
    green: 'from-green-500/5',
    purple: 'from-purple-500/5',
    orange: 'from-orange-500/5',
    blue: 'from-blue-500/5',
  }

  const iconColorMap: Record<string, string> = {
    primary: 'bg-primary/10 border-primary/20 text-primary',
    green: 'bg-green-100 dark:bg-green-950/30 border-green-500/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-950/30 border-purple-500/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-950/30 border-orange-500/20 text-orange-600 dark:text-orange-400',
    blue: 'bg-blue-100 dark:bg-blue-950/30 border-blue-500/20 text-blue-600 dark:text-blue-400',
  }

  const badgeColorMap: Record<string, string> = {
    primary: 'text-primary',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    blue: 'text-blue-600 dark:text-blue-400',
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STATS.map(({ icon: Icon, badge: Badge, value, label, sub, color }) => (
          <div key={label} className="relative bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-border shadow-lg hover:shadow-2xl transition-all hover:scale-105 group overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${colorMap[color]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 ${iconColorMap[color]} border-2 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <Badge className={`w-5 h-5 ${badgeColorMap[color]}`} />
              </div>
              <h3 className="text-3xl font-bold mb-1">{value}</h3>
              <p className="text-sm font-medium text-foreground mb-1">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
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
          {/* Meal Type */}
          <div>
            <label className="block text-sm font-bold mb-3">Meal Type</label>
            <div className="flex gap-2 flex-wrap">
              {(['ALL', 'LUNCH', 'DINNER'] as const).map(type => (
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

          {/* Date Range */}
          <div>
            <label className="block text-sm font-bold mb-3">Date Range</label>
            <div className="flex gap-2 flex-wrap">
              {(['today', 'week', 'month', 'all'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    dateRange === range
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg scale-105'
                      : 'bg-accent hover:bg-accent/80 text-foreground hover:scale-105'
                  }`}
                >
                  {range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : range === 'month' ? 'Last 30 Days' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Toggle */}
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

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-sm font-bold mb-3">Search</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by meal type or date..."
                    className="w-full px-4 py-3 pl-10 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
                  />
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3">Custom Date Range</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">Start Date</label>
                    <input type="date" value={customStartDate} onChange={e => { setCustomStartDate(e.target.value); setDateRange('custom') }}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">End Date</label>
                    <input type="date" value={customEndDate} onChange={e => { setCustomEndDate(e.target.value); setDateRange('custom') }} min={customStartDate}
                      className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-3">Sort Order</label>
                  <div className="flex gap-2">
                    {(['newest', 'oldest'] as const).map(order => (
                      <button key={order} onClick={() => setSortOrder(order)}
                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                          sortOrder === order ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg' : 'bg-accent hover:bg-accent/80 text-foreground'
                        }`}
                      >
                        {order === 'newest' ? 'Newest First' : 'Oldest First'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-3">View Mode</label>
                  <div className="flex gap-2">
                    {(['grouped', 'list'] as const).map(mode => (
                      <button key={mode} onClick={() => setViewMode(mode)}
                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                          viewMode === mode ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg' : 'bg-accent hover:bg-accent/80 text-foreground'
                        }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
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
              Object.entries(groupedLogs).map(([date, dateLogs], dateIndex) => (
                <div key={date} className="border-b border-border last:border-0">
                  <div className="px-6 py-3 bg-accent/20 sticky top-0 z-10 backdrop-blur-sm">
                    <p className="text-sm font-bold text-foreground">{date}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {dateLogs.map((log, logIndex) => (
                      <div key={log.log_id} className="p-5 hover:bg-accent/30 transition-all duration-300 animate-in slide-in-from-right-2"
                        style={{ animationDelay: `${(dateIndex * 100) + (logIndex * 50)}ms` }}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            log.meal_type === 'LUNCH' ? 'bg-yellow-100 dark:bg-yellow-950/30' : 'bg-purple-100 dark:bg-purple-950/30'
                          }`}>
                            <Utensils className={`w-6 h-6 ${
                              log.meal_type === 'LUNCH' ? 'text-yellow-600 dark:text-yellow-400' : 'text-purple-600 dark:text-purple-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold">{log.meal_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
              <div className="divide-y divide-border">
                {sortedLogs.map((log, index) => (
                  <div key={log.log_id} className="p-5 hover:bg-accent/30 transition-all duration-300 animate-in slide-in-from-right-2"
                    style={{ animationDelay: `${index * 30}ms` }}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        log.meal_type === 'LUNCH' ? 'bg-yellow-100 dark:bg-yellow-950/30' : 'bg-purple-100 dark:bg-purple-950/30'
                      }`}>
                        <Utensils className={`w-6 h-6 ${
                          log.meal_type === 'LUNCH' ? 'text-yellow-600 dark:text-yellow-400' : 'text-purple-600 dark:text-purple-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{log.meal_type}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</p>
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
