// Excel Generator for Attendance Data Export with Professional Formatting
import * as XLSX from 'xlsx'
import type { WorkSheet } from 'xlsx'
import { CONSUMED_STATUSES } from '@/lib/report-constants'
import { toIST, getISTDateString } from '@/lib/date-utils'
import { calculateLeaveDaysWithIntegrity } from '@/lib/leave-calculator'

interface AttendanceRecord {
  date: string
  meal_type: string
  status: string
  created_at: string
}

interface LeaveRecord {
  start_date: string
  end_date: string
  is_approved: boolean
}

interface ExcelData {
  student: {
    full_name: string
    unique_short_id: number
    meal_plan?: string
  }
  logs: AttendanceRecord[]
  leaves?: LeaveRecord[]
  messPeriod?: {
    start_date: string
    end_date: string
    original_end_date: string | null
  } | null
  dateRange: {
    start: string
    end: string
  }
  periodType?: string
  includeDetailedTable?: boolean
}

/**
 * Sanitize a string so it can be safely used as part of a filename.
 * - Replaces whitespace with underscores
 * - Replaces filesystem-reserved / unsafe characters with underscores
 * - Collapses multiple underscores and trims them from the ends
 */
function sanitizeFileNameComponent(input: string): string {
  const withUnderscores = input.replace(/\s+/g, '_')
  const safeCharsOnly = withUnderscores.replace(/[^a-zA-Z0-9_-]/g, '_')
  const collapsed = safeCharsOnly.replace(/_+/g, '_').replace(/^_+|_+$/g, '')
  return collapsed || 'Student'
}

/**
 * Sanitize cell values to prevent spreadsheet formula injection.
 * If a value begins with =, +, -, or @, prefix it with a single quote.
 */
function sanitizeCellValue(value: unknown): unknown {
  if (typeof value !== 'string' || value.length === 0) {
    return value
  }
  const firstChar = value.charAt(0)
  if (firstChar === '=' || firstChar === '+' || firstChar === '-' || firstChar === '@') {
    return `'${value}`
  }
  return value
}

