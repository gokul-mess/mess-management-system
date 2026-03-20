// Owner Analytics Report Generator - Comprehensive Professional PDF Report
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Extend jsPDF type to include autoTable properties
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number
  }
}

interface StudentMealData {
  name: string
  id: number
  meals: number
  mealPlan: string
}

interface DailyMealData {
  date: string
  meals: number
  lunch: number
  dinner: number
  revenue: number
}

interface LeaveData {
  studentName: string
  studentId: number
  leaveDays: number
}

interface AnalyticsReportData {
  period: {
    label: string
    start: string
    end: string
  }
  metrics: {
    totalMeals: number
    totalRevenue: number
    activeStudents: number
    totalStudents: number
    averageMealsPerDay: number
    attendanceRate: number
    revenuePerMeal: number
  }
  mealDistribution: {
    lunch: number
    dinner: number
    lunchPercentage: number
    dinnerPercentage: number
  }
  mealPlanDistribution: {
    DL: number
    L: number
    D: number
  }
  dailyTrend: DailyMealData[]
  topStudents: StudentMealData[]
  lowAttendanceStudents: StudentMealData[]
  perfectAttendanceStudents: StudentMealData[]
  leaveAnalysis: {
    totalLeaveDays: number
    studentsOnLeave: number
    topLeaveStudents: LeaveData[]
  }
  peakDay: {
    date: string
    meals: number
  }
  lowDay: {
    date: string
    meals: number
  }
}

/**
 * Sanitize filename component
 */
function sanitizeFileNameComponent(input: string): string {
  const withUnderscores = input.replace(/\s+/g, '_')
  const safeCharsOnly = withUnderscores.replace(/[^a-zA-Z0-9_-]/g, '_')
  const collapsed = safeCharsOnly.replace(/_+/g, '_').replace(/^_+|_+$/g, '')
  return collapsed || 'Report'
}

/**
 * Format number with Indian currency
 */
