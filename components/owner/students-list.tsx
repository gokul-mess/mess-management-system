'use client'

import { useState, useEffect, useCallback, useReducer, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Download, 
  User, 
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  X,
  FileText,
  CreditCard,
  Plus,
  Utensils
} from 'lucide-react'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { validateRequired, validateNumberRange, parseError, ErrorResult } from '@/lib/error-handler'
import { ErrorMessage, SuccessMessage } from '@/components/ui/error-message'
import { LoadingState } from '@/components/ui/loading-state'
import { generateProfessionalReport } from '@/lib/professional-report-generator'
import { generateAttendanceExcel } from '@/lib/excel-generator'
import { MealPlanBadge } from '@/components/shared/meal-plan-badge'
import { FeePaymentStatus, PAYMENT_SUCCESS_TIMEOUT, MAX_NOTE_LENGTH, MIN_AMOUNT, MAX_AMOUNT, type FeePayment } from '@/components/shared/fee-payment-status'
import { MessCycleTracker } from '@/components/shared/mess-cycle-tracker'
import { WeeklyProgressBar } from '@/components/shared/weekly-progress-bar'
import { getPayableAmount, DEFAULT_PRICING, type MealPlanPricing } from '@/lib/pricing-utils'
import { SETTINGS_ID } from '@/lib/constants'
import { 
  getMessPeriodDateRange, 
  getPeriodTypeLabel,
  type DateRangeType 
} from '@/lib/mess-period-utils'
import { fetchReportData, transformForPDFReport, transformForExcelReport } from '@/lib/report-data-fetcher'

type PaymentMode = 'UPI' | 'CASH'

interface FeePaymentState {
  payments: FeePayment[]
  isLoading: boolean
  error: string | null
  showForm: boolean
  formAmount: string
  formMode: PaymentMode
  formNote: string
  isSaving: boolean
  saveError: string | null
  saveSuccess: boolean
}

const INITIAL_FEE_STATE: FeePaymentState = {
  payments: [], isLoading: false, error: null,
  showForm: false, formAmount: '',
  formMode: 'CASH', formNote: '', isSaving: false,
  saveError: null, saveSuccess: false,
}

type FeeAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payments: FeePayment[] }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'TOGGLE_FORM' }
  | { type: 'CLOSE_FORM' }
  | { type: 'SET_AMOUNT'; value: string }
  | { type: 'SET_MODE'; value: PaymentMode }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; payments: FeePayment[] }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'CLEAR_SUCCESS' }
  | { type: 'RESET' }

function feeReducer(state: FeePaymentState, action: FeeAction): FeePaymentState {
  switch (action.type) {
    case 'FETCH_START': return { ...state, isLoading: true, error: null }
    case 'FETCH_SUCCESS': return { ...state, isLoading: false, payments: action.payments }
    case 'FETCH_ERROR': return { ...state, isLoading: false, error: action.error }
    case 'TOGGLE_FORM': return { ...state, showForm: !state.showForm, saveError: null }
    case 'CLOSE_FORM': return { ...state, showForm: false, saveError: null, formAmount: '', formNote: '', formMode: 'CASH' }
    case 'SET_AMOUNT': return { ...state, formAmount: action.value }
    case 'SET_MODE': return { ...state, formMode: action.value }
    case 'SET_NOTE': return { ...state, formNote: action.value.slice(0, MAX_NOTE_LENGTH) }
    case 'SAVE_START': return { ...state, isSaving: true, saveError: null }
    case 'SAVE_SUCCESS': return { ...state, isSaving: false, payments: action.payments, showForm: false, saveSuccess: true, formAmount: '', formNote: '', formMode: 'CASH' }
    case 'SAVE_ERROR': return { ...state, isSaving: false, saveError: action.error }
    case 'CLEAR_SUCCESS': return { ...state, saveSuccess: false }
    case 'RESET': return INITIAL_FEE_STATE
    default: return state
  }
}

interface Student {
  id: string
  full_name: string
  unique_short_id: number
  photo_url?: string
  phone?: string
  address?: string
  meal_plan?: 'L' | 'D' | 'DL'
  is_active: boolean
  subscription_end_date?: string
  /** End date sourced from the active mess_period (preferred over subscription_end_date) */
  mess_end_date?: string
  /** Start date sourced from the active mess_period */
  mess_start_date?: string
  /** Original end date before leave extensions */
  mess_original_end_date?: string
  /** Approved leave days count for the current mess period */
  approved_leave_days?: number
  profile_edit_allowed?: boolean
  photo_update_allowed?: boolean
  editable_fields?: string[]
  permission_expires_at?: string
  created_at: string
}

