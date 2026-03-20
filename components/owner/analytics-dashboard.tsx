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
import { generateOwnerAnalyticsReport } from '@/lib/owner-analytics-report-generator'
import { ComprehensiveAnalyticsSections } from './comprehensive-analytics-sections'

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

interface StudentData {
  name: string
  id: number
  meals: number
  mealPlan: string
  attendanceRate?: number
}

interface LeaveData {
  studentName: string
  studentId: number
  leaveDays: number
}

interface UserRecord {
  full_name: string | null
  unique_short_id: number | null
}

interface LogWithUser {
  user_id: string
  date: string
  meal_type: string
  users: UserRecord
}

interface LeaveWithUser {
  user_id: string
  start_date: string
  end_date: string
  is_approved: boolean
  users: UserRecord
}

interface ComprehensiveData {
  topStudents: StudentData[]
  perfectAttendance: StudentData[]
  lowAttendance: StudentData[]
  mealPlanDistribution: { DL: number; L: number; D: number }
  leaveAnalysis: {
    totalLeaveDays: number
    studentsOnLeave: number
    topLeaveStudents: LeaveData[]
  }
  peakDay: { date: string; meals: number }
  lowDay: { date: string; meals: number }
  totalStudents: number
  attendanceRate: number
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveData | null>(null)
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

      // Fetch mess periods to calculate active students
      const { data: messPeriods } = await supabase
        .from('mess_periods')
        .select('user_id, meal_plan, start_date, end_date')
        .lte('start_date', dateRange.end)
        .gte('end_date', dateRange.start)

      // Calculate active students - only those with mess periods overlapping the report period
      const activeStudentsSet = new Set<string>()
      messPeriods?.forEach(period => {
        activeStudentsSet.add(period.user_id)
      })
      const activeStudentsCount = activeStudentsSet.size

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
        activeStudents: activeStudentsCount,
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