export function generateAttendanceExcel(data: ExcelData): void {
  // Create a new workbook
  const wb = XLSX.utils.book_new()
  
  // Prepare data arrays
  const sheetData: unknown[][] = []
  
  // Track row indices for styling
  let currentRow = 0
  const sectionTitleRows: number[] = []
  const tableHeaderRows: number[] = []
  const leaveRows: number[] = []
  
  // ===== SECTION 1: STUDENT INFORMATION =====
  sectionTitleRows.push(currentRow)
  sheetData.push(['STUDENT INFORMATION'])
  currentRow++
  
  sheetData.push([])
  currentRow++
  
  sheetData.push(['Student Name:', sanitizeCellValue(data.student.full_name)])
  currentRow++
  sheetData.push(['Student ID:', data.student.unique_short_id])
  currentRow++
  sheetData.push(['Meal Plan:', sanitizeCellValue(data.student.meal_plan || 'Not Set')])
  currentRow++
  sheetData.push(['Report Period:', sanitizeCellValue(data.periodType || 'Custom Range')])
  currentRow++
  sheetData.push([
    'Date Range:',
    sanitizeCellValue(
      `${new Date(data.dateRange.start).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} to ${new Date(data.dateRange.end).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    ),
  ])
  currentRow++
  sheetData.push(['Generated On:', sanitizeCellValue(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))])
  currentRow++
  
  sheetData.push([])
  currentRow++
  sheetData.push([])
  currentRow++
  
  // ===== SECTION 2: STATISTICS SUMMARY =====
  const lunchCount = data.logs.filter(log => log.meal_type.toUpperCase() === 'LUNCH').length
  const dinnerCount = data.logs.filter(log => log.meal_type.toUpperCase() === 'DINNER').length
  const consumedCount = data.logs.filter(log => {
    const status = log.status.toUpperCase()
    return CONSUMED_STATUSES.includes(status as typeof CONSUMED_STATUSES[number])
  }).length
  
  // Calculate approved leave days with integrity check (exclude days with consumed meals)
  // Build consumed dates set
  const consumedDates = new Set<string>()
  data.logs.forEach(log => {
    const status = log.status.toUpperCase()
    if (CONSUMED_STATUSES.includes(status as typeof CONSUMED_STATUSES[number])) {
      consumedDates.add(getISTDateString(log.date))
    }
  })
  
  const { totalLeaveDays: approvedLeaveDays, leavePeriods: actualLeaveDates } = calculateLeaveDaysWithIntegrity(
    data.leaves || [],
    consumedDates,
    data.dateRange.start,
    data.dateRange.end
  )
  
  sectionTitleRows.push(currentRow)
  sheetData.push(['STATISTICS SUMMARY'])
  currentRow++
  
  sheetData.push([])
  currentRow++
  
  tableHeaderRows.push(currentRow)
  sheetData.push(['Metric', 'Count'])
  currentRow++
  
  sheetData.push(['Total Records', data.logs.length])
  currentRow++
  sheetData.push(['Lunch Meals', lunchCount])
  currentRow++
  sheetData.push(['Dinner Meals', dinnerCount])
  currentRow++
  sheetData.push(['Consumed Meals', consumedCount])
  currentRow++
  sheetData.push(['Approved Leave Days', approvedLeaveDays])
  currentRow++
  
  sheetData.push([])
  currentRow++
  sheetData.push([])
  currentRow++
  
  // ===== SECTION 3: DETAILED ATTENDANCE RECORDS (Optional) =====
  if (data.includeDetailedTable) {
    sectionTitleRows.push(currentRow)
    sheetData.push(['DETAILED ATTENDANCE RECORDS'])
    currentRow++
    
    sheetData.push([])
    currentRow++
    
    tableHeaderRows.push(currentRow)
    sheetData.push(['Sr.No.', 'Date', 'Day', 'Meal Type', 'Status', 'Recorded At'])
    currentRow++
    
    // Sort logs by date
    const sortedLogs = [...data.logs].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })
    
    // Create a set of dates where meals were consumed
    const consumedDates = new Set<string>()
    data.logs.forEach(log => {
      const status = log.status.toUpperCase()
      if (CONSUMED_STATUSES.includes(status as typeof CONSUMED_STATUSES[number])) {
        consumedDates.add(getISTDateString(log.date))
      }
    })
    
    // Create a set of leave dates for marking (only dates without consumed meals)
    const leaveDates = new Set<string>()
    if (data.leaves && data.leaves.length > 0) {
      data.leaves.forEach(leave => {
        if (leave.is_approved) {
          const leaveStart = toIST(leave.start_date)
          const leaveEnd = toIST(leave.end_date)
          const currentDate = new Date(leaveStart)
          
          while (currentDate <= leaveEnd) {
            const dateKey = getISTDateString(currentDate)
            // Only mark as leave if no meal was consumed on that date
            if (!consumedDates.has(dateKey)) {
              leaveDates.add(dateKey)
            }
            currentDate.setDate(currentDate.getDate() + 1)
          }
        }
      })
    }
    
    sortedLogs.forEach((log, index) => {
      const date = new Date(log.date)
      const dayName = date.toLocaleDateString('en-IN', { weekday: 'long' })
      const formattedDate = date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })
      const recordedAt = new Date(log.created_at).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
      
      const dateKey = date.toISOString().split('T')[0]
      const isLeaveDate = leaveDates.has(dateKey)
      const statusDisplay = isLeaveDate ? 'LEAVE' : log.status.toUpperCase()
      
      if (isLeaveDate) {
        leaveRows.push(currentRow)
      }
      
      sheetData.push([
        index + 1,
        formattedDate,
        dayName,
        log.meal_type.toUpperCase(),
        statusDisplay,
        recordedAt
      ])
      currentRow++
    })
    
    sheetData.push([])
    currentRow++
    sheetData.push([])
    currentRow++
  }
  
  // ===== SECTION 4: LEAVE RECORDS (if any) =====
  if (actualLeaveDates.length > 0) {
    sectionTitleRows.push(currentRow)
    sheetData.push(['APPROVED LEAVE RECORDS'])
    currentRow++
    
    sheetData.push([])
    currentRow++
    
    sheetData.push(['Note: Days where meals were consumed are excluded from leave records'])
    currentRow++
    
    sheetData.push([])
    currentRow++
    
    tableHeaderRows.push(currentRow)
    sheetData.push(['Sr.No.', 'Start Date', 'End Date', 'Duration (Days)'])
    currentRow++
    
    actualLeaveDates.forEach((leave, index) => {
      const startDate = new Date(leave.start_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      const endDate = new Date(leave.end_date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      
      sheetData.push([
        index + 1,
        startDate,
        endDate,
        leave.days
      ])
      currentRow++
    })
    
    sheetData.push([])
    currentRow++
    sheetData.push([])
    currentRow++
  }
  
  // ===== SECTION 5: LEAVE EXTENSION SUMMARY =====
  if (data.messPeriod) {
    sectionTitleRows.push(currentRow)
    sheetData.push(['LEAVE EXTENSION SUMMARY'])
    currentRow++
    
    sheetData.push([])
    currentRow++
    
    const messStartDate = toIST(data.messPeriod.start_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    const originalEndDate = data.messPeriod.original_end_date 
      ? toIST(data.messPeriod.original_end_date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })
      : 'N/A'
    const updatedEndDate = toIST(data.messPeriod.end_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    
    // Calculate total leave days in mess period (with integrity check)
    // Build consumed dates set
    const consumedDatesForMessPeriod = new Set<string>()
    data.logs.forEach(log => {
      const status = log.status.toUpperCase()
      if (CONSUMED_STATUSES.includes(status as typeof CONSUMED_STATUSES[number])) {
        consumedDatesForMessPeriod.add(getISTDateString(log.date))
      }
    })
    
    const { totalLeaveDays: totalMessPeriodLeaveDays } = calculateLeaveDaysWithIntegrity(
      data.leaves || [],
      consumedDatesForMessPeriod,
      data.messPeriod.start_date,
      data.messPeriod.end_date
    )
    
    sheetData.push(['Approved Leave Days:', `${totalMessPeriodLeaveDays} days`])
    currentRow++
    sheetData.push(['Mess Start Date:', messStartDate])
    currentRow++
    sheetData.push(['Original Mess End Date:', originalEndDate])
    currentRow++
    sheetData.push(['Updated Mess End Date:', updatedEndDate])
    currentRow++
    
    sheetData.push([])
    currentRow++
    
    sheetData.push(['Note: Approved leave days extend the mess validity period'])
    currentRow++
  }
  
  // Create worksheet from data
  const ws: WorkSheet = XLSX.utils.aoa_to_sheet(sheetData)
  
  // Set column widths
  ws['!cols'] = [
    { wch: 10 },  // Sr.No.
    { wch: 18 },  // Date/Label
    { wch: 15 },  // Day/Value
    { wch: 15 },  // Meal Type
    { wch: 15 },  // Status
    { wch: 25 }   // Recorded At
  ]
  
  // Note: Per-cell styling is intentionally omitted because the SheetJS CE `xlsx` package
  // does not reliably persist styles in browser builds. For rich styling, consider
  // switching to a library like ExcelJS or a style-enabled SheetJS fork.
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report')
  
  // Generate file name with sanitized student name
  const safeStudentName = sanitizeFileNameComponent(data.student.full_name)
  const datePart = new Date().toISOString().split('T')[0]
  const fileName = `Attendance_${safeStudentName}_${datePart}.xlsx`
  
  // Write file
  XLSX.writeFile(wb, fileName)
}
