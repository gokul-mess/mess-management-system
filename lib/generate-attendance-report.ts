import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportData {
  student: {
    id: string
    full_name: string
    unique_short_id: number
    photo_url?: string | null
    meal_plan?: string
    subscription_start_date?: string
    subscription_end_date?: string
  }
  logs: Array<{
    log_id: string
    date: string
    meal_type: string
    status: string
    created_at: string
  }>
  dateRange: {
    start: string
    end: string
  }
}

// Theme colors - properly typed as tuples for jsPDF
const COLORS = {
  primary: [46, 125, 50] as [number, number, number],
  primaryLight: [76, 175, 80] as [number, number, number],
  secondary: [249, 168, 37] as [number, number, number],
  background: [248, 249, 250] as [number, number, number],
  success: [76, 175, 80] as [number, number, number],
  error: [244, 67, 54] as [number, number, number],
  warning: [255, 152, 0] as [number, number, number],
  info: [33, 150, 243] as [number, number, number],
  text: [33, 33, 33] as [number, number, number],
  textLight: [117, 117, 117] as [number, number, number],
  border: [224, 224, 224] as [number, number, number],
  white: [255, 255, 255] as [number, number, number]
}

// Helper function to draw a pie chart
function drawPieChart(
  doc: jsPDF,
  x: number,
  y: number,
  radius: number,
  data: Array<{ label: string; value: number; color: number[] }>
) {
  let currentAngle = -Math.PI / 2
  const total = data.reduce((sum, item) => sum + item.value, 0)

  data.forEach((item) => {
    if (item.value > 0) {
      const sliceAngle = (item.value / total) * 2 * Math.PI
      
      // Draw slice
      doc.setFillColor(item.color[0], item.color[1], item.color[2])
      doc.circle(x, y, radius, 'F')
      
      // Create slice path
      // const startX = x + radius * Math.cos(currentAngle)
      // const startY = y + radius * Math.sin(currentAngle)
      const endAngle = currentAngle + sliceAngle
      // const endX = x + radius * Math.cos(endAngle)
      // const endY = y + radius * Math.sin(endAngle)
      
      // Draw the slice using lines and arc approximation
      doc.setFillColor(item.color[0], item.color[1], item.color[2])
      const segments = Math.max(3, Math.ceil(sliceAngle * 20))
      doc.lines(
        Array.from({ length: segments + 1 }, (_, i) => {
          const angle = currentAngle + (sliceAngle * i) / segments
          return [
            radius * Math.cos(angle),
            radius * Math.sin(angle)
          ]
        }),
        x,
        y,
        [1, 1],
        'F'
      )
      
      currentAngle = endAngle
    }
  })
  
  // Draw white center circle for donut effect
  doc.setFillColor(255, 255, 255)
  doc.circle(x, y, radius * 0.5, 'F')
}

// Helper function to draw a bar chart
function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Array<{ label: string; value: number; color: number[] }>,
  maxValue?: number
) {
  const max = maxValue || Math.max(...data.map(d => d.value))
  const barWidth = width / data.length
  const padding = barWidth * 0.2
  
  // Draw axes
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.5)
  doc.line(x, y, x, y + height) // Y-axis
  doc.line(x, y + height, x + width, y + height) // X-axis
  
  // Draw bars
  data.forEach((item, index) => {
    const barHeight = (item.value / max) * height
    const barX = x + index * barWidth + padding
    const barY = y + height - barHeight
    const actualBarWidth = barWidth - 2 * padding
    
    // Bar shadow
    doc.setFillColor(0, 0, 0, 0.1)
    doc.roundedRect(barX + 1, barY + 1, actualBarWidth, barHeight, 2, 2, 'F')
    
    // Bar
    doc.setFillColor(item.color[0], item.color[1], item.color[2])
    doc.roundedRect(barX, barY, actualBarWidth, barHeight, 2, 2, 'F')
    
    // Bar highlight
    doc.setFillColor(255, 255, 255, 0.2)
    doc.roundedRect(barX, barY, actualBarWidth, barHeight * 0.3, 2, 2, 'F')
    
    // Value on top
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
    doc.text(item.value.toString(), barX + actualBarWidth / 2, barY - 2, { align: 'center' })
    
    // Label below
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2])
    const labelLines = doc.splitTextToSize(item.label, actualBarWidth)
    doc.text(labelLines, barX + actualBarWidth / 2, y + height + 4, { align: 'center' })
  })
}

