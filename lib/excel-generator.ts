// Excel Generator for Attendance Data Export with Professional Formatting
import * as XLSX from 'xlsx'
import type { CellObject, WorkSheet } from 'xlsx'

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
    original_end_date: string
  } | null
  dateRange: {
    start: string
    end: string
  }
  periodType?: string
  includeDetailedTable?: boolean
}

export function generateAttendanceExcel(data: ExcelData): void {
  // Create a new workbook
  const wb = XLSX.utils.book_new()
  
  // Prepare data arrays
  const sheetData: unknown[][] = []
  
  // Track row indices for styling
  let currentRow = 0
  const headerRows: number[] = []
  const sectionTitleRows: number[] = []
  const tableHeaderRows: number[] = []
  const leaveRows: number[] = []
  
  // ===== SECTION 1: STUDENT INFORMATION =====
  sectionTitleRows.push(currentRow)
  sheetData.push(['STUDENT INFORMATION'])
  currentRow++
  
  sheetData.push([])
  currentRow++
  
  sheetData.push(['Student Name:', data.student.full_name])
  currentRow++
  sheetData.push(['Student ID:', data.student.unique_short_id])
  currentRow++
  sheetData.push(['Meal Plan:', data.student.meal_plan || 'Not Set'])
  currentRow++
  sheetData.push(['Report Period:', data.periodType || 'Custom Range'])
  currentRow++
  sheetData.push(['Date Range:', `${new Date(data.dateRange.start).toLocaleDateString('en-IN')} to ${new Date(data.dateRange.end).toLocaleDateString('en-IN')}`])
  currentRow++
  sheetData.push(['Generated On:', new Date().toLocaleString('en-IN')])
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
    return status === 'CONSUMED' || status === 'VERIFIED' || status === 'TAKEN' || status === 'PRESENT'
  }).length
  
  // Calculate approved leave days with integrity check (exclude days with consumed meals)
  let approvedLeaveDays = 0
  const actualLeaveDates: { start: string; end: string; days: number }[] = []
  
  // Create a set of dates where meals were consumed
  const consumedDates = new Set<string>()
  data.logs.forEach(log => {
    const status = log.status.toUpperCase()
    if (status === 'CONSUMED' || status === 'VERIFIED' || status === 'TAKEN' || status === 'PRESENT') {
      consumedDates.add(new Date(log.date).toISOString().split('T')[0])
    }
  })
  
  if (data.leaves && data.leaves.length > 0) {
    const startDate = new Date(data.dateRange.start)
    const endDate = new Date(data.dateRange.end)
    
    data.leaves.forEach(leave => {
      if (leave.is_approved) {
        const leaveStart = new Date(leave.start_date)
        const leaveEnd = new Date(leave.end_date)
        
        // Calculate overlap with report period
        const overlapStart = leaveStart > startDate ? leaveStart : startDate
        const overlapEnd = leaveEnd < endDate ? leaveEnd : endDate
        
        if (overlapStart <= overlapEnd) {
          // Find continuous leave periods (excluding consumed dates)
          let periodStart: Date | null = null
          let periodDays = 0
          const currentDate = new Date(overlapStart)
          
          while (currentDate <= overlapEnd) {
            const dateKey = currentDate.toISOString().split('T')[0]
            
            if (!consumedDates.has(dateKey)) {
              // This is a valid leave day
              if (!periodStart) {
                periodStart = new Date(currentDate)
              }
              periodDays++
              approvedLeaveDays++
            } else {
              // Meal was consumed, break the leave period
              if (periodStart && periodDays > 0) {
                const periodEnd = new Date(currentDate)
                periodEnd.setDate(periodEnd.getDate() - 1)
                actualLeaveDates.push({
                  start: periodStart.toISOString().split('T')[0],
                  end: periodEnd.toISOString().split('T')[0],
                  days: periodDays
                })
              }
              periodStart = null
              periodDays = 0
            }
            
            currentDate.setDate(currentDate.getDate() + 1)
          }
          
          // Add the last period if exists
          if (periodStart && periodDays > 0) {
            const periodEnd = new Date(currentDate)
            periodEnd.setDate(periodEnd.getDate() - 1)
            actualLeaveDates.push({
              start: periodStart.toISOString().split('T')[0],
              end: periodEnd.toISOString().split('T')[0],
              days: periodDays
            })
          }
        }
      }
    })
  }
  
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
    
    // Create a set of leave dates for marking (only dates without consumed meals)
    const leaveDates = new Set<string>()
    if (data.leaves && data.leaves.length > 0) {
      data.leaves.forEach(leave => {
        if (leave.is_approved) {
          const leaveStart = new Date(leave.start_date)
          const leaveEnd = new Date(leave.end_date)
          const currentDate = new Date(leaveStart)
          
          while (currentDate <= leaveEnd) {
            const dateKey = currentDate.toISOString().split('T')[0]
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
      const startDate = new Date(leave.start).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      const endDate = new Date(leave.end).toLocaleDateString('en-IN', {
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
    
    const messStartDate = new Date(data.messPeriod.start_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    const originalEndDate = new Date(data.messPeriod.original_end_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    const updatedEndDate = new Date(data.messPeriod.end_date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    
    // Calculate total leave days in mess period (with integrity check)
    let totalMessPeriodLeaveDays = 0
    if (data.leaves && data.leaves.length > 0) {
      const messStart = new Date(data.messPeriod.start_date)
      const messEnd = new Date(data.messPeriod.end_date)
      
      data.leaves.forEach(leave => {
        if (leave.is_approved) {
          const leaveStart = new Date(leave.start_date)
          const leaveEnd = new Date(leave.end_date)
          
          // Calculate overlap with mess period
          const overlapStart = leaveStart > messStart ? leaveStart : messStart
          const overlapEnd = leaveEnd < messEnd ? leaveEnd : messEnd
          
          if (overlapStart <= overlapEnd) {
            const currentDate = new Date(overlapStart)
            
            while (currentDate <= overlapEnd) {
              const dateKey = currentDate.toISOString().split('T')[0]
              // Only count if no meal was consumed
              if (!consumedDates.has(dateKey)) {
                totalMessPeriodLeaveDays++
              }
              currentDate.setDate(currentDate.getDate() + 1)
            }
          }
        }
      })
    }
    
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
  
  // Apply professional styling
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
      if (!ws[cellAddress]) continue
      
      const cell = ws[cellAddress] as CellObject
      
      // Initialize cell style
      if (!cell.s) cell.s = {}
      
      // Section title rows - Dark blue background, white bold text
      if (sectionTitleRows.includes(R)) {
        cell.s = {
          fill: { fgColor: { rgb: "1F4788" } },
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
          alignment: { horizontal: "left", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        }
      }
      // Table header rows - Light blue background, bold text
      else if (tableHeaderRows.includes(R)) {
        cell.s = {
          fill: { fgColor: { rgb: "4472C4" } },
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        }
      }
      // Leave rows - Light yellow background
      else if (leaveRows.includes(R)) {
        cell.s = {
          fill: { fgColor: { rgb: "FFF2CC" } },
          font: { sz: 10 },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "D3D3D3" } },
            bottom: { style: "thin", color: { rgb: "D3D3D3" } },
            left: { style: "thin", color: { rgb: "D3D3D3" } },
            right: { style: "thin", color: { rgb: "D3D3D3" } }
          }
        }
      }
      // Data rows with alternating colors
      else if (cell.v !== undefined && cell.v !== '') {
        const isEvenRow = R % 2 === 0
        cell.s = {
          fill: { fgColor: { rgb: isEvenRow ? "F2F2F2" : "FFFFFF" } },
          font: { sz: 10 },
          alignment: { horizontal: C === 0 ? "center" : "left", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "D3D3D3" } },
            bottom: { style: "thin", color: { rgb: "D3D3D3" } },
            left: { style: "thin", color: { rgb: "D3D3D3" } },
            right: { style: "thin", color: { rgb: "D3D3D3" } }
          }
        }
        
        // Bold first column (labels)
        if (C === 0 && !tableHeaderRows.includes(R) && !sectionTitleRows.includes(R)) {
          cell.s.font = { ...cell.s.font, bold: true }
        }
      }
    }
  }
  
  // Set column widths
  ws['!cols'] = [
    { wch: 10 },  // Sr.No.
    { wch: 18 },  // Date/Label
    { wch: 15 },  // Day/Value
    { wch: 15 },  // Meal Type
    { wch: 15 },  // Status
    { wch: 25 }   // Recorded At
  ]
  
  // Apply styles (note: basic XLSX doesn't support colors in free version, but structure is professional)
  // For colored cells, you would need xlsx-style or ExcelJS library
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report')
  
  // Generate file name
  const fileName = `Attendance_${data.student.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  
  // Write file
  XLSX.writeFile(wb, fileName)
}