export function StudentsList() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<ErrorResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  
  // Table enhancement states
  const [sortColumn, setSortColumn] = useState<'name' | 'id' | 'status' | 'joined' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  
  // Use async operation hooks for different operations
  const {
    loading: permissionLoading,
    error: permissionError,
    success: permissionSuccess,
    execute: executePermission,
    clearMessages: clearPermissionMessages
  } = useAsyncOperation('Save Permissions')
  
  const {
    loading: editLoading,
    error: editError,
    success: editSuccess,
    execute: executeEdit,
    clearMessages: clearEditMessages
  } = useAsyncOperation('Edit Student')
  
  // Report generation states
  const [reportPeriod, setReportPeriod] = useState<DateRangeType>('this_month')
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf')
  const [includeDetailedTable, setIncludeDetailedTable] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)
  
  // Mess period state
  const [messPeriod, setMessPeriod] = useState<{
    start_date: string
    end_date: string
    original_end_date: string
    meal_plan?: string
  } | null>(null)
  const [pricing, setPricing] = useState<MealPlanPricing>(DEFAULT_PRICING)

  // Fee payment state via reducer
  const [fee, dispatchFee] = useReducer(feeReducer, INITIAL_FEE_STATE)
  const feeSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Permission form state
  const [permissionForm, setPermissionForm] = useState({
    profile_edit_allowed: false,
    photo_update_allowed: false,
    editable_fields: [] as string[],
    time_value: '24',
    time_unit: 'hours' as 'minutes' | 'hours'
  })

  // Student edit form state
  const [studentEditForm, setStudentEditForm] = useState({
    full_name: '',
    phone: '',
    address: ''
  })

  // Mess period edit state
  const [isEditingMessPeriod, setIsEditingMessPeriod] = useState(false)
  const [messPeriodSaving, setMessPeriodSaving] = useState(false)
  const [messPeriodSaveError, setMessPeriodSaveError] = useState<string | null>(null)
  const [messPeriodEditForm, setMessPeriodEditForm] = useState({
    meal_plan: 'DL' as 'L' | 'D' | 'DL',
    start_date: '',
  })
  
  const supabase = createClient()

  const fetchStudents = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('users')
        .select('*, mess_periods!mess_periods_user_id_fkey(id, meal_plan, is_active, end_date, start_date, original_end_date)')
        .eq('role', 'STUDENT')
        .order('unique_short_id', { ascending: true })

      if (error) throw error
      
      // Merge active mess_period meal_plan and end_date into each student
      // Calculate active status based on mess_periods.end_date >= today AND mess_periods.is_active = true
      const merged = await Promise.all((data || []).map(async (s: Record<string, unknown>) => {
        const periods = s.mess_periods as { id: string; meal_plan: string; is_active: boolean; end_date: string; start_date: string; original_end_date: string }[] | null
        const activePeriod = periods?.find(p => p.is_active)
        
        // Calculate active status: has active period AND end_date >= today
        const calculatedIsActive = activePeriod 
          ? activePeriod.end_date >= today && activePeriod.is_active
          : false
        
        // Fetch approved leave days for the active mess period
        let approvedLeaveDays = 0
        if (activePeriod) {
          const { data: leavesData } = await supabase
            .from('leaves')
            .select('start_date, end_date')
            .eq('user_id', s.id)
            .eq('is_approved', true)
            .gte('end_date', activePeriod.start_date)
            .lte('start_date', activePeriod.original_end_date)
          
          // Calculate total leave days
          if (leavesData && leavesData.length > 0) {
            approvedLeaveDays = leavesData.reduce((total, leave) => {
              const start = new Date(leave.start_date)
              const end = new Date(leave.end_date)
              const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
              return total + days
            }, 0)
          }
        }
        
        return {
          ...s,
          meal_plan: activePeriod?.meal_plan ?? s.meal_plan,
          mess_end_date: activePeriod?.end_date ?? undefined,
          mess_start_date: activePeriod?.start_date ?? undefined,
          mess_original_end_date: activePeriod?.original_end_date ?? undefined,
          approved_leave_days: approvedLeaveDays,
          is_active: calculatedIsActive, // Override with calculated status
        } as Student
      }))
      setStudents(merged)
    } catch (err) {
      console.error('Error fetching students:', err)
      setFetchError(parseError(err))
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Load meal plan pricing from DB once
  useEffect(() => {
    supabase
      .from('mess_settings')
      .select('lunch_price, dinner_price, both_price')
      .eq('id', SETTINGS_ID)
      .single()
      .then(({ data }) => {
        if (data) {
          setPricing({
            lunch_price: data.lunch_price ?? DEFAULT_PRICING.lunch_price,
            dinner_price: data.dinner_price ?? DEFAULT_PRICING.dinner_price,
            both_price: data.both_price ?? DEFAULT_PRICING.both_price,
          })
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.filter-dropdown') && !target.closest('.filter-button')) {
        setShowFilterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const openStudentDetail = async (student: Student) => {
    setSelectedStudent(student)
    // Load current photo permission into form
    setPermissionForm({
      profile_edit_allowed: false,
      photo_update_allowed: student.photo_update_allowed || false,
      editable_fields: [],
      time_value: '24',
      time_unit: 'hours'
    })
    // Load student data into edit form
    setStudentEditForm({
      full_name: student.full_name || '',
      phone: student.phone || '',
      address: student.address || ''
    })
    clearPermissionMessages()
    clearEditMessages()
    setIsEditingStudent(false)
    
    // Fetch active mess period for the student
    let activePeriod: { start_date: string; end_date: string; original_end_date: string; meal_plan?: string } | null = null
    try {
      const { data, error: periodError } = await supabase
        .from('mess_periods')
        .select('start_date, end_date, original_end_date, meal_plan')
        .eq('user_id', student.id)
        .eq('is_active', true)
        .maybeSingle()
      activePeriod = periodError ? null : data
      setMessPeriod(activePeriod)
    } catch (err) {
      console.error('Error fetching mess period:', err)
      setMessPeriod(null)
    }

    // Pre-fill the mess period edit form from the active period
    setIsEditingMessPeriod(false)
    setMessPeriodSaveError(null)
    setMessPeriodEditForm({
      meal_plan: (activePeriod?.meal_plan ?? 'DL') as 'L' | 'D' | 'DL',
      start_date: activePeriod?.start_date
        ? activePeriod.start_date.split('T')[0]
        : '',
    })

    // Fetch fee payments and open modal
    dispatchFee({ type: 'RESET' })
    setShowDetailModal(true)
    fetchFeePayments(student.id)
  }

  const fetchFeePayments = useCallback(async (studentId: string) => {
    dispatchFee({ type: 'FETCH_START' })
    
    // First, get the active mess period ID
    const { data: messPeriodData, error: periodError } = await supabase
      .from('mess_periods')
      .select('id')
      .eq('user_id', studentId)
      .eq('is_active', true)
      .maybeSingle()
    
    if (periodError) {
      dispatchFee({ type: 'FETCH_ERROR', error: 'Failed to load mess period' })
      return
    }
    
    if (!messPeriodData) {
      dispatchFee({ type: 'FETCH_ERROR', error: 'No active mess period found' })
      return
    }
    
    // Now query payments by mess_period_id
    const { data, error } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('user_id', studentId)
      .eq('mess_period_id', messPeriodData.id)
      .order('installment_number', { ascending: true })
      
    if (error) {
      dispatchFee({ type: 'FETCH_ERROR', error: parseError(error).message })
      return
    }
    dispatchFee({ type: 'FETCH_SUCCESS', payments: data || [] })
  }, [supabase])

  const handleAddPayment = async () => {
    if (!selectedStudent) return

    const amountNum = parseFloat(fee.formAmount)
    const amountError = validateNumberRange(amountNum, MIN_AMOUNT, MAX_AMOUNT, 'Amount')
    if (amountError) { dispatchFee({ type: 'SAVE_ERROR', error: amountError.message }); return }

    // Get the active mess period ID and meal plan
    const { data: messPeriodData, error: periodError } = await supabase
      .from('mess_periods')
      .select('id, meal_plan')
      .eq('user_id', selectedStudent.id)
      .eq('is_active', true)
      .maybeSingle()
    
    if (periodError || !messPeriodData) {
      dispatchFee({ type: 'SAVE_ERROR', error: 'No active mess period found' })
      return
    }

    // Calculate total payable based on meal plan
    const mealPlan = messPeriodData.meal_plan as 'L' | 'D' | 'DL'
    const totalPayable = getPayableAmount(mealPlan, pricing)
    
    // Calculate total already paid
    const totalPaid = fee.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    
    // Auto-determine installment number
    const paidInstallments = new Set(fee.payments.map(p => p.installment_number))
    const installmentNumber: 1 | 2 = paidInstallments.has(1) ? 2 : 1
    
    // Validate against overpayment
    if (totalPayable && (totalPaid + amountNum) > totalPayable) {
      const remaining = totalPayable - totalPaid
      dispatchFee({ 
        type: 'SAVE_ERROR', 
        error: `Amount exceeds remaining balance. Maximum allowed: ₹${remaining.toLocaleString('en-IN')}` 
      })
      return
    }

    // CRITICAL: If this is the 2nd installment, it MUST complete the payment
    if (installmentNumber === 2 && totalPayable) {
      const remaining = totalPayable - totalPaid
      if (amountNum !== remaining) {
        dispatchFee({ 
          type: 'SAVE_ERROR', 
          error: `2nd installment must complete the payment. Required amount: ₹${remaining.toLocaleString('en-IN')}` 
        })
        return
      }
    }

    dispatchFee({ type: 'SAVE_START' })
    const { error } = await supabase
      .from('fee_payments')
      .insert({
        user_id: selectedStudent.id,
        mess_period_id: messPeriodData.id,
        installment_number: installmentNumber,
        amount: amountNum,
        payment_mode: fee.formMode,
        note: fee.formNote || null,
      })

    if (error) {
      const parsed = parseError(error)
      dispatchFee({
        type: 'SAVE_ERROR',
        error: error.code === '23505' ? 'Installment already recorded for this period.' : parsed.message,
      })
      return
    }

    // Refresh payments by mess_period_id
    const { data: updated } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('user_id', selectedStudent.id)
      .eq('mess_period_id', messPeriodData.id)
      .order('installment_number', { ascending: true })

    dispatchFee({ type: 'SAVE_SUCCESS', payments: updated || [] })
    if (feeSuccessTimer.current) clearTimeout(feeSuccessTimer.current)
    feeSuccessTimer.current = setTimeout(() => dispatchFee({ type: 'CLEAR_SUCCESS' }), PAYMENT_SUCCESS_TIMEOUT)
  }

  useEffect(() => {
    return () => { if (feeSuccessTimer.current) clearTimeout(feeSuccessTimer.current) }
  }, [])

  const handleSaveStudentEdit = async () => {
    if (!selectedStudent) return
    
    clearEditMessages()
    
    // Validate required fields
    const validationError = validateRequired(studentEditForm, ['full_name'])
    if (validationError) {
      // Show validation error using the error handler
      await executeEdit(async () => {
        throw new Error(validationError.message)
      })
      return
    }
    
    await executeEdit(async () => {
      console.log('Attempting to update student:', selectedStudent.id)
      console.log('Update data:', {
        full_name: studentEditForm.full_name,
        phone: studentEditForm.phone,
        address: studentEditForm.address
      })
      
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: studentEditForm.full_name,
          phone: studentEditForm.phone,
          address: studentEditForm.address
        })
        .eq('id', selectedStudent.id)
        .select()

      console.log('Update response:', { data, error })

      if (error) {
        console.error('Update error:', error)
        throw error
      }
      
      if (!data || data.length === 0) {
        throw new Error('No rows were updated. This might be a permissions issue.')
      }

      setIsEditingStudent(false)
      
      // Refresh students list
      await fetchStudents()
      
      // Update selected student
      const updatedStudent = students.find(s => s.id === selectedStudent.id)
      if (updatedStudent) {
        setSelectedStudent(updatedStudent)
        setStudentEditForm({
          full_name: updatedStudent.full_name || '',
          phone: updatedStudent.phone || '',
          address: updatedStudent.address || ''
        })
      }
    })
  }

  const handleSavePermissions = async () => {
    if (!selectedStudent) return
    
    clearPermissionMessages()
    
    // Validate time input
    const timeValue = parseInt(permissionForm.time_value)
    const validationError = validateNumberRange(
      timeValue,
      1,
      permissionForm.time_unit === 'minutes' ? 10080 : 168,
      `Duration (${permissionForm.time_unit})`
    )
    
    if (permissionForm.photo_update_allowed && validationError) {
      // Validation error will be shown by the hook
      return
    }
    
    await executePermission(async () => {
      // Calculate expiry time if photo permission is enabled
      let expiresAt = null
      if (permissionForm.photo_update_allowed) {
        const milliseconds = permissionForm.time_unit === 'minutes' 
          ? timeValue * 60 * 1000 
          : timeValue * 60 * 60 * 1000
        expiresAt = new Date(Date.now() + milliseconds).toISOString()
      }

      const { error } = await supabase
        .from('users')
        .update({
          photo_update_allowed: permissionForm.photo_update_allowed,
          permission_expires_at: expiresAt
        })
        .eq('id', selectedStudent.id)

      if (error) throw error
      
      // Refresh students list
      await fetchStudents()
      
      // Update selected student
      const updatedStudent = students.find(s => s.id === selectedStudent.id)
      if (updatedStudent) {
        setSelectedStudent(updatedStudent)
      }
    })
  }

  const handleGenerateReport = async () => {
    if (!selectedStudent) return
    
    setIsGeneratingReport(true)
    setReportError(null)
    setReportSuccess(false)
    
    try {
      const supabase = createClient()
      
      // Get date range based on selected period
      const getDateRange = async (): Promise<{ start: string; end: string }> => {
        return getMessPeriodDateRange(
          supabase,
          selectedStudent.id,
          reportPeriod,
          undefined,
          selectedStudent.created_at || undefined
        )
      }
      
      const { start, end } = await getDateRange()
      
      // Use centralized data fetcher
      const fetchedData = await fetchReportData({
        supabase,
        userId: selectedStudent.id,
        startDate: start,
        endDate: end
      })
      
      const periodTypeLabel = getPeriodTypeLabel(reportPeriod)
      
      if (exportFormat === 'pdf') {
        // Add additional fields needed for PDF generation
        const pdfReportData = transformForPDFReport(
          fetchedData,
          { start, end },
          includeDetailedTable,
          periodTypeLabel
        )
        
        // Set isCustomRange flag
        pdfReportData.isCustomRange = false
        
        await generateProfessionalReport(pdfReportData)
      } else {
        const excelData = transformForExcelReport(
          fetchedData,
          { start, end },
          includeDetailedTable,
          periodTypeLabel
        )
        
        generateAttendanceExcel(excelData)
      }
      
      setReportSuccess(true)
      setTimeout(() => setReportSuccess(false), 3000)
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleExport = () => {
    try {
      if (filteredStudents.length === 0) {
        throw new Error('No students to export')
      }
      
      const csvContent = [
        ['ID', 'Name', 'Short ID', 'Status', 'Subscription End', 'Joined Date'].join(','),
        ...filteredStudents.map(s => [
          s.id,
          s.full_name,
          s.unique_short_id,
          s.is_active ? 'Active' : 'Inactive',
          s.subscription_end_date || 'N/A',
          new Date(s.created_at).toLocaleDateString('en-IN')
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `students-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert(parseError(error).message)
    }
  }

  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudents)
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId)
    } else {
      newSelection.add(studentId)
    }
    setSelectedStudents(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)))
    }
  }

  const getDaysRemaining = (student: Student) => {
    // Use original_end_date (base 30 days) for calculation, not the extended end_date
    const originalEndDate = student.mess_original_end_date || student.mess_end_date || student.subscription_end_date
    if (!originalEndDate) return null
    
    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const originalEnd = new Date(originalEndDate)
    originalEnd.setHours(0, 0, 0, 0)
    
    // Calculate base days remaining (from original 30-day period)
    const msRemaining = originalEnd.getTime() - today.getTime()
    const baseDays = Math.floor(msRemaining / (1000 * 60 * 60 * 24)) + 1
    
    // Add approved leave days to the display
    const approvedLeaveDays = student.approved_leave_days || 0
    const totalDaysRemaining = Math.max(0, baseDays) + approvedLeaveDays
    
    return totalDaysRemaining
  }

  const getDaysElapsed = (student: Student) => {
    // Calculate days consumed from the total 30-day period
    // Days consumed = 30 - total days remaining (including approved leave days)
    const originalEndDate = student.mess_original_end_date || student.mess_end_date || student.subscription_end_date
    if (!originalEndDate) return 0
    
    // Get today's date at midnight for accurate day counting
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const originalEnd = new Date(originalEndDate)
    originalEnd.setHours(0, 0, 0, 0)
    
    // Calculate base days remaining (from original 30-day period, without leave days)
    const msRemaining = originalEnd.getTime() - today.getTime()
    const baseDaysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24)) + 1
    
    // Add approved leave days to get total days remaining
    const approvedLeaveDays = student.approved_leave_days || 0
    const totalDaysRemaining = Math.max(0, baseDaysRemaining) + approvedLeaveDays
    
    // Days consumed = 30 - total days remaining
    const daysConsumed = 30 - totalDaysRemaining
    
    // Clamp between 0 and 30
    return Math.max(0, Math.min(30, daysConsumed))
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.unique_short_id.toString().includes(searchQuery)
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && student.is_active) ||
                         (filterStatus === 'inactive' && !student.is_active)
    return matchesSearch && matchesFilter
  })

  // Sorting logic
  const handleSort = (column: 'name' | 'id' | 'status' | 'joined') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortColumn) return 0

    let comparison = 0
    switch (sortColumn) {
      case 'name':
        comparison = a.full_name.localeCompare(b.full_name)
        break
      case 'id':
        comparison = a.unique_short_id - b.unique_short_id
        break
      case 'status':
        comparison = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1
        break
      case 'joined':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Pagination logic
  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStudents = sortedStudents.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: 'name' | 'id' | 'status' | 'joined' }) => {
    if (sortColumn !== column) {
      return (
        <svg className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full transition-all duration-300 hover:scale-110 hover:rotate-90"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="filter-button px-4 py-2.5 rounded-lg border border-input bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 flex items-center gap-2"
            >
              <span className="capitalize">{filterStatus === 'all' ? 'All Students' : filterStatus}</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ${showFilterDropdown ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showFilterDropdown && (
              <div className="filter-dropdown absolute top-full mt-2 right-0 w-48 bg-white dark:bg-zinc-900 rounded-lg border border-border shadow-xl z-10 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                {(['all', 'active', 'inactive'] as const).map((status, index) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status)
                      setShowFilterDropdown(false)
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-accent transition-colors capitalize flex items-center gap-2"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'slideIn 0.3s ease-out forwards'
                    }}
                  >
                    {filterStatus === status && (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    )}
                    <span className={filterStatus === status ? 'font-semibold' : ''}>
                      {status === 'all' ? 'All Students' : status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="hover:scale-105 transition-transform duration-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search Results Indicator */}
      {searchQuery && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Found <span className="font-semibold">{filteredStudents.length}</span> student{filteredStudents.length !== 1 ? 's' : ''} matching &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedStudents.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{selectedStudents.size} student{selectedStudents.size > 1 ? 's' : ''} selected</p>
              <p className="text-sm text-muted-foreground">Bulk actions available</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedStudents(new Set())}>
              Clear Selection
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Students', value: students.length, color: 'blue' },
          { label: 'Active', value: students.filter(s => s.is_active).length, color: 'green' },
          { label: 'Inactive', value: students.filter(s => !s.is_active).length, color: 'red' }
        ].map((stat, index) => (
          <div 
            key={stat.label}
            className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: 'fadeInUp 0.5s ease-out forwards',
              opacity: 0
            }}
          >
            <p className="text-sm text-muted-foreground mb-1 group-hover:text-primary transition-colors">{stat.label}</p>
            <p className={`text-2xl font-bold ${
              stat.color === 'green' ? 'text-green-600 dark:text-green-400' :
              stat.color === 'red' ? 'text-red-600 dark:text-red-400' : ''
            } group-hover:scale-110 transition-transform inline-block`}>
              {stat.value}
            </p>
            <TrendingUp className={`w-4 h-4 inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity ${
              stat.color === 'green' ? 'text-green-600' :
              stat.color === 'red' ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
        ))}
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        {fetchError ? (
          <div className="p-12">
            <ErrorMessage 
              error={fetchError} 
              onRetry={fetchStudents}
            />
          </div>
        ) : isLoading ? (
          <LoadingState message="Loading students..." />
        ) : filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b-2 border-border">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === paginatedStudents.length && paginatedStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-all duration-300 hover:scale-110 checked:animate-bounce"
                    />
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Student
                      <SortIcon column="name" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center gap-2">
                      ID
                      <SortIcon column="id" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Meal Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Subscription</th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold cursor-pointer hover:bg-accent/50 transition-colors group"
                    onClick={() => handleSort('joined')}
                  >
                    <div className="flex items-center gap-2">
                      Joined
                      <SortIcon column="joined" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedStudents.map((student, index) => {
                  const daysRemaining = getDaysRemaining(student)
                  
                  return (
                    <tr 
                      key={student.id} 
                      className={`transition-all duration-300 group cursor-pointer relative ${
                        hoveredRow === student.id 
                          ? 'bg-primary/5 shadow-md z-10' 
                          : 'hover:bg-accent/30'
                      } ${selectedStudents.has(student.id) ? 'bg-primary/10' : ''}`}
                      onMouseEnter={() => setHoveredRow(student.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: 'slideInLeft 0.4s ease-out forwards',
                        opacity: 0
                      }}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer transition-all duration-300 hover:scale-125 checked:animate-bounce"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20 group-hover:border-primary/40 transition-all duration-300 group-hover:scale-110">
                            {student.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={student.photo_url}
                                alt={student.full_name || 'Student'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-primary" />
                            )}
                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300" />
                          </div>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded group-hover:bg-primary/20 transition-colors">
                          #{student.unique_short_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {student.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full animate-pulse-slow">
                            <CheckCircle className="w-3.5 h-3.5 animate-bounce-slow" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <MealPlanBadge plan={student.meal_plan} />
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          // Use mess_end_date (from mess_periods) as primary, fall back to subscription_end_date
                          const endDate = student.mess_end_date || student.subscription_end_date
                          if (!endDate) return <span className="text-sm text-muted-foreground">Not set</span>
                          
                          const daysElapsed = getDaysElapsed(student)
                          
                          return (
                            <div className="space-y-1">
                              <span className="text-sm text-muted-foreground block">
                                Until {new Date(endDate).toLocaleDateString('en-IN')}
                              </span>
                              {daysRemaining !== null && (
                                <>
                                  <WeeklyProgressBar daysElapsed={daysElapsed} />
                                  <span className={`text-xs ${
                                    daysRemaining > 7 ? 'text-green-600 dark:text-green-400' :
                                    daysRemaining > 3 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
                                  </span>
                                </>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(student.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openStudentDetail(student)}
                          className="hover:scale-105 transition-transform duration-300"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Showing</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>of {sortedStudents.length} students</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg border transition-all duration-300 ${
                              currentPage === page
                                ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-110'
                                : 'border-input bg-background hover:bg-accent hover:scale-105'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="w-10 h-10 flex items-center justify-center">...</span>
                      }
                      return null
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-input bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No students found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Students will appear here once registered'}
            </p>
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-6xl w-full max-h-[90vh] shadow-2xl border border-border overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-4 border-primary/20">
                  {selectedStudent.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedStudent.photo_url}
                      alt={selectedStudent.full_name || 'Student'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedStudent.full_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Student ID: #{selectedStudent.unique_short_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedStudent(null)
                }}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Student Information */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      <h4 className="text-lg font-semibold">Student Information</h4>
                    </div>
                    {!isEditingStudent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingStudent(true)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingStudent(false)
                            setStudentEditForm({
                              full_name: selectedStudent.full_name || '',
                              phone: selectedStudent.phone || '',
                              address: selectedStudent.address || ''
                            })
                            clearPermissionMessages()
                            clearEditMessages()
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveStudentEdit}
                          disabled={editLoading}
                        >
                          {editLoading ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {selectedStudent.is_active ? (
                        <span className="inline-flex items-center gap-2 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full">
                          <CheckCircle className="w-4 h-4" />
                          Active Subscription
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-3 py-1.5 rounded-full">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {/* Manual Active Status Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Manual Override (Mess Period):</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudent.is_active}
                          onChange={async (e) => {
                            const newStatus = e.target.checked
                            try {
                              // Update mess_periods.is_active instead of users.is_active
                              const { error } = await supabase
                                .from('mess_periods')
                                .update({ is_active: newStatus })
                                .eq('user_id', selectedStudent.id)
                                .eq('is_active', !newStatus) // Update the currently active/inactive period
                              
                              if (error) throw error
                              
                              // Update local state
                              setSelectedStudent({ ...selectedStudent, is_active: newStatus })
                              await fetchStudents()
                            } catch (err) {
                              console.error('Error updating status:', err)
                              alert('Failed to update mess period status')
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Student Information Grid */}
                  <div className="grid grid-cols-1 gap-3">
                    {/* Full Name */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Full Name</p>
                      {isEditingStudent ? (
                        <input
                          type="text"
                          value={studentEditForm.full_name}
                          onChange={(e) => setStudentEditForm({ ...studentEditForm, full_name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{selectedStudent.full_name}</p>
                      )}
                    </div>

                    {/* Short ID (Non-editable) */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Short ID</p>
                      <p className="font-semibold font-mono">#{selectedStudent.unique_short_id}</p>
                    </div>

                    {/* Phone */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Phone</p>
                      {isEditingStudent ? (
                        <input
                          type="tel"
                          value={studentEditForm.phone}
                          onChange={(e) => setStudentEditForm({ ...studentEditForm, phone: e.target.value })}
                          placeholder="Enter phone number"
                          className="w-full px-3 py-1.5 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold"
                        />
                      ) : (
                        <p className="font-semibold">{selectedStudent.phone || 'Not set'}</p>
                      )}
                    </div>

                    {/* Address */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Address</p>
                      {isEditingStudent ? (
                        <textarea
                          value={studentEditForm.address}
                          onChange={(e) => setStudentEditForm({ ...studentEditForm, address: e.target.value })}
                          placeholder="Enter address"
                          rows={2}
                          className="w-full px-3 py-1.5 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold resize-none"
                        />
                      ) : (
                        <p className="font-semibold text-sm">{selectedStudent.address || 'Not set'}</p>
                      )}
                    </div>

                    {/* ── Meal Plan & Subscription (editable by owner) ── */}
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
                        <div className="flex items-center gap-2">
                          <Utensils className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold">Meal Plan &amp; Subscription</span>
                        </div>
                        {!isEditingMessPeriod ? (
                          <button
                            onClick={() => {
                              setIsEditingMessPeriod(true)
                              setMessPeriodSaveError(null)
                              setMessPeriodEditForm({
                                meal_plan: (messPeriod?.meal_plan ?? selectedStudent.meal_plan ?? 'DL') as 'L' | 'D' | 'DL',
                                start_date: messPeriod?.start_date
                                  ? messPeriod.start_date.split('T')[0]
                                  : '',
                              })
                            }}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setIsEditingMessPeriod(false); setMessPeriodSaveError(null) }}
                              className="text-xs px-2 py-1 border border-input rounded hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={messPeriodSaving || !messPeriodEditForm.start_date}
                              onClick={async () => {
                                if (!selectedStudent) return
                                setMessPeriodSaving(true)
                                setMessPeriodSaveError(null)
                                try {
                                  // Get previous mess period's extra meals count (debt)
                                  const { data: prevPeriod } = await supabase
                                    .from('mess_periods')
                                    .select('extra_meals_count')
                                    .eq('user_id', selectedStudent.id)
                                    .eq('is_active', true)
                                    .maybeSingle()
                                  
                                  const extraMealsDebt = prevPeriod?.extra_meals_count || 0
                                  const baseDays = 30
                                  const purchasedDays = baseDays
                                  const deductedDays = extraMealsDebt
                                  const creditedDays = Math.max(0, purchasedDays - deductedDays)
                                  
                                  // Show transparency message if there's debt
                                  if (extraMealsDebt > 0) {
                                    const confirmMsg = `Recharge Summary:\n\nPurchased: ${purchasedDays} days\nDeducted: ${deductedDays} days (previous extra meals debt)\nCredited: ${creditedDays} days\n\nDo you want to proceed?`
                                    if (!confirm(confirmMsg)) {
                                      setMessPeriodSaving(false)
                                      return
                                    }
                                  }
                                  
                                  // Fetch approved leave days for this student to extend the end date
                                  const startDateStr = messPeriodEditForm.start_date
                                  const baseEnd = new Date(startDateStr)
                                  // Use credited days instead of fixed 30
                                  baseEnd.setDate(baseEnd.getDate() + creditedDays - 1)
                                  const baseEndStr = baseEnd.toISOString().split('T')[0]

                                  // Get approved leaves from DB
                                  const { data: leavesData } = await supabase
                                    .from('leaves')
                                    .select('start_date, end_date')
                                    .eq('user_id', selectedStudent.id)
                                    .eq('is_approved', true)
                                    .gte('end_date', startDateStr)
                                    .lte('start_date', baseEndStr)

                                  // Sum leave days that overlap with the base credited-day window
                                  const periodStart = new Date(startDateStr)
                                  const periodEnd = new Date(baseEndStr)
                                  const totalLeaveDays = (leavesData ?? []).reduce((sum, leave) => {
                                    const ls = new Date(leave.start_date)
                                    const le = new Date(leave.end_date)
                                    const os = ls > periodStart ? ls : periodStart
                                    const oe = le < periodEnd ? le : periodEnd
                                    if (os <= oe) {
                                      return sum + Math.round((oe.getTime() - os.getTime()) / 86400000) + 1
                                    }
                                    return sum
                                  }, 0)

                                  // end_date = start + (credited days - 1) + leave days
                                  const computedEnd = new Date(startDateStr)
                                  computedEnd.setDate(computedEnd.getDate() + creditedDays - 1 + totalLeaveDays)
                                  const computedEndStr = computedEnd.toISOString().split('T')[0]

                                  // Always deactivate ALL existing active periods first
                                  // (prevents duplicate is_active=true rows which cause wrong meal plan display)
                                  const { error: deactivateError } = await supabase
                                    .from('mess_periods')
                                    .update({ is_active: false })
                                    .eq('user_id', selectedStudent.id)
                                    .eq('is_active', true)
                                  if (deactivateError) throw deactivateError

                                  // Insert a fresh active period with extra_meals_count reset to 0
                                  const { error } = await supabase
                                    .from('mess_periods')
                                    .insert({
                                      user_id: selectedStudent.id,
                                      meal_plan: messPeriodEditForm.meal_plan,
                                      start_date: startDateStr,
                                      end_date: computedEndStr,
                                      original_end_date: baseEndStr,
                                      is_active: true,
                                      extra_meals_count: 0, // Reset debt for new period
                                    })
                                  if (error) throw error
                                  // Refetch the active period to update the modal
                                  const { data: updated } = await supabase
                                    .from('mess_periods')
                                    .select('start_date, end_date, original_end_date, meal_plan')
                                    .eq('user_id', selectedStudent.id)
                                    .eq('is_active', true)
                                    .maybeSingle()
                                  setMessPeriod(updated ?? null)
                                  // Also update selected student's meal_plan locally
                                  setSelectedStudent({ ...selectedStudent, meal_plan: messPeriodEditForm.meal_plan })
                                  // Refresh the students table too
                                  await fetchStudents()
                                  setIsEditingMessPeriod(false)
                                } catch (err) {
                                  setMessPeriodSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
                                } finally {
                                  setMessPeriodSaving(false)
                                }
                              }}
                              className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              {messPeriodSaving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-3 space-y-3">
                        {/* Meal Plan selector */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Meal Plan</p>
                          {isEditingMessPeriod ? (
                            <div className="flex gap-2" role="group" aria-label="Meal plan">
                              {([
                                { value: 'L',  label: 'Lunch Only',   color: 'blue'   },
                                { value: 'D',  label: 'Dinner Only',  color: 'purple' },
                                { value: 'DL', label: 'Both Meals',   color: 'green'  },
                              ] as const).map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setMessPeriodEditForm(f => ({ ...f, meal_plan: opt.value }))}
                                  className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-colors ${
                                    messPeriodEditForm.meal_plan === opt.value
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'border-input bg-background hover:bg-accent'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <MealPlanBadge plan={(messPeriod?.meal_plan ?? selectedStudent.meal_plan) as 'L' | 'D' | 'DL' | undefined} />
                          )}
                        </div>

                        {/* Subscription Start */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Subscription Start</p>
                          {isEditingMessPeriod ? (
                            <input
                              type="date"
                              value={messPeriodEditForm.start_date}
                              onChange={e => setMessPeriodEditForm(f => ({ ...f, start_date: e.target.value }))}
                              className="w-full px-3 py-1.5 text-sm border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          ) : (
                            <p className="font-semibold text-sm">
                              {messPeriod?.start_date
                                ? new Date(messPeriod.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Not set'}
                            </p>
                          )}
                        </div>

                        {/* Subscription End — auto-calculated (not editable) */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Subscription End
                            <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">auto-calculated</span>
                          </p>
                          {isEditingMessPeriod && messPeriodEditForm.start_date ? (
                            <p className="font-semibold text-sm text-muted-foreground italic">
                              {/* Show the projected end: start + 30 + leave days (leave days fetched on save) */}
                              {(() => {
                                const d = new Date(messPeriodEditForm.start_date)
                                d.setDate(d.getDate() + 29)
                                return `~${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} + leave days`
                              })()}
                            </p>
                          ) : (
                            <>
                              <p className="font-semibold text-sm">
                                {messPeriod?.end_date
                                  ? new Date(messPeriod.end_date.split('T')[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : 'Not set'}
                              </p>
                              {messPeriod?.end_date && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(messPeriod.end_date).toISOString().split('T')[0] < new Date().toISOString().split('T')[0] ? '⚠️ Subscription expired' : '✓ Active subscription'}
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        {/* Save error */}
                        {messPeriodSaveError && (
                          <p className="text-xs text-red-600 dark:text-red-400">{messPeriodSaveError}</p>
                        )}
                      </div>
                    </div>

                    {/* Mess Cycle Tracker */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">30-Day Mess Cycle</p>
                      <MessCycleTracker startDate={messPeriod?.start_date} />
                    </div>

                    {/* Joined Date (Non-editable) */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Joined Date</p>
                      <p className="font-semibold text-sm">
                        {new Date(selectedStudent.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">

                  {/* Fee Payment Section */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent/50 to-transparent border-b border-border">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <h4 className="text-lg font-semibold">Fee Payment</h4>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Meal Plan + payable summary */}
                      {(() => {
                        const mealPlan = (messPeriod?.meal_plan ?? selectedStudent.meal_plan) as 'L' | 'D' | 'DL' | undefined
                        // Only compute totalPayable when we have a confirmed meal plan
                        const totalPayable = mealPlan ? getPayableAmount(mealPlan, pricing) : null
                        const totalPaid = fee.payments.reduce((s, p) => s + Number(p.amount), 0)
                        const isFullyPaid = totalPayable != null && totalPaid >= totalPayable
                        const paidInstallments = new Set(fee.payments.map(p => p.installment_number))
                        const nextInstallment: 1 | 2 = paidInstallments.has(1) ? 2 : 1
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Utensils className="w-4 h-4" />
                                Meal Plan
                              </div>
                              <MealPlanBadge plan={mealPlan} />
                            </div>

                            {/* Payment status */}
                            <FeePaymentStatus
                              payments={fee.payments}
                              isLoading={fee.isLoading}
                              error={fee.error}
                              totalPayable={totalPayable}
                            />

                            {/* Add payment form */}
                            {fee.showForm && (
                              <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30 animate-in slide-in-from-top-2 duration-200">
                                {/* Info message for 2nd installment */}
                                {nextInstallment === 2 && totalPayable && (
                                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                                    <p className="text-xs text-blue-700 dark:text-blue-400">
                                      ℹ️ 2nd installment must complete the payment. Required: ₹{Math.max(0, totalPayable - totalPaid).toLocaleString('en-IN')}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <label htmlFor="amount-input" className="text-xs font-medium text-muted-foreground">
                                    Amount (₹){totalPayable != null ? ` — ${nextInstallment === 2 ? 'Required' : 'Remaining'}: ₹${Math.max(0, totalPayable - totalPaid).toLocaleString('en-IN')}` : ''}
                                  </label>
                                  <input
                                    id="amount-input"
                                    type="number"
                                    min={MIN_AMOUNT}
                                    max={totalPayable != null ? Math.max(0, totalPayable - totalPaid) : MAX_AMOUNT}
                                    value={fee.formAmount}
                                    onChange={e => dispatchFee({ type: 'SET_AMOUNT', value: e.target.value })}
                                    placeholder={totalPayable != null ? `${nextInstallment === 2 ? 'Required' : 'Max'}: ₹${Math.max(0, totalPayable - totalPaid).toLocaleString('en-IN')}` : 'Enter amount'}
                                    readOnly={nextInstallment === 2}
                                    className={`w-full mt-1 px-2 py-1.5 text-sm border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary ${nextInstallment === 2 ? 'cursor-not-allowed opacity-75' : ''}`}
                                  />
                                  {nextInstallment === 2 && (
                                    <p className="text-xs text-muted-foreground mt-1">Amount is fixed for 2nd installment</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-muted-foreground">Mode</label>
                                  <div className="flex gap-2 mt-1" role="group" aria-label="Payment mode">
                                    {(['CASH', 'UPI'] as const).map(mode => (
                                      <button
                                        key={mode}
                                        type="button"
                                        aria-pressed={fee.formMode === mode}
                                        onClick={() => dispatchFee({ type: 'SET_MODE', value: mode })}
                                        className={`flex-1 py-1.5 text-sm rounded border transition-colors ${
                                          fee.formMode === mode
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'border-input bg-background hover:bg-accent'
                                        }`}
                                      >
                                        {mode}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label htmlFor="note-input" className="text-xs font-medium text-muted-foreground">
                                    Note (optional) — {fee.formNote.length}/{MAX_NOTE_LENGTH}
                                  </label>
                                  <input
                                    id="note-input"
                                    type="text"
                                    value={fee.formNote}
                                    onChange={e => dispatchFee({ type: 'SET_NOTE', value: e.target.value })}
                                    placeholder="e.g. partial payment"
                                    maxLength={MAX_NOTE_LENGTH}
                                    className="w-full mt-1 px-2 py-1.5 text-sm border border-input rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                                {fee.saveError && (
                                  <p className="text-xs text-red-600 dark:text-red-400">{fee.saveError}</p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => dispatchFee({ type: 'CLOSE_FORM' })}
                                    className="flex-1 py-1.5 text-sm border border-input rounded hover:bg-accent transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAddPayment}
                                    disabled={fee.isSaving || !fee.formAmount}
                                    className="flex-1 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                  >
                                    {fee.isSaving ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {fee.saveSuccess && (
                              <p className="text-xs text-green-600 dark:text-green-400 text-center">✓ Payment recorded successfully!</p>
                            )}

                            {/* Add button — hidden when fully paid */}
                            {!isFullyPaid && !fee.showForm && (
                              <button
                                onClick={() => {
                                  dispatchFee({ type: 'TOGGLE_FORM' })
                                  // Pre-fill amount for 2nd installment
                                  if (nextInstallment === 2 && totalPayable) {
                                    const remaining = Math.max(0, totalPayable - totalPaid)
                                    dispatchFee({ type: 'SET_AMOUNT', value: remaining.toString() })
                                  }
                                }}
                                aria-label="Add payment"
                                className="w-full flex items-center justify-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                {paidInstallments.size === 0 ? 'Add Payment' : 'Add 2nd Installment'}
                              </button>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Photo Permission */}
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    <h4 className="text-lg font-semibold">Photo Permission</h4>
                  </div>

                  {permissionError && (
                    <ErrorMessage 
                      error={permissionError} 
                      onDismiss={clearPermissionMessages}
                      onRetry={handleSavePermissions}
                    />
                  )}
                  
                  {permissionSuccess && (
                    <SuccessMessage 
                      message="Photo permission updated successfully!" 
                      onDismiss={clearPermissionMessages}
                    />
                  )}
                  
                  {editError && (
                    <ErrorMessage 
                      error={editError} 
                      onDismiss={clearEditMessages}
                    />
                  )}
                  
                  {editSuccess && (
                    <SuccessMessage 
                      message="Student information updated successfully!" 
                      onDismiss={clearEditMessages}
                    />
                  )}

                  {/* Photo Update Permission */}
                  <div className="bg-muted/30 rounded-lg p-4 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Allow Photo Update</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissionForm.photo_update_allowed}
                          onChange={(e) => setPermissionForm({ ...permissionForm, photo_update_allowed: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    {permissionForm.photo_update_allowed && (
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-2">
                            Duration
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="1"
                              max={permissionForm.time_unit === 'minutes' ? 10080 : 168}
                              value={permissionForm.time_value}
                              onChange={(e) => setPermissionForm({ ...permissionForm, time_value: e.target.value })}
                              placeholder={permissionForm.time_unit === 'minutes' ? '1-10080' : '1-168'}
                              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                            <select
                              value={permissionForm.time_unit}
                              onChange={(e) => setPermissionForm({ ...permissionForm, time_unit: e.target.value as 'minutes' | 'hours' })}
                              className="px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                            </select>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {permissionForm.time_unit === 'minutes' 
                              ? 'Enter minutes (1-10080). Max: 1 week' 
                              : 'Enter hours (1-168). Max: 1 week'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Current Permission Status */}
                  {selectedStudent?.photo_update_allowed && selectedStudent?.permission_expires_at && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        <strong>Active:</strong> Photo permission expires on{' '}
                        {new Date(selectedStudent.permission_expires_at).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}

                  {/* Info Note */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      <strong>Note:</strong> Students cannot edit their profile. They must request changes from you. Only photo updates can be temporarily enabled.
                    </p>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSavePermissions}
                    disabled={permissionLoading}
                    className="w-full"
                  >
                    {permissionLoading ? 'Saving...' : 'Save Photo Permission'}
                  </Button>

                  {/* Report Generation Section */}
                  <div className="mt-6 border-t border-border pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-primary" />
                      <h4 className="text-lg font-semibold">Generate Student Report</h4>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4 border border-border space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Report Period Selection */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Report Period</label>
                          <select
                            value={reportPeriod}
                            onChange={(e) => setReportPeriod(e.target.value as typeof reportPeriod)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="this_month">Current Mess Month</option>
                            <option value="last_month">Previous Mess Month</option>
                            <option value="last_3_months">Last 3 Mess Months</option>
                            <option value="all_time">All Time</option>
                          </select>
                        </div>

                        {/* Export Format Selection */}
                        <div>
                          <label className="block text-sm font-medium mb-2">Export Format</label>
                          <select
                            value={exportFormat}
                            onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          >
                            <option value="pdf">PDF Report</option>
                            <option value="excel">Excel Spreadsheet</option>
                          </select>
                        </div>

                        {/* Include Detailed Table Checkbox */}
                        <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border">
                          <input
                            type="checkbox"
                            id="includeDetailedTable"
                            checked={includeDetailedTable}
                            onChange={(e) => setIncludeDetailedTable(e.target.checked)}
                            className="mt-1 w-4 h-4 text-primary bg-background border-gray-300 rounded focus:ring-primary focus:ring-2"
                          />
                          <label htmlFor="includeDetailedTable" className="flex-1 cursor-pointer">
                            <span className="text-sm font-medium block">Include Detailed Meal Record Table</span>
                            <span className="text-xs text-muted-foreground block mt-1">
                              Add a day-by-day breakdown of all meal attendance records in the report
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Download Button */}
                      <Button
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        className="w-full"
                      >
                        {isGeneratingReport ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Generating {exportFormat === 'pdf' ? 'PDF' : 'Excel'}...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download {exportFormat === 'pdf' ? 'PDF' : 'Excel'} Report
                          </>
                        )}
                      </Button>

                      {reportError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <p className="text-sm text-red-700 dark:text-red-400">{reportError}</p>
                        </div>
                      )}

                      {reportSuccess && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <p className="text-sm text-green-700 dark:text-green-400">Report generated successfully!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/30 flex-shrink-0">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowDetailModal(false)
                    setSelectedStudent(null)
                  }}
                >
                  Close
                </Button>
                <Button 
                  variant="outline" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                  onClick={() => {
                    if (selectedStudent && confirm(`Are you sure you want to delete ${selectedStudent.full_name}? This action cannot be undone.`)) {
                      // TODO: Implement delete functionality
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Student
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