      // Fetch comprehensive analytics data
      const { data: allLogs } = await supabase
        .from('daily_logs')
        .select('*, users(full_name, unique_short_id)')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)

      const { data: allStudents, count: totalStudentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'STUDENT')

      // Create a map of user_id to meal_plan (reuse messPeriods from above)
      const userMealPlanMap = new Map<string, string>()
      messPeriods?.forEach(period => {
        // Use the most recent period if multiple overlap
        if (!userMealPlanMap.has(period.user_id)) {
          userMealPlanMap.set(period.user_id, period.meal_plan || 'DL')
        }
      })

      const { data: leaves } = await supabase
        .from('leaves')
        .select('*, users(full_name, unique_short_id)')
        .eq('is_approved', true)
        .or(`start_date.lte.${dateRange.end},end_date.gte.${dateRange.start}`)

      // Process student meal data (defaulting all to DL meal plan)
      const studentMealMap = new Map<string, { name: string; id: number; meals: number; mealPlan: string }>()
      
      allLogs?.forEach((log) => {
        const user = (log as LogWithUser).users
        if (user) {
          const existing = studentMealMap.get(log.user_id)
          const mealPlan = userMealPlanMap.get(log.user_id) || 'DL'
          if (existing) {
            existing.meals++
          } else {
            studentMealMap.set(log.user_id, {
              name: user.full_name || 'Unknown',
              id: user.unique_short_id || 0,
              meals: 1,
              mealPlan
            })
          }
        }
      })

      // Get top students
      const topStudents = Array.from(studentMealMap.values())
        .sort((a, b) => b.meals - a.meals)
        .slice(0, 10)

      // Calculate daily trend for peak/low days
      const dailyMap = new Map<string, number>()
      allLogs?.forEach((log) => {
        const dateKey = log.date
        dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1)
      })

      const dailyEntries = Array.from(dailyMap.entries()).map(([date, meals]) => ({ date, meals }))
      const peakDay = dailyEntries.reduce((max, day) => day.meals > max.meals ? day : max, dailyEntries[0] || { date: dateRange.start, meals: 0 })
      const lowDay = dailyEntries.reduce((min, day) => day.meals < min.meals ? day : min, dailyEntries[0] || { date: dateRange.start, meals: 0 })

      // Calculate meal plan distribution from mess_periods
      // Option 3: Primary/Majority Rule - count student under meal plan they had for most days
      const mealPlanDist = { DL: 0, L: 0, D: 0 }
      
      // For each student, calculate which meal plan they had for most days in the report period
      const mealPlanReportStartDate = new Date(dateRange.start)
      const mealPlanReportEndDate = new Date(dateRange.end)
      
      // Map to track days per meal plan per student
      const studentMealPlanDays = new Map<string, { DL: number; L: number; D: number; name: string }>()
      
      // Initialize all students with 0 days for each plan
      allStudents?.forEach((student) => {
        studentMealPlanDays.set(student.id, { DL: 0, L: 0, D: 0, name: student.full_name || 'Unknown' })
      })
      
      // Calculate days for each meal plan per student
      messPeriods?.forEach((period) => {
        const periodStartDate = new Date(period.start_date)
        const periodEndDate = new Date(period.end_date)
        
        // Only process if period overlaps with report period
        if (periodEndDate >= mealPlanReportStartDate && periodStartDate <= mealPlanReportEndDate) {
          // Calculate overlap days
          const overlapStart = periodStartDate > mealPlanReportStartDate ? periodStartDate : mealPlanReportStartDate
          const overlapEnd = periodEndDate < mealPlanReportEndDate ? periodEndDate : mealPlanReportEndDate
          const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
          
          if (days > 0) {
            const studentData = studentMealPlanDays.get(period.user_id)
            if (studentData) {
              const plan = period.meal_plan || 'DL'
              if (plan === 'DL') studentData.DL += days
              else if (plan === 'L') studentData.L += days
              else if (plan === 'D') studentData.D += days
            }
          }
        }
      })
      
      // Count each student under their primary (majority) meal plan
      studentMealPlanDays.forEach((planDays) => {
        const totalDays = planDays.DL + planDays.L + planDays.D
        
        if (totalDays === 0) {
          // Student has no mess period in report range, default to DL
          mealPlanDist.DL++
        } else {
          // Find which plan has most days
          if (planDays.DL >= planDays.L && planDays.DL >= planDays.D) {
            mealPlanDist.DL++
          } else if (planDays.L >= planDays.D) {
            mealPlanDist.L++
          } else {
            mealPlanDist.D++
          }
        }
      })

      // Process leave data - only count days within report period and exclude days with meal consumption
      const leaveMap = new Map<string, { name: string; id: number; days: number }>()
      const leaveReportStartDate = new Date(dateRange.start)
      const leaveReportEndDate = new Date(dateRange.end)
      
      // Create a map of dates when each student consumed meals
      const studentMealDates = new Map<string, Set<string>>()
      allLogs?.forEach((log) => {
        if (!studentMealDates.has(log.user_id)) {
          studentMealDates.set(log.user_id, new Set())
        }
        studentMealDates.get(log.user_id)?.add(log.date)
      })
      
      leaves?.forEach((leave) => {
        const user = (leave as LeaveWithUser).users
        if (user) {
          const leaveStartDate = new Date(leave.start_date)
          const leaveEndDate = new Date(leave.end_date)
          
          // Only process if leave overlaps with report period
          if (leaveEndDate >= leaveReportStartDate && leaveStartDate <= leaveReportEndDate) {
            // Calculate overlap: use the later start date and earlier end date
            const overlapStart = leaveStartDate > leaveReportStartDate ? leaveStartDate : leaveReportStartDate
            const overlapEnd = leaveEndDate < leaveReportEndDate ? leaveEndDate : leaveReportEndDate
            
            // Count each day in the leave period, excluding days with meal consumption
            let leaveDaysCount = 0
            const currentDate = new Date(overlapStart)
            const studentMealDatesSet = studentMealDates.get(leave.user_id)
            
            while (currentDate <= overlapEnd) {
              const dateStr = currentDate.toISOString().split('T')[0]
              // Only count as leave day if student did NOT consume a meal on this day
              if (!studentMealDatesSet || !studentMealDatesSet.has(dateStr)) {
                leaveDaysCount++
              }
              currentDate.setDate(currentDate.getDate() + 1)
            }
            
            // Only add if there are actual leave days
            if (leaveDaysCount > 0) {
              const existing = leaveMap.get(leave.user_id)
              if (existing) {
                existing.days += leaveDaysCount
              } else {
                leaveMap.set(leave.user_id, {
                  name: user.full_name || 'Unknown',
                  id: user.unique_short_id || 0,
                  days: leaveDaysCount
                })
              }
            }
          }
        }
      })

      const topLeaveStudents = Array.from(leaveMap.values())
        .sort((a, b) => b.days - a.days)
        .slice(0, 5)
        .map(s => ({ studentName: s.name, studentId: s.id, leaveDays: s.days }))

      const totalLeaveDays = Array.from(leaveMap.values()).reduce((sum, s) => sum + s.days, 0)

      // Calculate perfect and low attendance
      const daysInPeriod = dailyEntries.length
      const perfectAttendance = Array.from(studentMealMap.values()).filter(s => {
        const expected = s.mealPlan === 'DL' ? daysInPeriod * 2 : daysInPeriod
        return s.meals >= expected
      })

      const lowAttendance = Array.from(studentMealMap.values()).filter(s => {
        const expected = s.mealPlan === 'DL' ? daysInPeriod * 2 : daysInPeriod
        const rate = (s.meals / expected) * 100
        return rate < 50
      }).map(s => {
        const expected = s.mealPlan === 'DL' ? daysInPeriod * 2 : daysInPeriod
        return { ...s, attendanceRate: (s.meals / expected) * 100 }
      })

      // Calculate participation rate: (active students / total students) * 100
      const participationRate = totalStudentsCount && activeStudentsCount ? (activeStudentsCount / totalStudentsCount) * 100 : 0

      setComprehensiveData({
        topStudents,
        perfectAttendance,
        lowAttendance,
        mealPlanDistribution: mealPlanDist,
        leaveAnalysis: {
          totalLeaveDays,
          studentsOnLeave: leaveMap.size,
          topLeaveStudents
        },
        peakDay,
        lowDay,
        totalStudents: totalStudentsCount || 0,
        attendanceRate: participationRate
      })

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
      if (!analytics) {
        throw new Error('No analytics data available')
      }

      // Get period label
      let periodLabel = ''
      switch (timeRange) {
        case '7days':
          periodLabel = 'Last 7 Days'
          break
        case '15days':
          periodLabel = 'Last 15 Days'
          break
        case '30days':
          periodLabel = 'Last 30 Days'
          break
        case '90days':
          periodLabel = 'Last 90 Days'
          break
        case 'custom':
          periodLabel = 'Custom Range'
          break
      }

      const { start, end } = getDateRange()

      // Fetch all logs for the period
      const { data: allLogs, error: logsError } = await supabase
        .from('daily_logs')
        .select('*, users(full_name, unique_short_id)')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })

      if (logsError) {
        console.error('Error fetching logs:', logsError)
        throw logsError
      }

      // Fetch all students with meal plans
      const { data: allStudents, count: totalStudents, error: studentsError } = await supabase
        .from('users')
        .select('id, full_name, unique_short_id', { count: 'exact' })
        .eq('role', 'STUDENT')

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        throw studentsError
      }

      // Fetch mess periods to get meal plans
      const { data: messPeriods, error: messPeriodsError } = await supabase
        .from('mess_periods')
        .select('user_id, meal_plan, start_date, end_date')
        .lte('start_date', end)
        .gte('end_date', start)

      if (messPeriodsError) {
        console.error('Error fetching mess periods:', messPeriodsError)
        throw messPeriodsError
      }

      // Calculate active students - only those with mess periods overlapping the report period
      const activeStudentsSet = new Set<string>()
      messPeriods?.forEach(period => {
        activeStudentsSet.add(period.user_id)
      })
      const activeStudentsCount = activeStudentsSet.size

      // Create a map of user_id to meal_plan
      const userMealPlanMap = new Map<string, string>()
      messPeriods?.forEach(period => {
        // Use the most recent period if multiple overlap
        if (!userMealPlanMap.has(period.user_id)) {
          userMealPlanMap.set(period.user_id, period.meal_plan || 'DL')
        }
      })

      // Fetch leaves for the period
      const { data: leaves } = await supabase
        .from('leaves')
        .select('*, users(full_name, unique_short_id)')
        .eq('is_approved', true)
        .or(`start_date.lte.${end},end_date.gte.${start}`)

      // Process student meal data
      const studentMealMap = new Map<string, { name: string; id: number; meals: number; mealPlan: string }>()
      
      allLogs?.forEach((log) => {
        const user = (log as LogWithUser).users
        if (user) {
          const existing = studentMealMap.get(log.user_id)
          const mealPlan = userMealPlanMap.get(log.user_id) || 'DL'
          if (existing) {
            existing.meals++
          } else {
            studentMealMap.set(log.user_id, {
              name: user.full_name || 'Unknown',
              id: user.unique_short_id || 0,
              meals: 1,
              mealPlan
            })
          }
        }
      })

      // Get top students
      const topStudents = Array.from(studentMealMap.values())
        .sort((a, b) => b.meals - a.meals)
        .slice(0, 10)

      // Calculate daily trend
      const dailyMap = new Map<string, { lunch: number; dinner: number }>()
      allLogs?.forEach((log) => {
        const dateKey = log.date
        const existing = dailyMap.get(dateKey) || { lunch: 0, dinner: 0 }
        if (log.meal_type === 'LUNCH') existing.lunch++
        if (log.meal_type === 'DINNER') existing.dinner++
        dailyMap.set(dateKey, existing)
      })

      const dailyTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        meals: data.lunch + data.dinner,
        lunch: data.lunch,
        dinner: data.dinner,
        revenue: (data.lunch + data.dinner) * 50
      }))

      // Find peak and low days
      const peakDay = dailyTrend.reduce((max, day) => day.meals > max.meals ? day : max, dailyTrend[0] || { date: start, meals: 0 })
      const lowDay = dailyTrend.reduce((min, day) => day.meals < min.meals ? day : min, dailyTrend[0] || { date: start, meals: 0 })

      // Calculate meal plan distribution from mess_periods
      // Option 3: Primary/Majority Rule - count student under meal plan they had for most days
      const mealPlanDist = { DL: 0, L: 0, D: 0 }
      
      // For each student, calculate which meal plan they had for most days in the report period
      const mealPlanReportStartDate = new Date(start)
      const mealPlanReportEndDate = new Date(end)
      
      // Map to track days per meal plan per student
      const studentMealPlanDays = new Map<string, { DL: number; L: number; D: number; name: string }>()
      
      // Initialize all students with 0 days for each plan
      allStudents?.forEach((student) => {
        studentMealPlanDays.set(student.id, { DL: 0, L: 0, D: 0, name: student.full_name || 'Unknown' })
      })
      
      // Calculate days for each meal plan per student
      messPeriods?.forEach((period) => {
        const periodStartDate = new Date(period.start_date)
        const periodEndDate = new Date(period.end_date)
        
        // Only process if period overlaps with report period
        if (periodEndDate >= mealPlanReportStartDate && periodStartDate <= mealPlanReportEndDate) {
          // Calculate overlap days
          const overlapStart = periodStartDate > mealPlanReportStartDate ? periodStartDate : mealPlanReportStartDate
          const overlapEnd = periodEndDate < mealPlanReportEndDate ? periodEndDate : mealPlanReportEndDate
          const days = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
          
          if (days > 0) {
            const studentData = studentMealPlanDays.get(period.user_id)
            if (studentData) {
              const plan = period.meal_plan || 'DL'
              if (plan === 'DL') studentData.DL += days
              else if (plan === 'L') studentData.L += days
              else if (plan === 'D') studentData.D += days
            }
          }
        }
      })
      
      // Count each student under their primary (majority) meal plan
      studentMealPlanDays.forEach((planDays) => {
        const totalDays = planDays.DL + planDays.L + planDays.D
        
        if (totalDays === 0) {
          // Student has no mess period in report range, default to DL
          mealPlanDist.DL++
        } else {
          // Find which plan has most days
          if (planDays.DL >= planDays.L && planDays.DL >= planDays.D) {
            mealPlanDist.DL++
          } else if (planDays.L >= planDays.D) {
            mealPlanDist.L++
          } else {
            mealPlanDist.D++
          }
        }
      })

      // Process leave data - only count days within report period and exclude days with meal consumption
      const leaveMap = new Map<string, { name: string; id: number; days: number }>()
      const leaveReportStartDate = new Date(start)
      const leaveReportEndDate = new Date(end)
      
      // Create a map of dates when each student consumed meals
      const studentMealDates = new Map<string, Set<string>>()
      allLogs?.forEach((log) => {
        if (!studentMealDates.has(log.user_id)) {
          studentMealDates.set(log.user_id, new Set())
        }
        studentMealDates.get(log.user_id)?.add(log.date)
      })
      
      leaves?.forEach((leave) => {
        const user = (leave as LeaveWithUser).users
        if (user) {
          const leaveStartDate = new Date(leave.start_date)
          const leaveEndDate = new Date(leave.end_date)
          
          // Only process if leave overlaps with report period
          if (leaveEndDate >= leaveReportStartDate && leaveStartDate <= leaveReportEndDate) {
            // Calculate overlap: use the later start date and earlier end date
            const overlapStart = leaveStartDate > leaveReportStartDate ? leaveStartDate : leaveReportStartDate
            const overlapEnd = leaveEndDate < leaveReportEndDate ? leaveEndDate : leaveReportEndDate
            
            // Count each day in the leave period, excluding days with meal consumption
            let leaveDaysCount = 0
            const currentDate = new Date(overlapStart)
            const studentMealDatesSet = studentMealDates.get(leave.user_id)
            
            while (currentDate <= overlapEnd) {
              const dateStr = currentDate.toISOString().split('T')[0]
              // Only count as leave day if student did NOT consume a meal on this day
              if (!studentMealDatesSet || !studentMealDatesSet.has(dateStr)) {
                leaveDaysCount++
              }
              currentDate.setDate(currentDate.getDate() + 1)
            }
            
            // Only add if there are actual leave days
            if (leaveDaysCount > 0) {
              const existing = leaveMap.get(leave.user_id)
              if (existing) {
                existing.days += leaveDaysCount
              } else {
                leaveMap.set(leave.user_id, {
                  name: user.full_name || 'Unknown',
                  id: user.unique_short_id || 0,
                  days: leaveDaysCount
                })
              }
            }
          }
        }
      })

      const topLeaveStudents = Array.from(leaveMap.values())
        .sort((a, b) => b.days - a.days)
        .slice(0, 5)
        .map(s => ({ studentName: s.name, studentId: s.id, leaveDays: s.days }))

      const totalLeaveDays = Array.from(leaveMap.values()).reduce((sum, s) => sum + s.days, 0)

      // Calculate perfect and low attendance
      const daysInPeriod = dailyTrend.length
      const perfectAttendance = Array.from(studentMealMap.values()).filter(s => {
        const expected = s.mealPlan === 'DL' ? daysInPeriod * 2 : daysInPeriod
        return s.meals >= expected
      })

      const lowAttendance = Array.from(studentMealMap.values()).filter(s => {
        const expected = s.mealPlan === 'DL' ? daysInPeriod * 2 : daysInPeriod
        return (s.meals / expected) < 0.5
      })

      // Calculate metrics
      const totalMeals = allLogs?.length || 0
      const totalRevenue = totalMeals * 50
      // activeStudentsCount already calculated above from mess_periods
      
      // Calculate meal distribution from allLogs
      const lunchCount = allLogs?.filter(l => l.meal_type === 'LUNCH').length || 0
      const dinnerCount = allLogs?.filter(l => l.meal_type === 'DINNER').length || 0
      const lunchPercentage = totalMeals > 0 ? (lunchCount / totalMeals) * 100 : 0
      const dinnerPercentage = totalMeals > 0 ? (dinnerCount / totalMeals) * 100 : 0
      const averageMealsPerDay = dailyTrend.length > 0 ? totalMeals / dailyTrend.length : 0

      // Generate PDF report
      await generateOwnerAnalyticsReport({
        period: {
          label: periodLabel,
          start,
          end
        },
        metrics: {
          totalMeals,
          totalRevenue,
          activeStudents: activeStudentsCount,
          totalStudents: totalStudents || 0,
          averageMealsPerDay,
          attendanceRate: activeStudentsCount > 0 && totalStudents ? (activeStudentsCount / totalStudents) * 100 : 0,
          revenuePerMeal: 50
        },
        mealDistribution: {
          lunch: lunchCount,
          dinner: dinnerCount,
          lunchPercentage,
          dinnerPercentage
        },
        mealPlanDistribution: mealPlanDist,
        dailyTrend,
        topStudents,
        lowAttendanceStudents: lowAttendance,
        perfectAttendanceStudents: perfectAttendance,
        leaveAnalysis: {
          totalLeaveDays,
          studentsOnLeave: leaveMap.size,
          topLeaveStudents
        },
        peakDay: {
          date: peakDay.date,
          meals: peakDay.meals
        },
        lowDay: {
          date: lowDay.date,
          meals: lowDay.meals
        }
      })
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

      {/* Comprehensive Analytics Sections */}
      {comprehensiveData && (
        <ComprehensiveAnalyticsSections
          topStudents={comprehensiveData.topStudents}
          perfectAttendance={comprehensiveData.perfectAttendance}
          lowAttendance={comprehensiveData.lowAttendance}
          mealPlanDistribution={comprehensiveData.mealPlanDistribution}
          leaveAnalysis={comprehensiveData.leaveAnalysis}
          peakDay={comprehensiveData.peakDay}
          lowDay={comprehensiveData.lowDay}
          totalStudents={comprehensiveData.totalStudents}
          activeStudents={analytics?.activeStudents || 0}
          attendanceRate={comprehensiveData.attendanceRate}
        />
      )}
    </div>
  )
}

