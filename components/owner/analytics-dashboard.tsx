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
  BarChart3
} from 'lucide-react'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { parseError } from '@/lib/error-handler'
import { ErrorMessage } from '@/components/ui/error-message'
import { LoadingState } from '@/components/ui/loading-state'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
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
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week')
  const [weeklyChartData, setWeeklyChartData] = useState<ChartData[]>([])
  const [monthlyChartData, setMonthlyChartData] = useState<ChartData[]>([])
  const supabase = createClient()
  const { loading: exporting, error: exportError, success: exportSuccess, execute: executeExport, clearMessages } = useAsyncOperation('Export Report')

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Fetch today's meals
      const { data: todayLogs, error: todayError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('date', today)

      if (todayError) throw todayError

      // Fetch weekly meals
      const { data: weeklyLogs, error: weeklyError } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', weekAgo)

      if (weeklyError) throw weeklyError

      // Fetch monthly meals
      const { data: monthlyLogs, error: monthlyError } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', monthAgo)

      if (monthlyError) throw monthlyError

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

      setAnalytics({
        todayMeals: todayLogs?.length || 0,
        weeklyMeals: weeklyLogs?.length || 0,
        monthlyMeals: monthlyLogs?.length || 0,
        todayRevenue: (todayLogs?.length || 0) * 50,
        weeklyRevenue: (weeklyLogs?.length || 0) * 50,
        monthlyRevenue: (monthlyLogs?.length || 0) * 50,
        activeStudents: students?.length || 0,
        averageMealsPerDay: Math.round((weeklyLogs?.length || 0) / 7),
        peakHours: { lunch: 12, dinner: 19 },
        mealTypeDistribution: { lunch: lunchCount, dinner: dinnerCount }
      })

      // Prepare weekly chart data (last 7 days)
      const weeklyData: ChartData[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
        
        const dayMeals = weeklyLogs?.filter(log => log.date === dateStr).length || 0
        weeklyData.push({
          name: dayName,
          meals: dayMeals,
          revenue: dayMeals * 50
        })
      }
      setWeeklyChartData(weeklyData)

      // Prepare monthly chart data (last 4 weeks)
      const monthlyData: ChartData[] = []
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(Date.now() - (i * 7 + 6) * 24 * 60 * 60 * 1000)
        const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000)
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const weekEndStr = weekEnd.toISOString().split('T')[0]
        
        const weekMeals = monthlyLogs?.filter(log => 
          log.date >= weekStartStr && log.date <= weekEndStr
        ).length || 0
        
        monthlyData.push({
          name: `Week ${4 - i}`,
          meals: weekMeals,
          revenue: weekMeals * 50
        })
      }
      setMonthlyChartData(monthlyData)

    } catch (error) {
      console.error('Error fetching analytics:', error)
      setFetchError(parseError(error))
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange, fetchAnalytics])

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
      <div className="flex items-center justify-center h-96">
        <LoadingState message="Loading analytics..." />
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Analytics Overview</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track your mess performance and insights
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
            className="px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
          <Button variant="outline" onClick={handleExportReport} disabled={exporting}>
            {exporting ? (
              <>
                <Download className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </div>

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
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Utensils className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            {parseFloat(weeklyGrowth) >= 0 ? (
              <span className="flex items-center text-sm text-green-600 dark:text-green-400">
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
          <h4 className="text-3xl font-bold mb-1">{analytics?.weeklyMeals || 0}</h4>
          <p className="text-sm text-muted-foreground">Total Meals (7 Days)</p>
          <p className="text-xs text-muted-foreground mt-2">
            Avg: {analytics?.averageMealsPerDay || 0} meals/day
          </p>
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            {parseFloat(revenueGrowth) >= 0 ? (
              <span className="flex items-center text-sm text-green-600 dark:text-green-400">
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
          <h4 className="text-3xl font-bold mb-1">₹{analytics?.weeklyRevenue || 0}</h4>
          <p className="text-sm text-muted-foreground">Weekly Revenue</p>
          <p className="text-xs text-muted-foreground mt-2">
            Today: ₹{analytics?.todayRevenue || 0}
          </p>
        </div>

        {/* Active Students */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-muted-foreground">Active</span>
          </div>
          <h4 className="text-3xl font-bold mb-1">{analytics?.activeStudents || 0}</h4>
          <p className="text-sm text-muted-foreground">Active Students</p>
          <p className="text-xs text-muted-foreground mt-2">
            Subscribed members
          </p>
        </div>

        {/* Monthly Total */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm text-muted-foreground">30 Days</span>
          </div>
          <h4 className="text-3xl font-bold mb-1">₹{analytics?.monthlyRevenue || 0}</h4>
          <p className="text-sm text-muted-foreground">Monthly Revenue</p>
          <p className="text-xs text-muted-foreground mt-2">
            {analytics?.monthlyMeals || 0} meals served
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Line Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold">Weekly Trend</h4>
              <p className="text-sm text-muted-foreground">Last 7 days meal consumption</p>
            </div>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="meals" 
                stroke="hsl(217 91% 60%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(217 91% 60%)', r: 4 }}
                activeDot={{ r: 6 }}
                name="Meals"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Comparison Bar Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold">Monthly Comparison</h4>
              <p className="text-sm text-muted-foreground">Last 4 weeks breakdown</p>
            </div>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="meals" 
                fill="hsl(262 83% 58%)" 
                radius={[8, 8, 0, 0]}
                name="Meals"
              />
              <Bar 
                dataKey="revenue" 
                fill="hsl(142 76% 36%)" 
                radius={[8, 8, 0, 0]}
                name="Revenue (₹)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Meal Distribution and Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meal Distribution */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold">Meal Type Distribution</h4>
              <p className="text-sm text-muted-foreground">Today&apos;s breakdown</p>
            </div>
            <PieChart className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="space-y-4">
            {/* Lunch */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Lunch</span>
                <span className="text-sm font-bold">{analytics?.mealTypeDistribution.lunch || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${((analytics?.mealTypeDistribution.lunch || 0) / (analytics?.todayMeals || 1)) * 100}%`
                  }}
                />
              </div>
            </div>

            {/* Dinner */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Dinner</span>
                <span className="text-sm font-bold">{analytics?.mealTypeDistribution.dinner || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{
                    width: `${((analytics?.mealTypeDistribution.dinner || 0) / (analytics?.todayMeals || 1)) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Today</span>
              <span className="font-bold">{analytics?.todayMeals || 0} meals</span>
            </div>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold">Peak Hours</h4>
              <p className="text-sm text-muted-foreground">Busiest meal times</p>
            </div>
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌅</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold mb-1">Lunch Time</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics?.peakHours.lunch || 12}:00 - {(analytics?.peakHours.lunch || 12) + 2}:00
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Peak serving hours
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌙</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold mb-1">Dinner Time</p>
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
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Average Daily Revenue
          </h5>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            ₹{Math.round((analytics?.weeklyRevenue || 0) / 7)}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
            Based on last 7 days
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <h5 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Attendance Rate
          </h5>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {analytics?.activeStudents ? Math.round(((analytics.todayMeals / 2) / analytics.activeStudents) * 100) : 0}%
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-2">
            Students eating today
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
          <h5 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-2">
            Monthly Projection
          </h5>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            ₹{Math.round((analytics?.weeklyRevenue || 0) * 4.3)}
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
            Estimated monthly revenue
          </p>
        </div>
      </div>
    </div>
  )
}
