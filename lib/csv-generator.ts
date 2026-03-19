// CSV Generator for Attendance Data Export

interface AttendanceRecord {
  date: string
  meal_type: string
  status: string
  created_at: string
}

interface CSVData {
  student: {
    full_name: string
    unique_short_id: number
    meal_plan?: string
  }
  logs: AttendanceRecord[]
  dateRange: {
    start: string
    end: string
  }
  periodType?: string
}

export function generateAttendanceCSV(data: CSVData): void {
  // Prepare CSV header
  const headers = [
    'Date',
    'Day',
    'Meal Type',
    'Status',
    'Recorded At'
  ]

  // Prepare CSV rows
  const rows = data.logs.map(log => {
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

    return [
      formattedDate,
      dayName,
      log.meal_type.toUpperCase(),
      log.status.toUpperCase(),
      recordedAt
    ]
  })

  // Sort by date
  rows.sort((a, b) => {
    const dateA = new Date(data.logs[rows.indexOf(a)].date)
    const dateB = new Date(data.logs[rows.indexOf(b)].date)
    return dateA.getTime() - dateB.getTime()
  })

  // Create CSV content
  let csvContent = ''
  
  // Add metadata header
  csvContent += `Student Name:,${data.student.full_name}\n`
  csvContent += `Student ID:,${data.student.unique_short_id}\n`
  csvContent += `Meal Plan:,${data.student.meal_plan || 'Not Set'}\n`
  csvContent += `Report Period:,${data.periodType || 'Custom Range'}\n`
  csvContent += `Date Range:,${new Date(data.dateRange.start).toLocaleDateString('en-IN')} to ${new Date(data.dateRange.end).toLocaleDateString('en-IN')}\n`
  csvContent += `Total Records:,${data.logs.length}\n`
  csvContent += `Generated On:,${new Date().toLocaleString('en-IN')}\n`
  csvContent += '\n' // Empty line separator

  // Add column headers
  csvContent += headers.join(',') + '\n'

  // Add data rows
  rows.forEach(row => {
    csvContent += row.map(cell => {
      // Escape commas and quotes in cell content
      const cellStr = String(cell)
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`
      }
      return cellStr
    }).join(',') + '\n'
  })

  // Add summary footer
  csvContent += '\n' // Empty line
  csvContent += 'Summary\n'
  
  const lunchCount = data.logs.filter(log => log.meal_type.toUpperCase() === 'LUNCH').length
  const dinnerCount = data.logs.filter(log => log.meal_type.toUpperCase() === 'DINNER').length
  const consumedCount = data.logs.filter(log => {
    const status = log.status.toUpperCase()
    return status === 'CONSUMED' || status === 'VERIFIED' || status === 'TAKEN' || status === 'PRESENT'
  }).length

  csvContent += `Total Lunch Meals:,${lunchCount}\n`
  csvContent += `Total Dinner Meals:,${dinnerCount}\n`
  csvContent += `Total Consumed Meals:,${consumedCount}\n`

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    const fileName = `Attendance_${data.student.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
