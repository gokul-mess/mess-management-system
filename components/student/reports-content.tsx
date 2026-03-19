'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  PieChart,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateProfessionalReport } from '@/lib/professional-report-generator'
import { generateAttendanceExcel } from '@/lib/excel-generator'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { ErrorMessage, SuccessMessage } from '@/components/ui/error-message'

interface ReportsContentProps {
  profile: {
    id: string
    full_name?: string
    unique_short_id?: number
    photo_url?: string | null
    meal_plan?: string | null
    created_at?: string | null
  } | null
}

type DateRangeOption = 'this_month' | 'last_month' | 'last_3_months' | 'all_time' | 'custom'

export function ReportsContent({ profile }: ReportsContentProps) {
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [recordCount, setRecordCount] = useState<number | null>(null)
  const [isLoadingCount, setIsLoadingCount] = useState(false)
  const [includeDetailedTable, setIncludeDetailedTable] = useState(false)
  
  const supabase = createClient()
  
  const {
    loading: isGenerating,
    error: generateError,
    success: generateSuccess,
    execute: executeGenerate,
    clearMessages
  } = useAsyncOperation('Generate Report')
  
  const {
    loading: isDownloadingExcel,
    error: excelError,
    success: excelSuccess,
    execute: executeExcelDownload,
    clearMessages: clearExcelMessages
  } = useAsyncOperation('Download Excel')

  const getDateRange = async (): Promise<{ start: string; end: string }> => {
    const today = new Date()
    const end = today.toISOString().split('T')[0]
    
    switch (selectedRange) {
      case 'this_month': {
        // Fetch current active mess period
        const { data: activePeriod } = await supabase
          .from('mess_periods')
          .select('start_date, end_date')
          .eq('user_id', profile?.id)
          .eq('is_active', true)
          .maybeSingle()
        
        if (activePeriod) {
          return {
            start: new Date(activePeriod.start_date).toISOString().split('T')[0],
            end: new Date(activePeriod.end_date).toISOString().split('T')[0]
          }
        }
        // Fallback to current calendar month if no active period
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        return { start: start.toISOString().split('T')[0], end }
      }
      case 'last_month': {
        // Fetch previous mess period (most recent inactive period)
        const { data: previousPeriod } = await supabase
          .from('mess_periods')
          .select('start_date, end_date')
          .eq('user_id', profile?.id)
          .eq('is_active', false)
          .order('end_date', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (previousPeriod) {
          return {
            start: new Date(previousPeriod.start_date).toISOString().split('T')[0],
            end: new Date(previousPeriod.end_date).toISOString().split('T')[0]
          }
        }
        // Fallback to previous calendar month
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
        return {
          start: lastMonth.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0]
        }
      }
      case 'last_3_months': {
        // Fetch last 3 mess periods
        const { data: periods } = await supabase
          .from('mess_periods')
          .select('start_date, end_date')
          .eq('user_id', profile?.id)
          .order('start_date', { ascending: false })
          .limit(3)
        
        if (periods && periods.length > 0) {
          const oldestPeriod = periods[periods.length - 1]
          return {
            start: new Date(oldestPeriod.start_date).toISOString().split('T')[0],
            end
          }
        }
        // Fallback to last 3 calendar months
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
        return { start: threeMonthsAgo.toISOString().split('T')[0], end }
      }
      case 'all_time': {
        // Fetch earliest mess period start date
        const { data: earliestPeriod } = await supabase
          .from('mess_periods')
          .select('start_date')
          .eq('user_id', profile?.id)
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle()
        
        if (earliestPeriod) {
          return {
            start: new Date(earliestPeriod.start_date).toISOString().split('T')[0],
            end
          }
        }
        // Fallback to account creation date or default
        const start = profile?.created_at 
          ? new Date(profile.created_at).toISOString().split('T')[0]
          : '2024-01-01'
        return { start, end }
      }
      case 'custom': {
        return { start: customStartDate, end: customEndDate }
      }
    }
  }

  const fetchRecordCount = async () => {
    if (!profile?.id) return
    
    setIsLoadingCount(true)
    try {
      const { start, end } = await getDateRange()
      
      if (selectedRange === 'custom' && (!customStartDate || !customEndDate)) {
        setRecordCount(null)
        return
      }
      
      if (selectedRange === 'custom' && new Date(customStartDate) > new Date(customEndDate)) {
        setRecordCount(null)
        return
      }
      
      const { count, error } = await supabase
        .from('daily_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('date', start)
        .lte('date', end)
      
      if (error) throw error
      setRecordCount(count || 0)
    } catch (err) {
      console.error('Error fetching record count:', err)
      setRecordCount(null)
    } finally {
      setIsLoadingCount(false)
    }
  }

  useEffect(() => {
    fetchRecordCount()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange, customStartDate, customEndDate])

  const handleDownloadExcel = async () => {
    if (!profile?.id) return
    
    clearExcelMessages()
    
    await executeExcelDownload(async () => {
      const { start, end } = await getDateRange()
      
      if (selectedRange === 'custom') {
        if (!customStartDate || !customEndDate) {
          throw new Error('Please select both start and end dates')
        }
        if (new Date(customStartDate) > new Date(customEndDate)) {
          throw new Error('Start date must be before end date')
        }
      }
      
      // Get period type label
      let periodTypeLabel = ''
      switch (selectedRange) {
        case 'this_month':
          periodTypeLabel = 'Current Mess Month'
          break
        case 'last_month':
          periodTypeLabel = 'Previous Mess Month'
          break
        case 'last_3_months':
          periodTypeLabel = 'Last 3 Mess Months'
          break
        case 'all_time':
          periodTypeLabel = 'All Time'
          break
        case 'custom':
          periodTypeLabel = 'Custom Range'
          break
      }
      
      const { data: studentData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', profile.id)
        .single()
      
      if (profileError) throw new Error('Failed to load profile data. Please try again.')
      
      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', profile.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
      
      if (logsError) throw new Error('Failed to load attendance data. Please try again.')
      
      if (!logsData || logsData.length === 0) {
        throw new Error('No attendance data found for the selected period')
      }
      
      // Fetch approved leaves for the period
      const { data: leavesData, error: leavesError } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_approved', true)
        .or(`and(start_date.lte.${end},end_date.gte.${start})`)
      
      if (leavesError) {
        console.error('Error fetching leaves:', leavesError)
      }
      
      // Fetch the mess period that overlaps with the selected report date range
      const { data: messPeriodData, error: messPeriodError } = await supabase
        .from('mess_periods')
        .select('*')
        .eq('user_id', profile.id)
        .or(`and(start_date.lte.${end},end_date.gte.${start})`)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (messPeriodError) {
        console.error('Error fetching mess period:', messPeriodError)
      }
      
      const excelData = {
        student: {
          full_name: studentData.full_name || 'Student',
          unique_short_id: studentData.unique_short_id || 0,
          meal_plan: studentData.meal_plan,
        },
        logs: logsData.map(log => ({
          date: log.date,
          meal_type: log.meal_type,
          status: log.status || 'VERIFIED',
          created_at: log.created_at,
        })),
        leaves: leavesData || [],
        messPeriod: messPeriodData ? {
          start_date: messPeriodData.start_date,
          end_date: messPeriodData.end_date,
          original_end_date: messPeriodData.original_end_date,
        } : null,
        dateRange: { start, end },
        periodType: periodTypeLabel,
        includeDetailedTable
      }
      
      generateAttendanceExcel(excelData)
    })
  }

  const handleGenerateReport = async () => {
    if (!profile?.id) return
    
    clearMessages()
    
    await executeGenerate(async () => {
      const { start, end } = await getDateRange()
      
      if (selectedRange === 'custom') {
        if (!customStartDate || !customEndDate) {
          throw new Error('Please select both start and end dates')
        }
        if (new Date(customStartDate) > new Date(customEndDate)) {
          throw new Error('Start date must be before end date')
        }
      }
      
      // Get period type label
      let periodTypeLabel = ''
      switch (selectedRange) {
        case 'this_month':
          periodTypeLabel = 'Current Mess Month'
          break
        case 'last_month':
          periodTypeLabel = 'Previous Mess Month'
          break
        case 'last_3_months':
          periodTypeLabel = 'Last 3 Mess Months'
          break
        case 'all_time':
          periodTypeLabel = 'All Time'
          break
        case 'custom':
          periodTypeLabel = 'Custom Range'
          break
      }
      
      const { data: studentData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', profile.id)
        .single()
      
      if (profileError) throw new Error('Failed to load profile data. Please try again.')
      
      // Fetch the mess period that overlaps with the selected report date range
      // This ensures we show the correct mess period data in Leave Extension Summary
      const { data: messPeriodData, error: messPeriodError } = await supabase
        .from('mess_periods')
        .select('*')
        .eq('user_id', profile.id)
        .or(`and(start_date.lte.${end},end_date.gte.${start})`)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (messPeriodError) {
        console.error('Error fetching mess period:', messPeriodError)
      }
      
      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', profile.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true })
      
      if (logsError) throw new Error('Failed to load attendance data. Please try again.')
      
      if (!logsData || logsData.length === 0) {
        throw new Error('No attendance data found for the selected period')
      }
      
      // Fetch approved leaves for the period
      const { data: leavesData, error: leavesError } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_approved', true)
        .or(`and(start_date.lte.${end},end_date.gte.${start})`)
      
      if (leavesError) {
        console.error('Error fetching leaves:', leavesError)
      }
      
      const reportData = {
        student: {
          id: studentData.id,
          full_name: studentData.full_name || 'Student',
          unique_short_id: studentData.unique_short_id || 0,
          photo_url: studentData.photo_url,
          meal_plan: studentData.meal_plan,
        },
        messPeriod: messPeriodData ? {
          start_date: messPeriodData.start_date,
          end_date: messPeriodData.end_date,
          original_end_date: messPeriodData.original_end_date,
        } : null,
        logs: logsData.map(log => ({
          log_id: log.id,
          date: log.date,
          meal_type: log.meal_type,
          status: log.status || 'VERIFIED',
          created_at: log.created_at,
        })),
        leaves: leavesData || [],
        dateRange: { start, end },
        includeDetailedTable,
        isCustomRange: selectedRange === 'custom',
        periodType: periodTypeLabel
      }
      
      await generateProfessionalReport(reportData)
    })
  }

  const dateRangeOptions = [
    { id: 'this_month' as DateRangeOption, label: 'Current Mess Month', description: 'Active mess period', icon: Calendar, color: 'from-blue-500 to-cyan-500' },
    { id: 'last_month' as DateRangeOption, label: 'Previous Mess Month', description: 'Last completed period', icon: Clock, color: 'from-purple-500 to-pink-500' },
    { id: 'last_3_months' as DateRangeOption, label: 'Last 3 Mess Months', description: 'Last 3 periods', icon: TrendingUp, color: 'from-amber-500 to-orange-500' },
    { id: 'all_time' as DateRangeOption, label: 'All Time', description: 'Complete history', icon: BarChart3, color: 'from-green-500 to-emerald-500' },
    { id: 'custom' as DateRangeOption, label: 'Custom Range', description: 'Select your dates', icon: Calendar, color: 'from-slate-500 to-gray-500' },
  ]

  const reportFeatures = [
    { icon: FileText, title: 'Student Information', description: 'Name, ID, meal plan, subscription period, and report type', color: 'text-blue-600 dark:text-blue-400' },
    { icon: BarChart3, title: 'Visual Analytics', description: '4 interactive charts with data labels showing meal trends', color: 'text-purple-600 dark:text-purple-400' },
    { icon: PieChart, title: 'Statistics Dashboard', description: 'Total meals, taken, skipped, and approved leave (days)', color: 'text-amber-600 dark:text-amber-400' },
    { icon: DollarSign, title: 'Leave Extension Summary', description: 'Approved leave days and updated mess period dates', color: 'text-green-600 dark:text-green-400' },
    { icon: Calendar, title: 'Detailed Meal Table', description: 'Optional day-by-day meal record with color-coded status', color: 'text-red-600 dark:text-red-400' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-blue-400/30 shadow-xl">
            <FileText className="w-8 h-8 text-blue-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Professional Reports</h2>
            <p className="text-slate-300 text-sm">Download comprehensive PDF reports with analytics, charts, and detailed logs</p>
          </div>
        </div>
      </div>

      {generateSuccess && <SuccessMessage message="Report downloaded successfully!" />}
      {generateError && <ErrorMessage error={generateError} onRetry={handleGenerateReport} />}
      {excelSuccess && <SuccessMessage message="Excel file downloaded successfully!" />}
      {excelError && <ErrorMessage error={excelError} onRetry={handleDownloadExcel} />}

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Select Report Period</h3>
              <p className="text-xs text-muted-foreground">Choose the date range for your report (based on mess periods)</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {dateRangeOptions.map((option, index) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                onClick={() => {
                  setSelectedRange(option.id)
                  // fetchRecordCount will be triggered by useEffect when selectedRange changes
                }}
                className={`relative overflow-hidden rounded-xl p-4 border-2 transition-all duration-300 group ${
                  selectedRange === option.id
                    ? 'border-primary bg-primary/10 shadow-lg scale-105'
                    : 'border-border hover:border-primary/50 hover:shadow-md hover:scale-102'
                }`}
                style={{ animationDelay: `${index * 100}ms`, animation: 'fadeInUp 0.5s ease-out forwards', opacity: 0 }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className="relative">
                  <Icon className={`w-6 h-6 mb-2 ${selectedRange === option.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-semibold text-sm mb-1">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
                {selectedRange === option.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-5 h-5 text-primary animate-bounce" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

          {selectedRange === 'custom' && (
            <div className="bg-accent/50 rounded-xl p-4 border border-border animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Start Date</label>
                  <input type="date" value={customStartDate} onChange={(e) => { setCustomStartDate(e.target.value); if (e.target.value && customEndDate) { setTimeout(fetchRecordCount, 100) } }} className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">End Date</label>
                  <input type="date" value={customEndDate} onChange={(e) => { setCustomEndDate(e.target.value); if (customStartDate && e.target.value) { setTimeout(fetchRecordCount, 100) } }} className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium" />
                </div>
              </div>
              {customStartDate && customEndDate && new Date(customStartDate) > new Date(customEndDate) && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  Start date must be before end date
                </div>
              )}
            </div>
          )}

          {isLoadingCount ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Loading data...
            </div>
          ) : recordCount !== null && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-semibold">{recordCount}</span> attendance record{recordCount !== 1 ? 's' : ''} found for the selected period
              </p>
            </div>
          )}
          
          {/* Checkbox for detailed table */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={includeDetailedTable}
                onChange={(e) => setIncludeDetailedTable(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-2 border-amber-400 text-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 cursor-pointer"
              />
              <div className="flex-1">
                <p className="font-semibold text-sm text-amber-900 dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-200 transition-colors">
                  Include Detailed Meal Record Table
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Add a complete date-wise meal attendance table to the report. This will provide comprehensive day-by-day details.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">What&apos;s Included in Your Report</h3>
              <p className="text-xs text-muted-foreground">Professional multi-page PDF with comprehensive analytics and insights</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="flex items-start gap-3 p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-all duration-300 group hover:scale-105" style={{ animationDelay: `${index * 100}ms`, animation: 'fadeInUp 0.5s ease-out forwards', opacity: 0 }}>
                  <div className={`w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 border border-border`}>
                    <Icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Download Report</h3>
              <p className="text-xs text-muted-foreground">Generate and download your professional PDF report</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Button onClick={handleGenerateReport} disabled={isGenerating || recordCount === 0 || (selectedRange === 'custom' && (!customStartDate || !customEndDate || new Date(customStartDate) > new Date(customEndDate)))} className="w-full py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              {isGenerating ? (<><div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin mr-3" />Generating Report...</>) : (<><Download className="w-5 h-5 mr-3" />Download PDF Report</>)}
            </Button>
            
            <Button onClick={handleDownloadExcel} disabled={isDownloadingExcel || recordCount === 0 || (selectedRange === 'custom' && (!customStartDate || !customEndDate || new Date(customStartDate) > new Date(customEndDate)))} variant="outline" className="w-full py-6 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 border-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20">
              {isDownloadingExcel ? (<><div className="w-5 h-5 border-3 border-green-600 border-t-transparent rounded-full animate-spin mr-3" />Downloading Excel...</>) : (<><FileText className="w-5 h-5 mr-3" />Download Attendance Data (Excel)</>)}
            </Button>
          </div>
          {recordCount === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-3">
              No attendance data available for the selected period.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