function formatCurrency(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

/**
 * Format date in Indian format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Generate comprehensive owner analytics report
 */
export async function generateOwnerAnalyticsReport(data: AnalyticsReportData): Promise<void> {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Validate data
    if (!data || !data.metrics || !data.mealDistribution) {
      throw new Error('Invalid report data provided')
    }
    
    // Colors
    const PRIMARY = [46, 125, 50] as [number, number, number]
    const SECONDARY = [249, 168, 37] as [number, number, number]
    const SUCCESS = [76, 175, 80] as [number, number, number]
    const INFO = [33, 150, 243] as [number, number, number]
    const WARNING = [255, 152, 0] as [number, number, number]
    const DANGER = [244, 67, 54] as [number, number, number]
    const TEXT = [33, 33, 33] as [number, number, number]
    const TEXT_LIGHT = [117, 117, 117] as [number, number, number]
    const WHITE = [255, 255, 255] as [number, number, number]
    
    let yPosition = 0

    // ===== HEADER FUNCTION =====
    const addHeader = () => {
      // Single light green background
      doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
      doc.rect(0, 0, pageWidth, 50, 'F')
      
      // Decorative circles pattern
      doc.setFillColor(255, 255, 255)
      doc.setGState(doc.GState({ opacity: 0.05 }))
      for (let i = 0; i < 8; i++) {
        doc.circle(i * 30 - 10, 10, 25, 'F')
        doc.circle(i * 30 + 5, 35, 20, 'F')
      }
      doc.setGState(doc.GState({ opacity: 1 }))
      
      // Golden accent bar
      doc.setFillColor(SECONDARY[0], SECONDARY[1], SECONDARY[2])
      doc.rect(0, 46, pageWidth, 4, 'F')
      
      // Logo
      const logoX = 22
      const logoY = 22
      const logoSize = 20
      
      // Outer ring - golden
      doc.setDrawColor(SECONDARY[0], SECONDARY[1], SECONDARY[2])
      doc.setLineWidth(2.5)
      doc.circle(logoX, logoY, logoSize / 2, 'D')
      
      // Inner circle - white
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
      doc.circle(logoX, logoY, logoSize / 2 - 2, 'F')
      
      // Inner ring - green
      doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
      doc.setLineWidth(1.5)
      doc.circle(logoX, logoY, logoSize / 2 - 3.5, 'D')
      
      // Center - green
      doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
      doc.circle(logoX, logoY, logoSize / 2 - 4.5, 'F')
      
      // Letter G
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
      doc.text('G', logoX, logoY + 2, { align: 'center' })
      
      // Decorative dots
      doc.setFillColor(SECONDARY[0], SECONDARY[1], SECONDARY[2])
      const dotDistance = logoSize / 2 + 3
      doc.circle(logoX - dotDistance * 0.7, logoY - dotDistance * 0.7, 1.2, 'F')
      doc.circle(logoX + dotDistance * 0.7, logoY - dotDistance * 0.7, 1.2, 'F')
      doc.circle(logoX - dotDistance * 0.7, logoY + dotDistance * 0.7, 1.2, 'F')
      doc.circle(logoX + dotDistance * 0.7, logoY + dotDistance * 0.7, 1.2, 'F')
      
      // Title
      const textStartX = logoX + logoSize + 8
      const textY = logoY - 4
      
      doc.setFontSize(26)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
      doc.text('GOKUL MESS', textStartX, textY)
      
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(240, 240, 240)
      doc.text('Owner Analytics Report', textStartX, textY + 8)
      
      doc.setFontSize(7.5)
      doc.setTextColor(SECONDARY[0], SECONDARY[1], SECONDARY[2])
      doc.text('Business Performance Overview', textStartX, textY + 14)
      
      // Badge with shield icon
      const badgeX = pageWidth - 38
      const badgeY = logoY
      
      doc.setDrawColor(SECONDARY[0], SECONDARY[1], SECONDARY[2])
      doc.setLineWidth(1.5)
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
      doc.setGState(doc.GState({ opacity: 0.95 }))
      doc.roundedRect(badgeX - 16, badgeY - 10, 38, 20, 4, 4, 'FD')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      doc.setDrawColor(SECONDARY[0], SECONDARY[1], SECONDARY[2])
      doc.setLineWidth(0.5)
      doc.roundedRect(badgeX - 15, badgeY - 9, 36, 18, 3, 3, 'D')
      
      // Badge icon - shield with checkmark
      const shieldX = badgeX - 9
      const shieldY = badgeY
      
      // Shield shape - green
      doc.setFillColor(46, 125, 50)
      doc.setDrawColor(46, 125, 50)
      doc.setLineWidth(0.5)
      
      // Shield body
      doc.roundedRect(shieldX - 3.5, shieldY - 5, 8, 8, 1, 1, 'FD')
      
      // Shield bottom point
      doc.triangle(shieldX - 3.5, shieldY + 3, shieldX + 4.5, shieldY + 3, shieldX, shieldY + 7, 'F')
      
      // Checkmark in shield - white
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(1.2)
      doc.setLineCap('round')
      doc.line(shieldX - 2, shieldY, shieldX - 0.5, shieldY + 2)
      doc.line(shieldX - 0.5, shieldY + 2, shieldX + 2.5, shieldY - 2)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
      doc.text('OFFICIAL', badgeX + 2, badgeY - 1.5, { align: 'left' })
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text('Report', badgeX + 2, badgeY + 4.5, { align: 'left' })
      
      // Corner decorations
      doc.setDrawColor(SECONDARY[0], SECONDARY[1], SECONDARY[2])
      doc.setLineWidth(2)
      doc.line(0, 0, 15, 0)
      doc.line(0, 0, 0, 15)
      doc.line(pageWidth - 15, 0, pageWidth, 0)
      doc.line(pageWidth, 0, pageWidth, 15)
    }

    addHeader()
    yPosition = 60

    // ===== PROFESSIONAL SECTION HEADING FUNCTION =====
    const addSectionHeading = (title: string, yPos: number, color: [number, number, number] = PRIMARY) => {
      // Background bar with gradient effect
      doc.setFillColor(color[0], color[1], color[2])
      doc.setGState(doc.GState({ opacity: 0.08 }))
      doc.rect(15, yPos - 6, pageWidth - 30, 12, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      // Left accent bar
      doc.setFillColor(color[0], color[1], color[2])
      doc.rect(15, yPos - 6, 4, 12, 'F')
      
      // Title text
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(color[0], color[1], color[2])
      doc.text(title, 23, yPos + 1)
      
      // Bottom accent line
      doc.setDrawColor(SECONDARY[0], SECONDARY[1], SECONDARY[2])
      doc.setLineWidth(2)
      doc.line(23, yPos + 3, 23 + doc.getTextWidth(title), yPos + 3)
      
      return yPos + 10
    }

    // ===== SUB-SECTION HEADING FUNCTION =====
    const addSubSectionHeading = (title: string, yPos: number, color: [number, number, number] = INFO) => {
      // Left accent line
      doc.setDrawColor(color[0], color[1], color[2])
      doc.setLineWidth(3)
      doc.line(18, yPos - 3, 18, yPos + 5)
      
      // Title text
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(color[0], color[1], color[2])
      doc.text(title, 24, yPos + 2)
      
      // Bottom line
      doc.setDrawColor(color[0], color[1], color[2])
      doc.setLineWidth(0.5)
      doc.line(24, yPos + 4, 24 + doc.getTextWidth(title) + 5, yPos + 4)
      
      return yPos + 8
    }

    // ===== PAGE 1: EXECUTIVE SUMMARY =====
    
    // Report Period
    doc.setFillColor(INFO[0], INFO[1], INFO[2])
    doc.setGState(doc.GState({ opacity: 0.1 }))
    doc.roundedRect(15, yPosition, pageWidth - 30, 22, 4, 4, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
    doc.setDrawColor(INFO[0], INFO[1], INFO[2])
    doc.setLineWidth(1)
    doc.roundedRect(15, yPosition, pageWidth - 30, 22, 4, 4, 'S')
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(INFO[0], INFO[1], INFO[2])
    doc.text('REPORT PERIOD', 20, yPosition + 7)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
    doc.text(data.period.label, 20, yPosition + 14)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2])
    const startDate = formatDate(data.period.start)
    const endDate = formatDate(data.period.end)
    doc.text(`${startDate} to ${endDate}`, pageWidth - 20, yPosition + 14, { align: 'right' })
    
    const genDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    doc.setFontSize(7)
    doc.text(`Generated: ${genDate}`, pageWidth - 20, yPosition + 19, { align: 'right' })
    
    yPosition += 30

    // Section Title - KEY PERFORMANCE INDICATORS
    yPosition = addSectionHeading('KEY PERFORMANCE INDICATORS', yPosition, PRIMARY)
    
    yPosition += 2

    // KPI Cards
    const cardWidth = (pageWidth - 40) / 2
    const cardHeight = 30
    const kpiCards = [
      { label: 'Total Meals Served', value: data.metrics.totalMeals, color: SUCCESS },
      { label: 'Total Revenue', value: formatCurrency(data.metrics.totalRevenue), color: INFO },
      { label: 'Active Students', value: `${data.metrics.activeStudents}/${data.metrics.totalStudents}`, color: WARNING },
      { label: 'Avg Meals/Day', value: data.metrics.averageMealsPerDay.toFixed(1), color: PRIMARY },
    ]

    kpiCards.forEach((card, index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const x = 15 + (col * (cardWidth + 10))
      const y = yPosition + (row * (cardHeight + 8))
      
      if (x < 0 || y < 0 || cardWidth <= 0 || cardHeight <= 0 || x + cardWidth > pageWidth || y + cardHeight > pageHeight) {
        return
      }
      
      // Shadow
      doc.setFillColor(0, 0, 0)
      doc.setGState(doc.GState({ opacity: 0.08 }))
      doc.roundedRect(x + 2, y + 2, cardWidth, cardHeight, 3, 3, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      // Background
      doc.setFillColor(card.color[0], card.color[1], card.color[2])
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F')
      
      // Highlight
      doc.setFillColor(255, 255, 255)
      doc.setGState(doc.GState({ opacity: 0.2 }))
      doc.roundedRect(x, y, cardWidth, cardHeight * 0.65, 3, 3, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      // Value
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
      doc.text(String(card.value), x + cardWidth / 2, y + 16, { align: 'center' })
      
      // Label
      doc.setFontSize(9)
      doc.text(card.label, x + cardWidth / 2, y + 24, { align: 'center' })
    })

    yPosition += (cardHeight * 2) + 20

    // Quick Stats Row
    yPosition = addSectionHeading('QUICK STATISTICS', yPosition, PRIMARY)

    const quickStats = [
      { label: 'Attendance Rate', value: `${data.metrics.attendanceRate.toFixed(1)}%`, color: data.metrics.attendanceRate >= 75 ? SUCCESS : data.metrics.attendanceRate >= 50 ? WARNING : DANGER },
      { label: 'Revenue Per Meal', value: formatCurrency(data.metrics.revenuePerMeal), color: INFO },
      { label: 'Peak Day', value: `${formatDate(data.peakDay.date)} (${data.peakDay.meals} meals)`, color: SUCCESS },
      { label: 'Most Popular', value: data.mealDistribution.lunch > data.mealDistribution.dinner ? 'Lunch' : 'Dinner', color: WARNING },
    ]

    quickStats.forEach((stat, index) => {
      const statY = yPosition + (index * 12)
      
      doc.setFillColor(stat.color[0], stat.color[1], stat.color[2])
      doc.setGState(doc.GState({ opacity: 0.1 }))
      doc.roundedRect(15, statY, pageWidth - 30, 10, 2, 2, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
      doc.text(stat.label, 20, statY + 6.5)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(stat.color[0], stat.color[1], stat.color[2])
      doc.text(stat.value, pageWidth - 20, statY + 6.5, { align: 'right' })
    })

    yPosition += 55

    // ===== PAGE 2: MEAL ANALYTICS =====
    doc.addPage()
    addHeader()
    yPosition = 60

    // Meal Type Distribution
    yPosition = addSectionHeading('MEAL TYPE DISTRIBUTION', yPosition, PRIMARY)
    
    yPosition += 2

    // Lunch bar
    doc.setFillColor(INFO[0], INFO[1], INFO[2])
    doc.setGState(doc.GState({ opacity: 0.1 }))
    doc.roundedRect(15, yPosition, pageWidth - 30, 22, 4, 4, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
    doc.text('Lunch', 20, yPosition + 9)
    
    const totalMeals = data.mealDistribution.lunch + data.mealDistribution.dinner
    const lunchBarWidth = totalMeals > 0 ? Math.max(5, ((pageWidth - 100) * data.mealDistribution.lunch) / totalMeals) : 5
    doc.setFillColor(INFO[0], INFO[1], INFO[2])
    doc.roundedRect(20, yPosition + 12, lunchBarWidth, 6, 3, 3, 'F')
    
    doc.setFontSize(9)
    doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2])
    doc.text(`${data.mealDistribution.lunch} meals (${data.mealDistribution.lunchPercentage.toFixed(1)}%)`, pageWidth - 20, yPosition + 16, { align: 'right' })
    
    yPosition += 27

    // Dinner bar
    doc.setFillColor(WARNING[0], WARNING[1], WARNING[2])
    doc.setGState(doc.GState({ opacity: 0.1 }))
    doc.roundedRect(15, yPosition, pageWidth - 30, 22, 4, 4, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
    doc.text('Dinner', 20, yPosition + 9)
    
    const dinnerBarWidth = totalMeals > 0 ? Math.max(5, ((pageWidth - 100) * data.mealDistribution.dinner) / totalMeals) : 5
    doc.setFillColor(WARNING[0], WARNING[1], WARNING[2])
    doc.roundedRect(20, yPosition + 12, dinnerBarWidth, 6, 3, 3, 'F')
    
    doc.setFontSize(9)
    doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2])
    doc.text(`${data.mealDistribution.dinner} meals (${data.mealDistribution.dinnerPercentage.toFixed(1)}%)`, pageWidth - 20, yPosition + 16, { align: 'right' })
    
    yPosition += 32

    // Meal Plan Distribution
    yPosition = addSectionHeading('MEAL PLAN DISTRIBUTION', yPosition, PRIMARY)

    const mealPlans = [
      { plan: 'DL (Lunch & Dinner)', count: data.mealPlanDistribution.DL, color: SUCCESS },
      { plan: 'L (Lunch Only)', count: data.mealPlanDistribution.L, color: INFO },
      { plan: 'D (Dinner Only)', count: data.mealPlanDistribution.D, color: WARNING },
    ]

    mealPlans.forEach((plan, index) => {
      const planY = yPosition + (index * 14)
      
      doc.setFillColor(plan.color[0], plan.color[1], plan.color[2])
      doc.setGState(doc.GState({ opacity: 0.1 }))
      doc.roundedRect(15, planY, pageWidth - 30, 12, 3, 3, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
      doc.text(plan.plan, 20, planY + 8)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(plan.color[0], plan.color[1], plan.color[2])
      doc.text(`${plan.count} students`, pageWidth - 20, planY + 8, { align: 'right' })
    })

    yPosition += 50

    // Daily Trend Table
    yPosition = addSectionHeading('DAILY MEAL TREND', yPosition, PRIMARY)
    
    yPosition += 2

    if (data.dailyTrend.length > 0) {
      const trendData = data.dailyTrend.slice(0, 10).map(day => [
        formatDate(day.date),
        day.meals.toString(),
        day.lunch.toString(),
        day.dinner.toString(),
        formatCurrency(day.revenue)
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Total', 'Lunch', 'Dinner', 'Revenue']],
        body: trendData,
        theme: 'striped',
        headStyles: {
          fillColor: PRIMARY,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: TEXT,
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' },
          1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
      })

      yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
    }

    // ===== PAGE 3: STUDENT ANALYTICS =====
    doc.addPage()
    addHeader()
    yPosition = 60

    // Student Participation
    yPosition = addSectionHeading('STUDENT PARTICIPATION', yPosition, PRIMARY)
    
    yPosition += 2

    const participationRate = data.metrics.totalStudents > 0 ? ((data.metrics.activeStudents / data.metrics.totalStudents) * 100).toFixed(1) : '0'
    const inactiveStudents = data.metrics.totalStudents - data.metrics.activeStudents

    const participationStats = [
      { label: 'Total Registered Students', value: data.metrics.totalStudents, color: INFO },
      { label: 'Active Students (in period)', value: data.metrics.activeStudents, color: SUCCESS },
      { label: 'Inactive Students', value: inactiveStudents, color: DANGER },
      { label: 'Participation Rate', value: `${participationRate}%`, color: parseFloat(participationRate) >= 75 ? SUCCESS : WARNING },
    ]

    participationStats.forEach((stat, index) => {
      const statY = yPosition + (index * 12)
      
      doc.setFillColor(stat.color[0], stat.color[1], stat.color[2])
      doc.setGState(doc.GState({ opacity: 0.1 }))
      doc.roundedRect(15, statY, pageWidth - 30, 10, 2, 2, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
      doc.text(stat.label, 20, statY + 6.5)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(stat.color[0], stat.color[1], stat.color[2])
      doc.text(String(stat.value), pageWidth - 20, statY + 6.5, { align: 'right' })
    })

    yPosition += 55

    // Top 10 Students
    yPosition = addSectionHeading('TOP 10 STUDENTS BY CONSUMPTION', yPosition, PRIMARY)
    
    yPosition += 2

    if (data.topStudents.length > 0) {
      const topStudentsData = data.topStudents.map((student, index) => {
        const percentage = data.metrics.totalMeals > 0 ? ((student.meals / data.metrics.totalMeals) * 100).toFixed(1) : '0'
        return [
          `#${index + 1}`,
          student.name,
          student.id.toString(),
          student.mealPlan,
          student.meals.toString(),
          `${percentage}%`
        ]
      })

      autoTable(doc, {
        startY: yPosition,
        head: [['Rank', 'Student Name', 'ID', 'Plan', 'Meals', '% of Total']],
        body: topStudentsData,
        theme: 'striped',
        headStyles: {
          fillColor: PRIMARY,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: TEXT,
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold', fillColor: [249, 168, 37], textColor: WHITE },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 20, halign: 'center' }
        },
        margin: { left: 15, right: 15 }
      })

      yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15
    }

    // Perfect Attendance Students
    if (data.perfectAttendanceStudents.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(SUCCESS[0], SUCCESS[1], SUCCESS[2])
      doc.text(`PERFECT ATTENDANCE (${data.perfectAttendanceStudents.length} students)`, 20, yPosition)
      
      yPosition += 8

      const perfectData = data.perfectAttendanceStudents.slice(0, 5).map(student => [
        student.name,
        `GM${student.id}`,
        student.mealPlan,
        student.meals.toString()
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Student Name', 'ID', 'Plan', 'Meals']],
        body: perfectData,
        theme: 'grid',
        headStyles: {
          fillColor: SUCCESS,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: TEXT,
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      })

      yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15
    }

    // REVENUE & FINANCIAL INSIGHTS (moved from page 4)
    yPosition = addSectionHeading('REVENUE & FINANCIAL INSIGHTS', yPosition, PRIMARY)
    
    yPosition += 2

    // Revenue Breakdown (removed Revenue Per Meal)
    const revenueBreakdown = [
      { label: 'Total Revenue (Period)', value: formatCurrency(data.metrics.totalRevenue), color: SUCCESS },
      { label: 'Daily Average Revenue', value: formatCurrency(data.metrics.totalRevenue / data.dailyTrend.length), color: INFO },
      { label: 'Revenue from Lunch', value: formatCurrency(data.mealDistribution.lunch * data.metrics.revenuePerMeal), color: INFO },
      { label: 'Revenue from Dinner', value: formatCurrency(data.mealDistribution.dinner * data.metrics.revenuePerMeal), color: WARNING },
    ]

    revenueBreakdown.forEach((item, index) => {
      const itemY = yPosition + (index * 12)
      
      doc.setFillColor(item.color[0], item.color[1], item.color[2])
      doc.setGState(doc.GState({ opacity: 0.1 }))
      doc.roundedRect(15, itemY, pageWidth - 30, 10, 2, 2, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
      doc.text(item.label, 20, itemY + 6.5)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(item.color[0], item.color[1], item.color[2])
      doc.text(item.value, pageWidth - 20, itemY + 6.5, { align: 'right' })
    })

    // ===== PAGE 4: DAILY REVENUE TREND & SUMMARY =====
    doc.addPage()
    addHeader()
    yPosition = 60

    // Daily Revenue Trend
    yPosition = addSectionHeading('DAILY REVENUE TREND', yPosition, PRIMARY)
    
    yPosition += 2

    if (data.dailyTrend.length > 0) {
      const revenueData = data.dailyTrend.slice(0, 10).map(day => [
        formatDate(day.date),
        formatCurrency(day.revenue),
        day.meals.toString(),
        formatCurrency(day.revenue / (day.meals || 1))
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Revenue', 'Meals', 'Avg/Meal']],
        body: revenueData,
        theme: 'striped',
        headStyles: {
          fillColor: SUCCESS,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          textColor: TEXT,
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { cellWidth: 40, halign: 'left' },
          1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 40, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
      })

      yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15
    }

    // Summary Statistics Table
    yPosition = addSectionHeading('SUMMARY STATISTICS', yPosition, PRIMARY)
    
    yPosition += 2

    const summaryData = [
      ['Total Meals Served', data.metrics.totalMeals.toString()],
      ['Total Revenue', formatCurrency(data.metrics.totalRevenue)],
      ['Active Students', `${data.metrics.activeStudents}/${data.metrics.totalStudents}`],
      ['Attendance Rate', `${data.metrics.attendanceRate.toFixed(1)}%`],
      ['Avg Meals/Day', data.metrics.averageMealsPerDay.toFixed(1)],
      ['Revenue/Meal', formatCurrency(data.metrics.revenuePerMeal)],
      ['Lunch Count', `${data.mealDistribution.lunch} (${data.mealDistribution.lunchPercentage.toFixed(1)}%)`],
      ['Dinner Count', `${data.mealDistribution.dinner} (${data.mealDistribution.dinnerPercentage.toFixed(1)}%)`],
      ['Leave Days', data.leaveAnalysis.totalLeaveDays.toString()],
      ['Operating Days', data.dailyTrend.length.toString()]
    ]

    autoTable(doc, {
      startY: yPosition,
      body: summaryData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { 
          cellWidth: 80, 
          halign: 'left', 
          fontStyle: 'bold',
          fillColor: [248, 249, 250],
          textColor: TEXT
        },
        1: { 
          cellWidth: 65, 
          halign: 'right',
          fontStyle: 'bold',
          textColor: PRIMARY
        }
      },
      margin: { left: 15, right: 15 }
    })

    // ===== PAGE 5: OPERATIONAL INSIGHTS =====
    doc.addPage()
    addHeader()
    yPosition = 60

    yPosition = addSectionHeading('OPERATIONAL INSIGHTS', yPosition, PRIMARY)
    
    yPosition += 4

    // Leave Analysis - Sub-heading
    yPosition = addSubSectionHeading('LEAVE ANALYSIS', yPosition, WARNING)

    const leaveStats = [
      { label: 'Total Approved Leave Days', value: data.leaveAnalysis.totalLeaveDays, color: WARNING },
      { label: 'Students on Leave', value: data.leaveAnalysis.studentsOnLeave, color: INFO },
      { label: 'Avg Leave per Student', value: data.leaveAnalysis.studentsOnLeave > 0 ? (data.leaveAnalysis.totalLeaveDays / data.leaveAnalysis.studentsOnLeave).toFixed(1) : '0', color: TEXT_LIGHT },
    ]

    leaveStats.forEach((stat, index) => {
      const statY = yPosition + (index * 10)
      
      doc.setFillColor(stat.color[0], stat.color[1], stat.color[2])
      doc.setGState(doc.GState({ opacity: 0.1 }))
      doc.roundedRect(15, statY, pageWidth - 30, 8, 2, 2, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
      doc.text(stat.label, 20, statY + 5.5)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(stat.color[0], stat.color[1], stat.color[2])
      doc.text(String(stat.value), pageWidth - 20, statY + 5.5, { align: 'right' })
    })

    yPosition += 35

    // Top Leave Students - Sub-heading
    if (data.leaveAnalysis.topLeaveStudents.length > 0) {
      yPosition = addSubSectionHeading('Students with Most Leave Days', yPosition, WARNING)

      const leaveData = data.leaveAnalysis.topLeaveStudents.map(student => [
        student.studentName,
        student.studentId.toString(),
        `${student.leaveDays} days`
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Student Name', 'ID', 'Leave Days']],
        body: leaveData,
        theme: 'grid',
        headStyles: {
          fillColor: WARNING,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: TEXT,
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 15, right: 15 }
      })

      yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15
    }

    // Daily Operations Summary - Sub-heading
    yPosition = addSubSectionHeading('DAILY OPERATIONS SUMMARY', yPosition, INFO)

    const operationalStats = [
      { label: 'Peak Day', value: `${formatDate(data.peakDay.date)} - ${data.peakDay.meals} meals`, color: SUCCESS },
      { label: 'Lowest Day', value: `${formatDate(data.lowDay.date)} - ${data.lowDay.meals} meals`, color: DANGER },
      { label: 'Average Meals/Day', value: data.metrics.averageMealsPerDay.toFixed(1), color: INFO },
      { label: 'Total Operating Days', value: data.dailyTrend.length, color: PRIMARY },
    ]

    operationalStats.forEach((stat, index) => {
      const statY = yPosition + (index * 10)
      
      doc.setFillColor(stat.color[0], stat.color[1], stat.color[2])
      doc.setGState(doc.GState({ opacity: 0.1 }))
      doc.roundedRect(15, statY, pageWidth - 30, 8, 2, 2, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
      doc.text(stat.label, 20, statY + 5.5)
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(stat.color[0], stat.color[1], stat.color[2])
      doc.text(String(stat.value), pageWidth - 20, statY + 5.5, { align: 'right' })
    })

    yPosition += 50

    // Low Attendance Students - Sub-heading
    if (data.lowAttendanceStudents.length > 0) {
      yPosition = addSubSectionHeading('LOW ATTENDANCE STUDENTS (<50%)', yPosition, DANGER)

      const lowAttendanceData = data.lowAttendanceStudents.slice(0, 10).map(student => {
        const expectedMeals = student.mealPlan === 'DL' ? data.dailyTrend.length * 2 : data.dailyTrend.length
        const attendanceRate = expectedMeals > 0 ? ((student.meals / expectedMeals) * 100).toFixed(1) : '0'
        return [
          student.name,
          student.id.toString(),
          student.mealPlan,
          student.meals.toString(),
          `${attendanceRate}%`
        ]
      })

      autoTable(doc, {
        startY: yPosition,
        head: [['Student Name', 'ID', 'Plan', 'Meals', 'Rate']],
        body: lowAttendanceData,
        theme: 'grid',
        headStyles: {
          fillColor: DANGER,
          textColor: WHITE,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: TEXT,
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: DANGER }
        },
        margin: { left: 15, right: 15 }
      })

      yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
    }

    // ===== PAGE 6: BUSINESS RECOMMENDATIONS =====
    doc.addPage()
    addHeader()
    yPosition = 60

    yPosition = addSectionHeading('BUSINESS INSIGHTS & RECOMMENDATIONS', yPosition, PRIMARY)
    
    yPosition += 2

    // Key Insights
    const insights = [
      {
        title: 'Attendance Performance',
        text: `Overall attendance rate is ${data.metrics.attendanceRate.toFixed(1)}%. ${data.metrics.attendanceRate >= 75 ? 'Excellent performance!' : data.metrics.attendanceRate >= 50 ? 'Good, but room for improvement.' : 'Needs attention - consider student engagement initiatives.'}`
      },
      {
        title: 'Revenue Optimization',
        text: `Average revenue per meal is ${formatCurrency(data.metrics.revenuePerMeal)}. Total revenue for the period: ${formatCurrency(data.metrics.totalRevenue)}.`
      },
      {
        title: 'Meal Preference',
        text: `${data.mealDistribution.lunch > data.mealDistribution.dinner ? 'Lunch' : 'Dinner'} is more popular (${Math.max(data.mealDistribution.lunchPercentage, data.mealDistribution.dinnerPercentage).toFixed(1)}%). Consider optimizing menu for peak meal times.`
      },
      {
        title: 'Student Engagement',
        text: `${data.metrics.activeStudents} out of ${data.metrics.totalStudents} students are active (${((data.metrics.activeStudents / data.metrics.totalStudents) * 100).toFixed(1)}%). ${data.perfectAttendanceStudents.length} students have perfect attendance.`
      },
      {
        title: 'Leave Management',
        text: `${data.leaveAnalysis.totalLeaveDays} leave days approved for ${data.leaveAnalysis.studentsOnLeave} students. Average ${data.leaveAnalysis.studentsOnLeave > 0 ? (data.leaveAnalysis.totalLeaveDays / data.leaveAnalysis.studentsOnLeave).toFixed(1) : '0'} days per student.`
      },
      {
        title: 'Operational Efficiency',
        text: `Peak day: ${formatDate(data.peakDay.date)} with ${data.peakDay.meals} meals. Lowest: ${formatDate(data.lowDay.date)} with ${data.lowDay.meals} meals. Plan resources accordingly.`
      }
    ]

    insights.forEach((insight, index) => {
      const insightY = yPosition + (index * 28)
      
      // Card background
      doc.setFillColor(SUCCESS[0], SUCCESS[1], SUCCESS[2])
      doc.setGState(doc.GState({ opacity: 0.05 }))
      doc.roundedRect(15, insightY, pageWidth - 30, 25, 3, 3, 'F')
      doc.setGState(doc.GState({ opacity: 1 }))
      
      doc.setDrawColor(SUCCESS[0], SUCCESS[1], SUCCESS[2])
      doc.setLineWidth(0.5)
      doc.roundedRect(15, insightY, pageWidth - 30, 25, 3, 3, 'D')
      
      // Title
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
      doc.text(insight.title, 20, insightY + 8)
      
      // Text
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2])
      const lines = doc.splitTextToSize(insight.text, pageWidth - 50)
      doc.text(lines, 20, insightY + 15)
    })

    // ===== FOOTER (All Pages) =====
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      
      const footerY = pageHeight - 20
      
      doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
      doc.setLineWidth(0.8)
      doc.line(15, footerY - 8, pageWidth - 15, footerY - 8)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
      doc.text('GOKUL MESS MANAGEMENT SYSTEM', pageWidth / 2, footerY - 2, { align: 'center' })
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2])
      doc.text('Email: gokul.mess.alandi@gmail.com', pageWidth / 2, footerY + 3, { align: 'center' })
      
      doc.setFontSize(7)
      doc.setFont('helvetica', 'italic')
      doc.text('Confidential - For Owner Use Only', pageWidth / 2, footerY + 8, { align: 'center' })
      
      // Page number
      const pageNumX = pageWidth - 25
      doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2])
      doc.roundedRect(pageNumX, footerY - 4, 18, 8, 2, 2, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2])
      doc.text(`${i}/${pageCount}`, pageNumX + 9, footerY + 1, { align: 'center' })
    }

    // Save PDF
    const safeLabel = sanitizeFileNameComponent(data.period.label)
    const datePart = new Date().toISOString().split('T')[0]
    const fileName = `Gokul_Mess_Analytics_${safeLabel}_${datePart}.pdf`
    doc.save(fileName)
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to generate analytics report. Please try again.')
  }
}