// Helper function to draw a line chart
function drawLineChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: Array<{ label: string; value: number }>,
  color: number[]
) {
  const max = Math.max(...data.map(d => d.value), 1)
  const stepX = width / (data.length - 1 || 1)
  
  // Draw axes
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.5)
  doc.line(x, y, x, y + height)
  doc.line(x, y + height, x + width, y + height)
  
  // Draw grid lines
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2], 0.3)
  for (let i = 0; i <= 4; i++) {
    const gridY = y + (height * i) / 4
    doc.line(x, gridY, x + width, gridY)
  }
  
  // Draw line
  doc.setDrawColor(color[0], color[1], color[2])
  doc.setLineWidth(2)
  for (let i = 0; i < data.length - 1; i++) {
    const x1 = x + i * stepX
    const y1 = y + height - (data[i].value / max) * height
    const x2 = x + (i + 1) * stepX
    const y2 = y + height - (data[i + 1].value / max) * height
    doc.line(x1, y1, x2, y2)
  }
  
  // Draw points
  doc.setFillColor(color[0], color[1], color[2])
  data.forEach((item, index) => {
    const pointX = x + index * stepX
    const pointY = y + height - (item.value / max) * height
    doc.circle(pointX, pointY, 2, 'F')
  })
}
export function generateDummyReportData(): ReportData {
  const today = new Date()
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  
  const logs: ReportData['logs'] = []
  const currentDate = new Date(threeMonthsAgo)
  
  // Generate 90 days of dummy data
  while (currentDate <= today) {
    if (Math.random() > 0.2) {
      if (Math.random() > 0.1) {
        logs.push({
          log_id: `dummy-${currentDate.getTime()}-lunch`,
          date: currentDate.toISOString().split('T')[0],
          meal_type: 'LUNCH',
          status: 'VERIFIED',
          created_at: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 30).toISOString()
        })
      }
      
      if (Math.random() > 0.15) {
        logs.push({
          log_id: `dummy-${currentDate.getTime()}-dinner`,
          date: currentDate.toISOString().split('T')[0],
          meal_type: 'DINNER',
          status: 'VERIFIED',
          created_at: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 19, 30).toISOString()
        })
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return {
    student: {
      id: 'dummy-student-id',
      full_name: 'Rajesh Kumar',
      unique_short_id: 1001,
      photo_url: null,
      meal_plan: 'DL',
      subscription_start_date: threeMonthsAgo.toISOString().split('T')[0],
      subscription_end_date: new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString().split('T')[0]
    },
    logs,
    dateRange: {
      start: threeMonthsAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    }
  }
}

export async function generateAttendanceReport(data: ReportData): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 0

  // Calculate statistics
  const totalMeals = data.logs.length
  const startDateObj = new Date(data.dateRange.start)
  const endDateObj = new Date(data.dateRange.end)
  const totalDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const mealsPerDay = data.student.meal_plan === 'DL' ? 2 : 1
  const expectedMeals = totalDays * mealsPerDay
  const mealsTaken = totalMeals
  const mealsSkipped = Math.max(0, expectedMeals - totalMeals)
  const approvedLeave = 0
  const attendanceRate = expectedMeals > 0 ? ((mealsTaken / expectedMeals) * 100).toFixed(1) : '0'
  
  // Count lunch and dinner
  let lunchCount = 0
  let dinnerCount = 0
  data.logs.forEach(log => {
    if (log.meal_type === 'LUNCH') lunchCount++
    if (log.meal_type === 'DINNER') dinnerCount++
  })

  // Weekly breakdown
  const weeklyData: { [key: string]: number } = {}
  data.logs.forEach(log => {
    const date = new Date(log.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1
  })

  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 30) {
      doc.addPage()
      addPageHeader()
      yPosition = 70
      return true
    }
    return false
  }

  const addPageHeader = () => {
    // Gradient header background
    for (let i = 0; i < 60; i++) {
      const alpha = 1 - (i / 60) * 0.3
      doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2], alpha)
      doc.rect(0, i, pageWidth, 1, 'F')
    }
    
    // Yellow accent stripe
    doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
    doc.rect(0, 58, pageWidth, 4, 'F')
    
    // Logo with modern design
    const logoX = 25
    const logoY = 25
    
    // Logo outer circle shadow
    doc.setFillColor(0, 0, 0, 0.15)
    doc.circle(logoX + 1, logoY + 1, 14, 'F')
    
    // Logo outer circle
    doc.setFillColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.circle(logoX, logoY, 14, 'F')
    
    // Logo inner circle
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.circle(logoX, logoY, 12, 'F')
    
    // Logo letter with shadow
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255, 0.3)
    doc.text('G', logoX + 0.5, logoY + 7.5, { align: 'center' })
    doc.setTextColor(255, 255, 255)
    doc.text('G', logoX, logoY + 7, { align: 'center' })
    
    // Title
    doc.setFontSize(32)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text('GOKUL MESS', 48, 22)
    
    // Subtitle
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Student Meal Consumption Report', 48, 32)
    
    // Decorative line
    doc.setDrawColor(255, 255, 255, 0.4)
    doc.setLineWidth(0.5)
    doc.line(48, 36, 155, 36)
    
    // Report date badge
    const badgeX = pageWidth - 55
    const badgeY = 20
    doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
    doc.roundedRect(badgeX, badgeY, 45, 16, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text('GENERATED', badgeX + 22.5, badgeY + 6, { align: 'center' })
    doc.setFontSize(9)
    const genDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    doc.text(genDate, badgeX + 22.5, badgeY + 12, { align: 'center' })
  }

  // PAGE 1: Header and Overview
  addPageHeader()
  yPosition = 75

  // STUDENT INFORMATION CARD
  doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2])
  doc.roundedRect(15, yPosition, pageWidth - 30, 45, 4, 4, 'F')
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.setLineWidth(1)
  doc.roundedRect(15, yPosition, pageWidth - 30, 45, 4, 4, 'S')
  
  // Section title
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.text('STUDENT INFORMATION', 20, yPosition + 8)
  
  // Divider
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.3)
  doc.line(20, yPosition + 11, pageWidth - 20, yPosition + 11)
  
  // Left column
  doc.setFontSize(9)
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2])
  doc.text('Student Name', 20, yPosition + 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text(data.student.full_name, 20, yPosition + 24)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2])
  doc.text('Student ID', 20, yPosition + 31)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text(`GM${data.student.unique_short_id}`, 20, yPosition + 37)
  
  // Middle column
  const startDate = new Date(data.dateRange.start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const endDate = new Date(data.dateRange.end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2])
  doc.text('Report Period', pageWidth / 2 - 20, yPosition + 18)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text(`${startDate}`, pageWidth / 2 - 20, yPosition + 24)
  doc.text('to', pageWidth / 2 - 20, yPosition + 29)
  doc.text(`${endDate}`, pageWidth / 2 - 20, yPosition + 34)
  
  // Right column - Meal Plan Badge
  const badgeX = pageWidth - 50
  const badgeY = yPosition + 18
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.roundedRect(badgeX, badgeY, 35, 20, 3, 3, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
  doc.text('MEAL PLAN', badgeX + 17.5, badgeY + 7, { align: 'center' })
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(data.student.meal_plan || 'DL', badgeX + 17.5, badgeY + 15, { align: 'center' })
  
  yPosition += 55

  // SUMMARY STATISTICS CARDS
  const cards = [
    { label: 'TOTAL MEALS', value: expectedMeals, color: COLORS.info, icon: '📊' },
    { label: 'MEALS TAKEN', value: mealsTaken, color: COLORS.success, icon: '✓' },
    { label: 'MEALS SKIPPED', value: mealsSkipped, color: COLORS.error, icon: '✗' },
    { label: 'APPROVED LEAVE', value: approvedLeave, color: COLORS.warning, icon: '📅' },
  ]

  const cardWidth = (pageWidth - 40) / 4
  const cardHeight = 38
  
  cards.forEach((card, index) => {
    const x = 15 + (index * (cardWidth + 3))
    
    // Card shadow
    doc.setFillColor(0, 0, 0, 0.08)
    doc.roundedRect(x + 2, yPosition + 2, cardWidth, cardHeight, 5, 5, 'F')
    
    // Card background with gradient effect
    doc.setFillColor(card.color[0], card.color[1], card.color[2])
    doc.roundedRect(x, yPosition, cardWidth, cardHeight, 5, 5, 'F')
    
    // Top highlight
    doc.setFillColor(255, 255, 255, 0.2)
    doc.roundedRect(x, yPosition, cardWidth, cardHeight * 0.4, 5, 5, 'F')
    
    // Icon
    doc.setFontSize(16)
    doc.text(card.icon, x + cardWidth / 2, yPosition + 12, { align: 'center' })
    
    // Value
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text(card.value.toString(), x + cardWidth / 2, yPosition + 24, { align: 'center' })
    
    // Label
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(card.label, x + cardWidth / 2, yPosition + 32, { align: 'center' })
  })

  yPosition += cardHeight + 15

  // ATTENDANCE RATE SECTION
  doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2])
  doc.roundedRect(15, yPosition, pageWidth - 30, 28, 4, 4, 'F')
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text('Meal Attendance Rate', 20, yPosition + 10)
  
  // Large percentage
  doc.setFontSize(24)
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.text(`${attendanceRate}%`, 20, yPosition + 22)
  
  // Progress bar
  const barWidth = pageWidth - 120
  const barX = 95
  const barY = yPosition + 10
  const barHeight = 12
  
  // Bar background
  doc.setFillColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.roundedRect(barX, barY, barWidth, barHeight, 6, 6, 'F')
  
  // Progress fill
  const progressWidth = (barWidth * parseFloat(attendanceRate)) / 100
  const progressColor = parseFloat(attendanceRate) >= 75 
    ? COLORS.success 
    : parseFloat(attendanceRate) >= 50 
    ? COLORS.warning 
    : COLORS.error
  doc.setFillColor(progressColor[0], progressColor[1], progressColor[2])
  doc.roundedRect(barX, barY, progressWidth, barHeight, 6, 6, 'F')
  
  // Progress highlight
  doc.setFillColor(255, 255, 255, 0.3)
  doc.roundedRect(barX, barY, progressWidth, barHeight * 0.4, 6, 6, 'F')
  
  // Percentage text on bar
  if (progressWidth > 20) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text(`${attendanceRate}%`, barX + progressWidth - 5, barY + 8, { align: 'right' })
  }

  yPosition += 38

  // CHARTS SECTION
  checkPageBreak(120)
  
  // Section title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.text('VISUAL ANALYTICS', 20, yPosition)
  
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.setLineWidth(3)
  doc.line(20, yPosition + 2, 85, yPosition + 2)
  
  yPosition += 12
  
  // Chart 1: Meal Distribution (Pie Chart)
  const chartBoxHeight = 85
  const chartBoxWidth = (pageWidth - 40) / 2
  
  // Left chart box
  doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2])
  doc.roundedRect(15, yPosition, chartBoxWidth, chartBoxHeight, 4, 4, 'F')
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(15, yPosition, chartBoxWidth, chartBoxHeight, 4, 4, 'S')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text('Meal Distribution', 20, yPosition + 8)
  
  // Draw pie chart
  const pieData = [
    { label: 'Lunch', value: lunchCount, color: COLORS.info },
    { label: 'Dinner', value: dinnerCount, color: COLORS.warning }
  ]
  
  drawPieChart(doc, 15 + chartBoxWidth / 2, yPosition + 45, 22, pieData)
  
  // Legend
  let legendY = yPosition + 70
  pieData.forEach((item) => {
    doc.setFillColor(item.color[0], item.color[1], item.color[2])
    doc.roundedRect(20, legendY, 4, 4, 1, 1, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
    doc.text(`${item.label}: ${item.value}`, 26, legendY + 3)
    legendY += 6
  })
  
  // Right chart box - Meal Attendance Overview
  const rightChartX = 15 + chartBoxWidth + 10
  doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2])
  doc.roundedRect(rightChartX, yPosition, chartBoxWidth, chartBoxHeight, 4, 4, 'F')
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(rightChartX, yPosition, chartBoxWidth, chartBoxHeight, 4, 4, 'S')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text('Meal Attendance Overview', rightChartX + 5, yPosition + 8)
  
  // Draw bar chart
  const barData = [
    { label: 'Taken', value: mealsTaken, color: COLORS.success },
    { label: 'Skipped', value: mealsSkipped, color: COLORS.error },
    { label: 'Leave', value: approvedLeave, color: COLORS.warning }
  ]
  
  drawBarChart(doc, rightChartX + 10, yPosition + 20, chartBoxWidth - 20, 50, barData)
  
  yPosition += chartBoxHeight + 10
  
  // Chart 3: Weekly Consumption (Line Chart)
  checkPageBreak(90)
  
  doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2])
  doc.roundedRect(15, yPosition, pageWidth - 30, 80, 4, 4, 'F')
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2])
  doc.setLineWidth(0.5)
  doc.roundedRect(15, yPosition, pageWidth - 30, 80, 4, 4, 'S')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  doc.text('Weekly Meal Consumption Trend', 20, yPosition + 8)
  
  // Prepare weekly data
  const weeklyArray = Object.entries(weeklyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 12) // Show max 12 weeks
    .map(([week, count]) => ({
      label: `W${new Date(week).getDate()}`,
      value: count
    }))
  
  if (weeklyArray.length > 0) {
    drawLineChart(doc, 25, yPosition + 20, pageWidth - 60, 50, weeklyArray, COLORS.primary)
  } else {
    doc.setFontSize(9)
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2])
    doc.text('No data available for weekly trend', pageWidth / 2, yPosition + 45, { align: 'center' })
  }
  
  yPosition += 90
  // DETAILED MEAL RECORD TABLE
  checkPageBreak(60)
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
  doc.text('DETAILED MEAL RECORD', 20, yPosition)
  
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2])
  doc.setLineWidth(3)
  doc.line(20, yPosition + 2, 100, yPosition + 2)
  
  yPosition += 10

  // Prepare table data
  const dateMap = new Map<string, { lunch: boolean; dinner: boolean }>()
  data.logs.forEach(log => {
    const date = log.date
    if (!dateMap.has(date)) {
      dateMap.set(date, { lunch: false, dinner: false })
    }
    const entry = dateMap.get(date)!
    if (log.meal_type === 'LUNCH') entry.lunch = true
    if (log.meal_type === 'DINNER') entry.dinner = true
  })
  
  const allDates: string[] = []
  const current = new Date(data.dateRange.start)
  const end = new Date(data.dateRange.end)
  while (current <= end) {
    allDates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  const tableData = allDates.map(date => {
    const entry = dateMap.get(date)
    const formattedDate = new Date(date).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short',
      weekday: 'short'
    })
    const isLeave = false
    return [
      formattedDate,
      isLeave ? 'Leave' : entry?.lunch ? '✓' : '✗',
      isLeave ? 'Leave' : entry?.dinner ? '✓' : '✗'
    ]
  })

  autoTable(doc, {
    startY: yPosition,
    head: [['Date', 'Lunch', 'Dinner']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      cellPadding: 5
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      halign: 'center',
      cellPadding: 4
    },
    alternateRowStyles: {
      fillColor: COLORS.background
    },
    columnStyles: {
      0: { cellWidth: 50, halign: 'left', fontStyle: 'normal' },
      1: { cellWidth: 'auto', fontStyle: 'bold', fontSize: 11 },
      2: { cellWidth: 'auto', fontStyle: 'bold', fontSize: 11 }
    },
    margin: { left: 15, right: 15 },
    didParseCell: function(data) {
      if (data.section === 'body' && (data.column.index === 1 || data.column.index === 2)) {
        if (data.cell.text[0] === '✓') {
          data.cell.styles.textColor = COLORS.success
          data.cell.styles.fontStyle = 'bold'
        } else if (data.cell.text[0] === '✗') {
          data.cell.styles.textColor = COLORS.error
          data.cell.styles.fontStyle = 'bold'
        } else if (data.cell.text[0] === 'Leave') {
          data.cell.styles.textColor = COLORS.warning
          data.cell.styles.fontStyle = 'italic'
          data.cell.styles.fontSize = 9
        }
      }
    },
    didDrawPage: function(data) {
      if (data.pageNumber > 1) {
        // Header already added by checkPageBreak
      }
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPosition = (doc as any).lastAutoTable.finalY + 15


  // LEAVE EXTENSION SUMMARY
  checkPageBreak(55)
  
  // Box with modern design
  doc.setFillColor(255, 251, 235)
  doc.roundedRect(15, yPosition, pageWidth - 30, 48, 5, 5, 'F')
  doc.setDrawColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2])
  doc.setLineWidth(1.5)
  doc.roundedRect(15, yPosition, pageWidth - 30, 48, 5, 5, 'S')
  
  // Icon and title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2])
  doc.text('📋 LEAVE EXTENSION SUMMARY', 20, yPosition + 10)
  
  // Divider
  doc.setDrawColor(COLORS.warning[0], COLORS.warning[1], COLORS.warning[2], 0.3)
  doc.setLineWidth(0.5)
  doc.line(20, yPosition + 14, pageWidth - 20, yPosition + 14)
  
  // Content in two columns
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2])
  
  const originalEndDate = data.student.subscription_end_date 
    ? new Date(data.student.subscription_end_date).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })
    : 'N/A'
  const leaveDays = Math.floor(approvedLeave / mealsPerDay)
  const updatedEndDate = data.student.subscription_end_date
    ? new Date(
        new Date(data.student.subscription_end_date).getTime() + 
        leaveDays * 24 * 60 * 60 * 1000
      ).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })
    : 'N/A'
  
  // Left column
  doc.setFont('helvetica', 'bold')
  doc.text('Approved Leave Meals:', 25, yPosition + 22)
  doc.setFont('helvetica', 'normal')
  doc.text(`${approvedLeave} meals`, 80, yPosition + 22)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Approved Leave Days:', 25, yPosition + 30)
  doc.setFont('helvetica', 'normal')
  doc.text(`${leaveDays} days`, 80, yPosition + 30)
  
  // Right column
  doc.setFont('helvetica', 'bold')
  doc.text('Original Mess End Date:', 25, yPosition + 38)
  doc.setFont('helvetica', 'normal')
  doc.text(originalEndDate, 80, yPosition + 38)
  
  doc.setFont('helvetica', 'bold')
  doc.text('Updated Mess End Date:', 25, yPosition + 46)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2])
  doc.text(updatedEndDate, 80, yPosition + 46)

  yPosition += 56

  // Info note
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2])
  const noteText = 'Note: Approved leave meals extend the mess validity period equivalent to the number of approved leave days.'
  doc.text(noteText, pageWidth / 2, yPosition, { 
    align: 'center', 
    maxWidth: pageWidth - 40 
  })

  yPosition += 10

  // FOOTER - Add to all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    const footerY = pageHeight - 20
    
    // Decorative top border
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.setLineWidth(0.8)
    doc.line(15, footerY - 8, pageWidth - 15, footerY - 8)
    
    // Footer content
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.text('GOKUL MESS MANAGEMENT SYSTEM', pageWidth / 2, footerY - 2, { align: 'center' })
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2])
    doc.text('📧 gokul.mess.alandi@gmail.com', pageWidth / 2, footerY + 3, { align: 'center' })
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.text('Generated automatically by Gokul Mess System', pageWidth / 2, footerY + 8, { align: 'center' })
    
    // Page number badge
    const pageNumX = pageWidth - 25
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2])
    doc.roundedRect(pageNumX, footerY - 4, 18, 8, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2])
    doc.text(`${i}/${pageCount}`, pageNumX + 9, footerY + 1, { align: 'center' })
  }

  // Save the PDF with clean filename
  const fileName = `Gokul_Mess_Report_${data.student.full_name.replace(/\s+/g, '_')}.pdf`
  doc.save(fileName)
}
