'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Utensils,
  Clock,
  PieChart,
  BarChart3,
  Sparkles,
  ChevronDown
} from 'lucide-react'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { parseError } from '@/lib/error-handler'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface AnalyticsData {
  todayMeals: number
  weeklyMeals: number
  monthlyMeals: number
  todayRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
  activeStudents: number
  averageMealsPerDay: number
  peakHours: { lunch: number; dinner: number }
  mealTypeDistribution: { lunch: number; dinner: number }
}

interface ChartData {
  name: string
  meals: number
  revenue: number
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<{ message: string } | null>(null)
  const [timeRange, setTimeRange] = useState<'7days' | '15days' | '30days' | '90days' | 'custom'>('7days')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [weeklyChartData, setWeeklyChartData] = useState<ChartData[]>([])
  const [monthlyChartData, setMonthlyChartData] = useState<ChartData[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showCustomDateModal, setShowCustomDateModal] = useState(false)
  const [animatedMetrics, setAnimatedMetrics] = useState({
    meals: 0,
    revenue: 0,
    students: 0,
    monthly: 0
  })
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null)
  const [hoveredDataPoint, setHoveredDataPoint] = useState<number | null>(null)
  const supabase = createClient()
  const { loading: exporting, error: exportError, success: exportSuccess, execute: executeExport, clearMessages } = useAsyncOperation('Export Report')

  // Get date range based on selection
  const getDateRange = useCallback(() => {
    const today = new Date()
    let startDate: Date
    
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      return {
        start: customStartDate,
        end: customEndDate,
        days: Math.ceil((new Date(customEndDate).getTime() - new Date(customStartDate).getTime()) / (1000 * 60 * 60 * 24))
      }
    }
    
    switch (timeRange) {
      case '7days':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '15days':
        startDate = new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000)
        break
      case '30days':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90days':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
      days: parseInt(timeRange.replace('days', ''))
    }
  }, [timeRange, customStartDate, customEndDate])

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    
    try {
      const dateRange = getDateRange()
      const today = new Date().toISOString().split('T')[0]

      // Fetch logs for the selected date range
      const { data: rangeLogs, error: rangeError } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)

      if (rangeError) throw rangeError

      // Fetch today's meals
      const { data: todayLogs, error: todayError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('date', today)

      if (todayError) throw todayError

      // Fetch active students
      const { data: students, error: studentsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'STUDENT')
        .eq('is_active', true)

      if (studentsError) throw studentsError

      // Calculate meal type distribution
      const lunchCount = todayLogs?.filter(l => l.meal_type === 'LUNCH').length || 0
      const dinnerCount = todayLogs?.filter(l => l.meal_type === 'DINNER').length || 0

      const totalMeals = rangeLogs?.length || 0
      const totalRevenue = totalMeals * 50

      setAnalytics({
        todayMeals: todayLogs?.length || 0,
        weeklyMeals: totalMeals,
        monthlyMeals: totalMeals,
        todayRevenue: (todayLogs?.length || 0) * 50,
        weeklyRevenue: totalRevenue,
        monthlyRevenue: totalRevenue,
        activeStudents: students?.length || 0,
        averageMealsPerDay: Math.round(totalMeals / dateRange.days),
        peakHours: { lunch: 12, dinner: 19 },
        mealTypeDistribution: { lunch: lunchCount, dinner: dinnerCount }
      })

      // Prepare chart data based on date range
      if (dateRange.days <= 15) {
        // Daily breakdown for short ranges
        const dailyData: ChartData[] = []
        for (let i = dateRange.days - 1; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          const dateStr = date.toISOString().split('T')[0]
          const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          
          const dayMeals = rangeLogs?.filter(log => log.date === dateStr).length || 0
          dailyData.push({
            name: dayName,
            meals: dayMeals,
            revenue: dayMeals * 50
          })
        }
        setWeeklyChartData(dailyData)
        setMonthlyChartData(dailyData)
      } else {
        // Weekly breakdown for longer ranges
        const weeks = Math.ceil(dateRange.days / 7)
        const weeklyData: ChartData[] = []
        
        for (let i = weeks - 1; i >= 0; i--) {
          const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
          const weekStart = new Date(weekEnd.getTime() - 6 * 24 * 60 * 60 * 1000)
          const weekStartStr = weekStart.toISOString().split('T')[0]
          const weekEndStr = weekEnd.toISOString().split('T')[0]
          
          const weekMeals = rangeLogs?.filter(log => 
            log.date >= weekStartStr && log.date <= weekEndStr
          ).length || 0
          
          weeklyData.push({
            name: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            meals: weekMeals,
            revenue: weekMeals * 50
          })
        }
        setWeeklyChartData(weeklyData)
        setMonthlyChartData(weeklyData)
      }

    } catch (error) {
      console.error('Error fetching analytics:', error)
      setFetchError(parseError(error))
    } finally {
      setIsLoading(false)
    }
  }, [supabase, getDateRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Animated counter effect for metrics
  useEffect(() => {
    if (!analytics || isLoading) return

    const duration = 1500
    const steps = 60
    const interval = duration / steps

    const animateValue = (start: number, end: number, setter: (val: number) => void) => {
      let current = start
      const increment = (end - start) / steps
      const timer = setInterval(() => {
        current += increment
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
          setter(end)
          clearInterval(timer)
        } else {
          setter(Math.floor(current))
        }
      }, interval)
      return timer
    }

    const timers = [
      animateValue(0, analytics.weeklyMeals, (val) => 
        setAnimatedMetrics(prev => ({ ...prev, meals: val }))
      ),
      animateValue(0, analytics.weeklyRevenue, (val) => 
        setAnimatedMetrics(prev => ({ ...prev, revenue: val }))
      ),
      animateValue(0, analytics.activeStudents, (val) => 
        setAnimatedMetrics(prev => ({ ...prev, students: val }))
      ),
      animateValue(0, analytics.monthlyRevenue, (val) => 
        setAnimatedMetrics(prev => ({ ...prev, monthly: val }))
      )
    ]

    return () => timers.forEach(clearInterval)
  }, [analytics, isLoading])

  const handleExportReport = async () => {
    clearMessages()
    
    await executeExport(async () => {
      const reportData = [
        ['Gokul Mess - Analytics Report'],
        [`Generated: ${new Date().toLocaleString('en-IN')}`],
        [''],
        ['Metric', 'Value'],
        ['Today Meals', analytics?.todayMeals || 0],
        ['Weekly Meals', analytics?.weeklyMeals || 0],
        ['Monthly Meals', analytics?.monthlyMeals || 0],
        ['Today Revenue', `₹${analytics?.todayRevenue || 0}`],
        ['Weekly Revenue', `₹${analytics?.weeklyRevenue || 0}`],
        ['Monthly Revenue', `₹${analytics?.monthlyRevenue || 0}`],
        ['Active Students', analytics?.activeStudents || 0],
        ['Average Meals/Day', analytics?.averageMealsPerDay || 0],
        [''],
        ['Meal Distribution'],
        ['Lunch', analytics?.mealTypeDistribution.lunch || 0],
        ['Dinner', analytics?.mealTypeDistribution.dinner || 0]
      ].map(row => Array.isArray(row) ? row.join(',') : row).join('\n')

      const blob = new Blob([reportData], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-10 w-40 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Skeleton Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              <div className="space-y-3">
                <div className="h-12 w-12 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
                <div className="h-8 w-24 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              <div className="space-y-4">
                <div className="h-6 w-48 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                <div className="h-64 bg-gray-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-96">
        <ErrorMessage 
          error={fetchError} 
          onRetry={fetchAnalytics}
        />
      </div>
    )
  }

  const weeklyGrowth = analytics ? ((analytics.weeklyMeals - analytics.todayMeals * 7) / (analytics.todayMeals * 7 || 1) * 100).toFixed(1) : '0'
  const revenueGrowth = analytics ? ((analytics.weeklyRevenue - analytics.todayRevenue * 7) / (analytics.todayRevenue * 7 || 1) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <h3 className="text-2xl font-bold">Analytics Overview</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Track your mess performance and insights
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 flex items-center gap-2 hover:scale-105"
            >
              <Calendar className="w-4 h-4" />
              <span className="capitalize">
                {timeRange === '7days' ? 'Last 7 Days' : 
                 timeRange === '15days' ? 'Last 15 Days' : 
                 timeRange === '30days' ? 'Last 30 Days' : 
                 timeRange === '90days' ? 'Last 90 Days' : 
                 'Custom Range'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>
            {showDatePicker && (
              <div className="absolute top-full mt-2 right-0 w-56 bg-white dark:bg-zinc-900 rounded-lg border border-border shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                {[
                  { value: '7days', label: 'Last 7 Days', icon: '📅' },
                  { value: '15days', label: 'Last 15 Days', icon: '📆' },
                  { value: '30days', label: 'Last 30 Days', icon: '🗓️' },
                  { value: '90days', label: 'Last 90 Days', icon: '📊' },
                  { value: 'custom', label: 'Custom Range', icon: '⚙️' }
                ].map((range, index) => (
                  <button
                    key={range.value}
                    onClick={() => {
                      if (range.value === 'custom') {
                        setShowCustomDateModal(true)
                        setShowDatePicker(false)
                      } else {
                        setTimeRange(range.value as typeof timeRange)
                        setShowDatePicker(false)
                      }
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors flex items-center gap-3"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'slideIn 0.3s ease-out forwards'
                    }}
                  >
                    <span className="text-lg">{range.icon}</span>
                    <div className="flex-1">
                      <span className={timeRange === range.value ? 'font-semibold' : ''}>
                        {range.label}
                      </span>
                    </div>
                    {timeRange === range.value && (
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={handleExportReport} 
            disabled={exporting}
            className="hover:scale-105 transition-all duration-300 group"
          >
            {exporting ? (
              <>
                <Download className="w-4 h-4 mr-2 animate-bounce" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2 group-hover:animate-bounce" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Custom Date Range Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 border border-border shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Custom Date Range
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCustomDateModal(false)
                    setCustomStartDate('')
                    setCustomEndDate('')
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (customStartDate && customEndDate) {
                      setTimeRange('custom')
                      setShowCustomDateModal(false)
                    }
                  }}
                  disabled={!customStartDate || !customEndDate}
                  className="flex-1"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Status Messages */}
      {exportError && (
        <ErrorMessage 
          error={exportError} 
          onDismiss={clearMessages}
        />
      )}

      {exportSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <div className="w-5 h-5 bg-green-600 dark:bg-green-400 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-green-800 dark:text-green-200">
            Report exported successfully!
          </p>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Meals */}
        <div 
          className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: '100ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Utensils className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              {parseFloat(weeklyGrowth) >= 0 ? (
                <span className="flex items-center text-sm text-green-600 dark:text-green-400 animate-bounce-slow">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {weeklyGrowth}%
                </span>
              ) : (
                <span className="flex items-center text-sm text-red-600 dark:text-red-400">
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                  {weeklyGrowth}%
                </span>
              )}
            </div>
            <h4 className="text-3xl font-bold mb-1 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform inline-block">
              {animatedMetrics.meals}
            </h4>
            <p className="text-sm text-muted-foreground">Total Meals (7 Days)</p>
            <p className="text-xs text-muted-foreground mt-2">
              Avg: {analytics?.averageMealsPerDay || 0} meals/day
            </p>
          </div>
        </div>

        {/* Revenue */}
        <div 
          className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: '200ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              {parseFloat(revenueGrowth) >= 0 ? (
                <span className="flex items-center text-sm text-green-600 dark:text-green-400 animate-bounce-slow">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  {revenueGrowth}%
                </span>
              ) : (
                <span className="flex items-center text-sm text-red-600 dark:text-red-400">
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                  {revenueGrowth}%
                </span>
              )}
            </div>
            <h4 className="text-3xl font-bold mb-1 bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform inline-block">
              ₹{animatedMetrics.revenue}
            </h4>
            <p className="text-sm text-muted-foreground">Weekly Revenue</p>
            <p className="text-xs text-muted-foreground mt-2">
              Today: ₹{analytics?.todayRevenue || 0}
            </p>
          </div>
        </div>

        {/* Active Students */}
        <div 
          className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: '300ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <h4 className="text-3xl font-bold mb-1 bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform inline-block">
              {animatedMetrics.students}
            </h4>
            <p className="text-sm text-muted-foreground">Active Students</p>
            <p className="text-xs text-muted-foreground mt-2">
              Subscribed members
            </p>
          </div>
        </div>

        {/* Monthly Total */}
        <div 
          className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer relative overflow-hidden animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: '400ms' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-sm text-muted-foreground">30 Days</span>
            </div>
            <h4 className="text-3xl font-bold mb-1 bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform inline-block">
              ₹{animatedMetrics.monthly}
            </h4>
            <p className="text-sm text-muted-foreground">Monthly Revenue</p>
            <p className="text-xs text-muted-foreground mt-2">
              {analytics?.monthlyMeals || 0} meals served
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Line Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600 animate-pulse" />
                Meals Trend
              </h4>
              <p className="text-sm text-muted-foreground">
                {timeRange === '7days' ? 'Daily breakdown for last 7 days' :
                 timeRange === '15days' ? 'Daily breakdown for last 15 days' :
                 timeRange === '30days' ? 'Daily breakdown for last 30 days' :
                 timeRange === '90days' ? 'Weekly breakdown for last 90 days' :
                 'Custom date range'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {weeklyChartData.reduce((sum, d) => sum + d.meals, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Meals</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart 
              data={weeklyChartData}
              onMouseMove={(e) => {
                if (e && e.activeTooltipIndex !== undefined && typeof e.activeTooltipIndex === 'number') {
                  setHoveredDataPoint(e.activeTooltipIndex)
                }
              }}
              onMouseLeave={() => setHoveredDataPoint(null)}
            >
              <defs>
                <linearGradient id="colorMeals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.05}/>
                </linearGradient>
                <filter id="shadow" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="hsl(217 91% 60%)" floodOpacity="0.3"/>
                </filter>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.2}
                vertical={false}
              />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={-10}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                wrapperStyle={{ outline: 'none' }}
                cursor={{ 
                  stroke: 'hsl(217 91% 60%)', 
                  strokeWidth: 2, 
                  strokeDasharray: '5 5',
                  fill: 'rgba(59, 130, 246, 0.05)'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-zinc-900 border border-border rounded-xl p-4 shadow-xl">
                        <p className="font-semibold text-sm mb-2">{payload[0].payload.name}</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Utensils className="w-3 h-3" />
                              Meals:
                            </span>
                            <span className="font-bold text-blue-600">{payload[0].value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Revenue:
                            </span>
                            <span className="font-bold text-green-600">₹{payload[0].payload.revenue}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line 
                type="monotone" 
                dataKey="meals" 
                stroke="hsl(217 91% 60%)" 
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, index } = props
                  const isHovered = hoveredDataPoint === index
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 7 : 5}
                      fill="hsl(217 91% 60%)"
                      stroke="#fff"
                      strokeWidth={isHovered ? 3 : 2}
                      filter={isHovered ? "url(#shadow)" : undefined}
                      className="transition-all duration-300"
                    />
                  )
                }}
                activeDot={{ 
                  r: 8, 
                  strokeWidth: 3, 
                  stroke: '#fff',
                  filter: "url(#shadow)"
                }}
                name="Meals"
                fill="url(#colorMeals)"
                opacity={hoveredLegend === null || hoveredLegend === 'meals' ? 1 : 0.3}
                animationDuration={2000}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                 onMouseEnter={() => setHoveredLegend('meals')}
                 onMouseLeave={() => setHoveredLegend(null)}>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Meals Served</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">
                Avg: {Math.round(weeklyChartData.reduce((sum, d) => sum + d.meals, 0) / weeklyChartData.length)} meals/day
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Comparison Bar Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-right-2" style={{ animationDelay: '600ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600 animate-pulse" />
                Revenue & Meals Comparison
              </h4>
              <p className="text-sm text-muted-foreground">
                {timeRange === '7days' || timeRange === '15days' ? 'Daily comparison' : 'Weekly comparison'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                ₹{monthlyChartData.reduce((sum, d) => sum + d.revenue, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={monthlyChartData}
              onMouseMove={(e) => {
                if (e && e.activeTooltipIndex !== undefined && typeof e.activeTooltipIndex === 'number') {
                  setHoveredDataPoint(e.activeTooltipIndex)
                }
              }}
              onMouseLeave={() => setHoveredDataPoint(null)}
            >
              <defs>
                <linearGradient id="colorMealsBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={1}/>
                  <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="colorRevenueBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={1}/>
                  <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0.7}/>
                </linearGradient>
                <filter id="barShadow" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                </filter>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.2}
                vertical={false}
              />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={-10}
                yAxisId="left"
                label={{ value: 'Meals', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                dx={10}
                yAxisId="right"
                orientation="right"
                label={{ value: 'Revenue (₹)', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
              />
              <Tooltip 
                wrapperStyle={{ outline: 'none' }}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-zinc-900 border border-border rounded-xl p-4 shadow-xl">
                        <p className="font-semibold text-sm mb-2">{payload[0].payload.name}</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <div className="w-3 h-3 bg-purple-600 rounded" />
                              Meals:
                            </span>
                            <span className="font-bold text-purple-600">{payload[0].value}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-600 rounded" />
                              Revenue:
                            </span>
                            <span className="font-bold text-green-600">₹{payload[1].value}</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">Avg per meal: </span>
                            <span className="font-semibold">₹{Math.round((payload[1].value as number) / (payload[0].value as number))}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar 
                dataKey="meals" 
                fill="url(#colorMealsBar)"
                radius={[8, 8, 0, 0]}
                name="Meals"
                yAxisId="left"
                opacity={hoveredLegend === null || hoveredLegend === 'meals' ? 1 : 0.3}
                animationDuration={2000}
                animationEasing="ease-in-out"
                filter="url(#barShadow)"
              >
                {monthlyChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-meals-${index}`} 
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                    opacity={hoveredDataPoint === index ? 0.8 : 1}
                  />
                ))}
              </Bar>
              <Bar 
                dataKey="revenue" 
                fill="url(#colorRevenueBar)"
                radius={[8, 8, 0, 0]}
                name="Revenue (₹)"
                yAxisId="right"
                opacity={hoveredLegend === null || hoveredLegend === 'revenue' ? 1 : 0.3}
                animationDuration={2000}
                animationEasing="ease-in-out"
                filter="url(#barShadow)"
              >
                {monthlyChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-revenue-${index}`} 
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                    opacity={hoveredDataPoint === index ? 0.8 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                 onMouseEnter={() => setHoveredLegend('meals')}
                 onMouseLeave={() => setHoveredLegend(null)}>
              <div className="w-3 h-3 bg-purple-600 rounded animate-pulse" />
              <span className="text-sm font-medium">Meals</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                 onMouseEnter={() => setHoveredLegend('revenue')}
                 onMouseLeave={() => setHoveredLegend(null)}>
              <div className="w-3 h-3 bg-green-600 rounded animate-pulse" style={{ animationDelay: '0.5s' }} />
              <span className="text-sm font-medium">Revenue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Distribution and Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meal Distribution */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-left-2" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                Meal Type Distribution
              </h4>
              <p className="text-sm text-muted-foreground">Today&apos;s breakdown</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Lunch */}
            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  Lunch
                </span>
                <span className="text-sm font-bold">{analytics?.mealTypeDistribution.lunch || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden group-hover:shadow-lg group-hover:shadow-blue-500/50"
                  style={{
                    width: `${((analytics?.mealTypeDistribution.lunch || 0) / (analytics?.todayMeals || 1)) * 100}%`,
                    animation: 'progressGrow 1s ease-out'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(((analytics?.mealTypeDistribution.lunch || 0) / (analytics?.todayMeals || 1)) * 100).toFixed(1)}% of total
              </p>
            </div>

            {/* Dinner */}
            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  Dinner
                </span>
                <span className="text-sm font-bold">{analytics?.mealTypeDistribution.dinner || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-400 h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden group-hover:shadow-lg group-hover:shadow-purple-500/50"
                  style={{
                    width: `${((analytics?.mealTypeDistribution.dinner || 0) / (analytics?.todayMeals || 1)) * 100}%`,
                    animation: 'progressGrow 1s ease-out',
                    animationDelay: '0.2s'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%', animationDelay: '0.5s' }} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(((analytics?.mealTypeDistribution.dinner || 0) / (analytics?.todayMeals || 1)) * 100).toFixed(1)}% of total
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Today</span>
              <span className="font-bold text-lg">{analytics?.todayMeals || 0} meals</span>
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-right-2" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Peak Hours
              </h4>
              <p className="text-sm text-muted-foreground">Busiest meal times</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 group cursor-pointer hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 relative overflow-hidden">
                <span className="text-2xl relative z-10">🌅</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold mb-1 flex items-center gap-2">
                  Lunch Time
                  <TrendingUp className="w-4 h-4 text-blue-600 animate-bounce-slow" />
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics?.peakHours.lunch || 12}:00 - {(analytics?.peakHours.lunch || 12) + 2}:00
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Peak serving hours
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 group cursor-pointer hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 relative overflow-hidden">
                <span className="text-2xl relative z-10">🌙</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%', animationDelay: '0.5s' }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold mb-1 flex items-center gap-2">
                  Dinner Time
                  <TrendingUp className="w-4 h-4 text-purple-600 animate-bounce-slow" style={{ animationDelay: '0.5s' }} />
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {analytics?.peakHours.dinner || 19}:00 - {(analytics?.peakHours.dinner || 19) + 2}:00
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Peak serving hours
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 hover:scale-105 transition-all duration-300 cursor-pointer group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: '900ms' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="relative z-10">
            <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Average Daily Revenue
            </h5>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform inline-block">
              ₹{Math.round((analytics?.weeklyRevenue || 0) / 7)}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              Based on last 7 days
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800 hover:scale-105 transition-all duration-300 cursor-pointer group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: '1000ms' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="relative z-10">
            <h5 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Attendance Rate
            </h5>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform inline-block">
              {analytics?.activeStudents ? Math.round(((analytics.todayMeals / 2) / analytics.activeStudents) * 100) : 0}%
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-2">
              Students eating today
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800 hover:scale-105 transition-all duration-300 cursor-pointer group relative overflow-hidden animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: '1100ms' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          <div className="relative z-10">
            <h5 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Monthly Projection
            </h5>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform inline-block">
              ₹{Math.round((analytics?.weeklyRevenue || 0) * 4.3)}
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
              Estimated monthly revenue
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
