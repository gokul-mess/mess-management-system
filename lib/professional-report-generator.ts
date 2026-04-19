'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Chart, ChartConfiguration, registerables } from 'chart.js'
import { CONSUMED_STATUSES, LUNCH_CUTOFF_HOUR, DINNER_CUTOFF_HOUR } from '@/lib/report-constants'
import { toIST, getISTDateString } from '@/lib/date-utils'
import { calculateLeaveDaysWithIntegrity } from '@/lib/leave-calculator'

// Register Chart.js components
Chart.register(...registerables)

/* eslint-disable @typescript-eslint/no-explicit-any */
// Chart.js plugin types require 'any' for flexibility

interface ReportData {
  student: {
    id: string
    full_name: string
    unique_short_id: number
    photo_path?: string | null
    meal_plan?: string
  }
  messPeriod?: {
    start_date: string
    end_date: string
    original_end_date: string | null
  } | null
  logs: Array<{
    log_id: string
    date: string
    meal_type: string
    status: string
    created_at: string
  }>
  leaves?: Array<{
    id: string
    start_date: string
    end_date: string
    is_approved: boolean
  }>
  dateRange: {
    start: string
    end: string
  }
  includeDetailedTable: boolean
  isCustomRange?: boolean
  periodType?: string // e.g., "Current Mess Month", "Previous Mess Month", etc.
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

// Helper to create chart as base64 image
async function createChartImage(config: ChartConfiguration, width: number, height: number): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      resolve('')
      return
    }

    const chart = new Chart(ctx, config)
    
    setTimeout(() => {
      const base64 = canvas.toDataURL('image/png')
      chart.destroy()
      resolve(base64)
    }, 300)
  })
}

export async function generateProfessionalReport(data: ReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  // Get current date/time in IST for filtering future dates
  const now = new Date()
  const todayDateKey = getISTDateString(now)

  // Create a set of dates where meals were consumed (from logs in report period)
  const consumedDatesInPeriod = new Set<string>()
  data.logs.forEach(log => {
    const statusUpper = (log.status || '').toUpperCase()
    if (CONSUMED_STATUSES.includes(statusUpper as typeof CONSUMED_STATUSES[number])) {
      consumedDatesInPeriod.add(getISTDateString(log.date))
    }
  })

  // Determine which mess period to show in Leave Extension Summary
  // Find the mess period that contains the report start date
  const selectedMessPeriod = data.messPeriod
  
  // If we have a report date range, find the mess period that overlaps with it
  // const reportPeriodStart = toIST(data.dateRange.start)
  // const reportPeriodEnd = toIST(data.dateRange.end)
  
  // The messPeriod passed might be the active one, but we need the one for the selected report period
  // For now, we'll use the passed messPeriod, but calculate leaves only for that specific period
  
  const messPeriodStart = selectedMessPeriod?.start_date 
    ? toIST(selectedMessPeriod.start_date)
    : null
  
  const messPeriodEnd = selectedMessPeriod?.end_date 
    ? toIST(selectedMessPeriod.end_date)
    : null
  
  const messPeriodOriginalEnd = selectedMessPeriod?.original_end_date
    ? toIST(selectedMessPeriod.original_end_date)
    : null
  
  // Calculate leave statistics for Leave Extension Summary (all approved leaves in the selected mess period)
  // Exclude days where student consumed any meal (integrity check)
  let totalLeaveDaysOverall = 0
  
  if (messPeriodStart && messPeriodEnd && data.leaves && data.leaves.length > 0) {
    const { totalLeaveDays } = calculateLeaveDaysWithIntegrity(
      data.leaves,
      consumedDatesInPeriod,
      messPeriodStart.toISOString().split('T')[0],
      messPeriodEnd.toISOString().split('T')[0]
    )
    totalLeaveDaysOverall = totalLeaveDays
  }

  // Calculate leave days/meals WITHIN the report period for statistics
  // Exclude days where student consumed any meal (integrity check)
  let leaveDaysInPeriod = 0
  
  // Also track past leave meals separately for skipped calculation
  let pastLeaveMeals = 0
  
  const reportStartDate = toIST(data.dateRange.start)
  const reportEndDate = toIST(data.dateRange.end)
  
  const studentMealPlan = data.student.meal_plan || 'DL'
  const studentMealsPerDay = studentMealPlan === 'DL' ? 2 : 1
  
  // Create a set of dates where student consumed ANY meal
  const consumedDates = new Set<string>()
  data.logs.forEach(log => {
    const statusUpper = (log.status || '').toUpperCase()
    if (CONSUMED_STATUSES.includes(statusUpper as typeof CONSUMED_STATUSES[number])) {
      consumedDates.add(getISTDateString(log.date))
    }
  })
  
  if (data.leaves && data.leaves.length > 0) {
    const { totalLeaveDays } = calculateLeaveDaysWithIntegrity(
      data.leaves,
      consumedDates,
      data.dateRange.start,
      data.dateRange.end
    )
    leaveDaysInPeriod = totalLeaveDays
    
    // Calculate past leave meals for skipped calculation
    data.leaves.forEach(leave => {
      if (leave.is_approved === true) {
        const leaveStart = toIST(leave.start_date)
        const leaveEnd = toIST(leave.end_date)
        
        const periodStart = leaveStart > reportStartDate ? leaveStart : reportStartDate
        const periodEnd = leaveEnd < reportEndDate ? leaveEnd : reportEndDate
        
        if (periodStart <= periodEnd) {
          const leaveDate = new Date(periodStart)
          
          while (leaveDate <= periodEnd) {
            const dateKey = getISTDateString(leaveDate)
            
            // Only count as leave day if NO meal was consumed on that date
            if (!consumedDates.has(dateKey)) {
              // Also count past leave meals separately
              if (dateKey <= todayDateKey) {
                pastLeaveMeals += studentMealsPerDay
              }
            }
            
            leaveDate.setDate(leaveDate.getDate() + 1)
          }
        }
      }
    })
  }

  // Calculate statistics for the REPORT PERIOD
  // Use FULL report period for total meals calculation
  const startDateObj = toIST(data.dateRange.start)
  const endDateObj = toIST(data.dateRange.end)
  
  // Calculate total days for the ENTIRE report period
  const startOfPeriod = new Date(startDateObj)
  startOfPeriod.setHours(0, 0, 0, 0)
  const endOfPeriod = new Date(endDateObj)
  endOfPeriod.setHours(23, 59, 59, 999)
  
  const totalDays = Math.floor((endOfPeriod.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  // Use consistent meal plan - default to DL if not set
  const mealPlan = data.student.meal_plan || 'DL'
  const mealsPerDay = mealPlan === 'DL' ? 2 : 1
  const expectedMeals = totalDays * mealsPerDay
  
  // Count only CONSUMED/VERIFIED/TAKEN meals (only past dates)
  let mealsTaken = 0
  data.logs.forEach(log => {
    const logDateKey = getISTDateString(log.date)
    if (logDateKey <= todayDateKey) {
      const statusUpper = (log.status || '').toUpperCase()
      if (CONSUMED_STATUSES.includes(statusUpper as typeof CONSUMED_STATUSES[number])) {
        mealsTaken++
      }
    }
  })
  
  // Calculate expected meals for PAST dates only (for skipped calculation)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const effectiveEndForSkipped = endDateObj > todayEnd ? todayEnd : endDateObj
  const pastDays = Math.floor((effectiveEndForSkipped.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const pastExpectedMeals = pastDays * mealsPerDay
  
  // Meals skipped = past expected meals - meals taken - past leave meals
  const mealsSkipped = Math.max(0, pastExpectedMeals - mealsTaken - pastLeaveMeals)
  
  // Attendance rate is calculated based on past expected meals to align with mealsTaken (past dates only)
  const attendanceRate = pastExpectedMeals > 0 ? ((mealsTaken / pastExpectedMeals) * 100).toFixed(1) : '0'

  // Count lunch and dinner (only consumed meals, only past dates)
  let lunchCount = 0
  let dinnerCount = 0
  data.logs.forEach(log => {
    const logDateKey = getISTDateString(log.date)
    // Only count past dates
    if (logDateKey <= todayDateKey) {
      const statusUpper = (log.status || '').toUpperCase()
      const mealTypeUpper = (log.meal_type || '').toUpperCase()
      if (CONSUMED_STATUSES.includes(statusUpper as typeof CONSUMED_STATUSES[number])) {
        if (mealTypeUpper === 'LUNCH') lunchCount++
        if (mealTypeUpper === 'DINNER') dinnerCount++
      }
    }
  })

  // Weekly and monthly data (only past dates)
  const weeklyData: { [key: string]: number } = {}
  const monthlyData: { [key: string]: number } = {}
  
  data.logs.forEach(log => {
    const logDateKey = getISTDateString(log.date)
    if (logDateKey <= todayDateKey) {
      const date = toIST(log.date)
      
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = getISTDateString(weekStart)
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
    }
  })

  let yPos = 0

  // ===== PAGE 1: DASHBOARD =====
  
  // Modern Gradient Header with Pattern
  const headerHeight = 50
  
  // Single light green background (no partition)
  doc.setFillColor(46, 125, 50) // Light green only
  doc.rect(0, 0, pageWidth, headerHeight, 'F')
  
  // Decorative circles pattern in background
  doc.setFillColor(255, 255, 255)
  doc.setGState(doc.GState({ opacity: 0.05 }))
  for (let i = 0; i < 8; i++) {
    doc.circle(i * 30 - 10, 10, 25, 'F')
    doc.circle(i * 30 + 5, 35, 20, 'F')
  }
  doc.setGState(doc.GState({ opacity: 1 }))
  
  // Golden accent bar at bottom of header
  doc.setFillColor(249, 168, 37)
  doc.rect(0, headerHeight - 4, pageWidth, 4, 'F')
  
  // Simple & Attractive Logo - 'G' with decorative circle
  const logoX = 22
  const logoY = 22
  const logoSize = 20
  
  // Outer decorative ring - golden
  doc.setDrawColor(249, 168, 37)
  doc.setLineWidth(2.5)
  doc.circle(logoX, logoY, logoSize / 2, 'D')
  
  // Inner circle - white fill
  doc.setFillColor(255, 255, 255)
  doc.circle(logoX, logoY, logoSize / 2 - 2, 'F')
  
  // Inner decorative ring - green
  doc.setDrawColor(46, 125, 50)
  doc.setLineWidth(1.5)
  doc.circle(logoX, logoY, logoSize / 2 - 3.5, 'D')
  
  // Center circle - green fill
  doc.setFillColor(46, 125, 50)
  doc.circle(logoX, logoY, logoSize / 2 - 4.5, 'F')
  
  // Letter "G" in center - white, bold
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('G', logoX, logoY + 2, { align: 'center' })
  
  // Small decorative dots around the circle (4 corners)
  doc.setFillColor(249, 168, 37)
  const dotDistance = logoSize / 2 + 3
  doc.circle(logoX - dotDistance * 0.7, logoY - dotDistance * 0.7, 1.2, 'F') // Top left
  doc.circle(logoX + dotDistance * 0.7, logoY - dotDistance * 0.7, 1.2, 'F') // Top right
  doc.circle(logoX - dotDistance * 0.7, logoY + dotDistance * 0.7, 1.2, 'F') // Bottom left
  doc.circle(logoX + dotDistance * 0.7, logoY + dotDistance * 0.7, 1.2, 'F') // Bottom right
  
  // Company Name with proper styling
  const textStartX = logoX + logoSize + 8
  const textY = logoY - 4
  
  // "GOKUL MESS" - Large, bold, white
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('GOKUL MESS', textStartX, textY)
  
  // Subtitle - "Student Meal Consumption Report"
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(240, 240, 240)
  doc.text('Student Meal Consumption Report', textStartX, textY + 8)
  
  // Small tagline
  doc.setFontSize(7.5)
  doc.setTextColor(249, 168, 37)
  doc.text('• Excellence in Meal Management •', textStartX, textY + 14)
  
  // Right side - Professional Report Badge (larger text)
  const badgeX = pageWidth - 38
  const badgeY = logoY
  
  // Badge outer border - golden
  doc.setDrawColor(249, 168, 37)
  doc.setLineWidth(1.5)
  doc.setFillColor(255, 255, 255)
  doc.setGState(doc.GState({ opacity: 0.95 }))
  doc.roundedRect(badgeX - 16, badgeY - 10, 38, 20, 4, 4, 'FD')
  doc.setGState(doc.GState({ opacity: 1 }))
  
  // Inner decorative border
  doc.setDrawColor(249, 168, 37)
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
  
  // Badge text - LARGER SIZE
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(46, 125, 50)
  doc.text('OFFICIAL', badgeX + 2, badgeY - 1.5, { align: 'left' })
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Report', badgeX + 2, badgeY + 4.5, { align: 'left' })
  
  // Small decorative corner accents on badge
  doc.setDrawColor(249, 168, 37)
  doc.setLineWidth(1)
  // Top left
  doc.line(badgeX - 14, badgeY - 8, badgeX - 11, badgeY - 8)
  doc.line(badgeX - 14, badgeY - 8, badgeX - 14, badgeY - 5)
  // Bottom right
  doc.line(badgeX + 19, badgeY + 8, badgeX + 16, badgeY + 8)
  doc.line(badgeX + 19, badgeY + 8, badgeX + 19, badgeY + 5)
  
  // Decorative corner elements
  doc.setDrawColor(249, 168, 37)
  doc.setLineWidth(2)
  // Top left corner
  doc.line(0, 0, 15, 0)
  doc.line(0, 0, 0, 15)
  // Top right corner
  doc.line(pageWidth - 15, 0, pageWidth, 0)
  doc.line(pageWidth, 0, pageWidth, 15)
  
  yPos = headerHeight + 10

  // Student Information Card
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(46, 125, 50)
  doc.setLineWidth(0.8)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 52, 4, 4, 'FD')
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('STUDENT NAME', margin + 5, yPos + 8)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(33, 33, 33)
  doc.text(data.student.full_name, margin + 5, yPos + 15)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('STUDENT ID', margin + 5, yPos + 24)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(46, 125, 50)
  doc.text(`${data.student.unique_short_id}`, margin + 5, yPos + 31)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('MEAL PLAN', margin + 5, yPos + 40)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(33, 33, 33)
  const mealPlanText = data.student.meal_plan === 'DL' ? 'Lunch & Dinner' : 
                       data.student.meal_plan === 'L' ? 'Lunch Only' : 
                       data.student.meal_plan === 'D' ? 'Dinner Only' : 'Not Set'
  doc.text(mealPlanText, margin + 5, yPos + 47)
  
  doc.setDrawColor(224, 224, 224)
  doc.setLineWidth(0.5)
  doc.line(pageWidth / 2, yPos + 5, pageWidth / 2, yPos + 47)
  
  const startDate = toIST(data.dateRange.start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const endDate = toIST(data.dateRange.end).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const genDate = toIST(new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  const periodLabel = data.periodType ? `REPORT PERIOD (${data.periodType})` : 'REPORT PERIOD'
  doc.text(periodLabel, pageWidth / 2 + 5, yPos + 8)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(33, 33, 33)
  doc.text(`${startDate} to ${endDate}`, pageWidth / 2 + 5, yPos + 15)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('GENERATED ON', pageWidth / 2 + 5, yPos + 24)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(33, 33, 33)
  doc.text(genDate, pageWidth / 2 + 5, yPos + 31)
  
  if (messPeriodStart && messPeriodEnd) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 100, 100)
    doc.text('SUBSCRIPTION PERIOD', pageWidth / 2 + 5, yPos + 40)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(33, 33, 33)
    const subStart = messPeriodStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    const subEnd = messPeriodEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    doc.text(`${subStart} to ${subEnd}`, pageWidth / 2 + 5, yPos + 47)
  }
  
  yPos += 62

  // Summary Cards
  const cardWidth = (pageWidth - 2 * margin - 12) / 4
  const cardHeight = 32
  const cards = [
    { label: 'Total Meals (Meals)', value: expectedMeals, color: [33, 150, 243], icon: '📊' },
    { label: 'Meals Taken (Meals)', value: mealsTaken, color: [76, 175, 80], icon: '✓' },
    { label: 'Meals Skipped (Meals)', value: mealsSkipped, color: [244, 67, 54], icon: '✗' },
    { label: 'Approved Leave (Days)', value: leaveDaysInPeriod, color: [255, 152, 0], icon: '🏖' }
  ]
  
  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + 4)
    
    doc.setFillColor(card.color[0], card.color[1], card.color[2])
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F')
    
    doc.setFillColor(255, 255, 255)
    doc.setGState(doc.GState({ opacity: 0.2 }))
    doc.roundedRect(x, yPos, cardWidth, cardHeight * 0.655, 3, 3, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
    
    // Decorative line just above the label
    doc.setFillColor(255, 255, 255)
    doc.setGState(doc.GState({ opacity: 0.3 }))
    doc.rect(x + 3, yPos + 21, cardWidth - 6, 0.5, 'F')
    doc.setGState(doc.GState({ opacity: 1 }))
    
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(card.value.toString(), x + cardWidth / 2, yPos + 16, { align: 'center' })
    
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(card.label.toUpperCase(), x + cardWidth / 2, yPos + 26, { align: 'center' })
  })
  
  yPos += cardHeight + 12

  // Attendance Rate
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 22, 3, 3, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(66, 66, 66)
  doc.text('Meal Attendance Rate', margin + 5, yPos + 8)
  
  doc.setFontSize(20)
  doc.setTextColor(46, 125, 50)
  doc.text(`${attendanceRate}%`, margin + 5, yPos + 17)
  
  const barX = margin + 65
  const barWidth = pageWidth - 2 * margin - 70
  const barY = yPos + 9
  
  doc.setFillColor(224, 224, 224)
  doc.roundedRect(barX, barY, barWidth, 9, 4.5, 4.5, 'F')
  
  const progressWidth = (barWidth * parseFloat(attendanceRate)) / 100
  const progressColor = parseFloat(attendanceRate) >= 75 ? [76, 175, 80] : parseFloat(attendanceRate) >= 50 ? [255, 152, 0] : [244, 67, 54]
  doc.setFillColor(progressColor[0], progressColor[1], progressColor[2])
  doc.roundedRect(barX, barY, progressWidth, 9, 4.5, 4.5, 'F')
  
  yPos += 30

  // Charts Section Header
  doc.setFillColor(46, 125, 50)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 12, 3, 3, 'F')
  
  doc.setFillColor(249, 168, 37)
  doc.rect(margin + 2, yPos + 2, 4, 8, 'F')
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('ANALYTICS DASHBOARD', margin + 10, yPos + 8)
  
  yPos += 17

  // Generate Charts
  const chartWidth = (pageWidth - 2 * margin - 6) / 2
  const chartHeight = 55
  const chartPixelWidth = 450
  const chartPixelHeight = 280

  
  // Chart 1: Meal Attendance Overview
  const chart1Config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: ['Meals Taken', 'Meals Skipped'],
      datasets: [{
        label: 'Meals',
        data: [mealsTaken, mealsSkipped],
        backgroundColor: ['rgba(76, 175, 80, 0.8)', 'rgba(244, 67, 54, 0.8)'],
        borderColor: ['#4CAF50', '#F44336'],
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Meal Attendance Overview',
          font: { size: 18, weight: 'bold' },
          color: '#333',
          padding: { top: 10, bottom: 15 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#666', font: { size: 12 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        x: {
          ticks: { color: '#666', font: { size: 12 } },
          grid: { display: false }
        }
      }
    },
    plugins: [{
      id: 'customDataLabels',
      afterDatasetsDraw: (chart: any) => {
        const ctx = chart.ctx
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i)
          meta.data.forEach((bar: any, index: number) => {
            const data = dataset.data[index] as number
            ctx.fillStyle = '#000'
            ctx.font = 'bold 16px helvetica'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillText(data.toString(), bar.x, bar.y - 5)
          })
        })
      }
    }]
  }
  
  const chart1Image = await createChartImage(chart1Config, chartPixelWidth, chartPixelHeight)
  if (chart1Image) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(224, 224, 224)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin, yPos, chartWidth, chartHeight, 3, 3, 'FD')
    doc.addImage(chart1Image, 'PNG', margin + 2, yPos + 2, chartWidth - 4, chartHeight - 4)
  }
  
  // Chart 2: Consumed Meal Distribution
  const chart2Config: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels: ['Lunch', 'Dinner'],
      datasets: [{
        data: [lunchCount, dinnerCount],
        backgroundColor: ['rgba(255, 152, 0, 0.8)', 'rgba(33, 150, 243, 0.8)'],
        borderColor: ['#FF9800', '#2196F3'],
        borderWidth: 3
      }]
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { 
            color: '#333', 
            font: { size: 13 },
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        title: {
          display: true,
          text: 'Consumed Meal Distribution',
          font: { size: 18, weight: 'bold' },
          color: '#333',
          padding: { top: 10, bottom: 10 }
        }
      }
    } as any,
    plugins: [{
      id: 'customDataLabels',
      afterDatasetsDraw: (chart: any) => {
        const ctx = chart.ctx
        const dataset = chart.data.datasets[0]
        const meta = chart.getDatasetMeta(0)
        
        meta.data.forEach((arc: any, index: number) => {
          const data = dataset.data[index] as number
          if (data === 0) return
          
          const midAngle = (arc.startAngle + arc.endAngle) / 2
          const x = arc.x + Math.cos(midAngle) * (arc.outerRadius * 0.7)
          const y = arc.y + Math.sin(midAngle) * (arc.outerRadius * 0.7)
          
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 18px helvetica'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(data.toString(), x, y)
        })
      }
    }]
  }
  
  const chart2Image = await createChartImage(chart2Config, chartPixelWidth, chartPixelHeight)
  if (chart2Image) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(224, 224, 224)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin + chartWidth + 6, yPos, chartWidth, chartHeight, 3, 3, 'FD')
    doc.addImage(chart2Image, 'PNG', margin + chartWidth + 8, yPos + 2, chartWidth - 4, chartHeight - 4)
  }
  
  // ===== PAGE 2: WEEKLY & MONTHLY TRENDS =====
  doc.addPage()
  yPos = margin
  
  // Chart 3: Weekly Meal Consumption
  const weeklyLabels = Object.keys(weeklyData).sort().slice(-6)
  const weeklyValues = weeklyLabels.map(key => weeklyData[key])
  
  const chart3Config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: weeklyLabels.map(date => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
      datasets: [{
        label: 'Meals per Week',
        data: weeklyValues,
        borderColor: '#2E7D32',
        backgroundColor: 'rgba(46, 125, 50, 0.15)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#2E7D32',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Weekly Meal Consumption',
          font: { size: 18, weight: 'bold' },
          color: '#333',
          padding: { top: 10, bottom: 15 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#666', font: { size: 12 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        x: {
          ticks: { color: '#666', font: { size: 11 } },
          grid: { display: false }
        }
      }
    },
    plugins: [{
      id: 'customDataLabels',
      afterDatasetsDraw: (chart: any) => {
        const ctx = chart.ctx
        const dataset = chart.data.datasets[0]
        const meta = chart.getDatasetMeta(0)
        
        meta.data.forEach((point: any, index: number) => {
          const data = dataset.data[index] as number
          ctx.fillStyle = '#2E7D32'
          ctx.font = 'bold 14px helvetica'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillText(data.toString(), point.x, point.y - 10)
        })
      }
    }]
  }
  
  const chart3Image = await createChartImage(chart3Config, chartPixelWidth, chartPixelHeight)
  if (chart3Image) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(224, 224, 224)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin, yPos, chartWidth, chartHeight, 3, 3, 'FD')
    doc.addImage(chart3Image, 'PNG', margin + 2, yPos + 2, chartWidth - 4, chartHeight - 4)
  }

  
  // Chart 4: Monthly Meal Trend
  const monthlyLabels = Object.keys(monthlyData).sort()
  const monthlyValues = monthlyLabels.map(key => monthlyData[key])
  
  const chart4Config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: monthlyLabels.map(month => {
        const [year, monthNum] = month.split('-')
        return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
      }),
      datasets: [{
        label: 'Meals per Month',
        data: monthlyValues,
        backgroundColor: 'rgba(249, 168, 37, 0.8)',
        borderColor: '#F9A825',
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Monthly Meal Trend',
          font: { size: 18, weight: 'bold' },
          color: '#333',
          padding: { top: 10, bottom: 15 }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#666', font: { size: 12 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        },
        x: {
          ticks: { color: '#666', font: { size: 11 } },
          grid: { display: false }
        }
      }
    },
    plugins: [{
      id: 'customDataLabels',
      afterDatasetsDraw: (chart: any) => {
        const ctx = chart.ctx
        chart.data.datasets.forEach((dataset: any, i: number) => {
          const meta = chart.getDatasetMeta(i)
          meta.data.forEach((bar: any, index: number) => {
            const data = dataset.data[index] as number
            ctx.fillStyle = '#000'
            ctx.font = 'bold 16px helvetica'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillText(data.toString(), bar.x, bar.y - 5)
          })
        })
      }
    }]
  }
  
  const chart4Image = await createChartImage(chart4Config, chartPixelWidth, chartPixelHeight)
  if (chart4Image) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(224, 224, 224)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin + chartWidth + 6, yPos, chartWidth, chartHeight, 3, 3, 'FD')
    doc.addImage(chart4Image, 'PNG', margin + chartWidth + 8, yPos + 2, chartWidth - 4, chartHeight - 4)
  }

  yPos += chartHeight + 15

  // Leave Extension Summary
  doc.setFillColor(255, 152, 0)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 12, 3, 3, 'F')
  
  doc.setFillColor(46, 125, 50)
  doc.rect(margin + 2, yPos + 2, 4, 8, 'F')
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('LEAVE EXTENSION SUMMARY', margin + 10, yPos + 8)
  
  yPos += 17

  // Leave Extension Card
  doc.setFillColor(255, 251, 235)
  doc.setDrawColor(255, 152, 0)
  doc.setLineWidth(1.5)
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 4, 4, 'FD')
  
  if (!selectedMessPeriod) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(244, 67, 54)
    doc.text('No mess period found for the selected report period.', margin + 8, yPos + 15)
    doc.setFontSize(9)
    doc.setTextColor(117, 117, 117)
    doc.text('The selected date range does not overlap with any mess subscription period.', margin + 8, yPos + 25)
  } else {
    const originalStartDateStr = messPeriodStart
      ? messPeriodStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'N/A'
    const originalEndDateStr = messPeriodOriginalEnd
      ? messPeriodOriginalEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'N/A'
    const updatedEndDateStr = messPeriodEnd
      ? messPeriodEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'N/A'
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(66, 66, 66)
    doc.text('Approved Leave Days:', margin + 8, yPos + 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`${totalLeaveDaysOverall} days`, margin + 70, yPos + 10)
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Mess Start Date:', margin + 8, yPos + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(originalStartDateStr, margin + 70, yPos + 20)
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Original Mess End Date:', margin + 8, yPos + 30)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(originalEndDateStr, margin + 70, yPos + 30)
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Updated Mess End Date:', margin + 8, yPos + 40)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(76, 175, 80)
    doc.text(updatedEndDateStr, margin + 70, yPos + 40)
  }
  
  yPos += 58
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(117, 117, 117)
  doc.text('Note: This summary shows data for the mess period that overlaps with your selected report period.', pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - 2 * margin })

  yPos += 12
  
  const spaceRemaining = pageHeight - yPos - 25
  const needsNewPage = data.includeDetailedTable && spaceRemaining < 60
  
  if (needsNewPage) {
    doc.addPage()
    yPos = margin
  }


  // Detailed Table
  if (data.includeDetailedTable && data.logs.length > 0) {
    doc.setFillColor(46, 125, 50)
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 12, 3, 3, 'F')
    
    doc.setFillColor(249, 168, 37)
    doc.rect(margin + 2, yPos + 2, 4, 8, 'F')
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('DETAILED MEAL RECORD', margin + 10, yPos + 8)
    
    yPos += 17
    
    const dateMap: { [key: string]: { lunch: string | null; dinner: string | null } } = {}
    
    let tableEndDate = toIST(data.dateRange.end)
    
    if (!data.isCustomRange && data.leaves && data.leaves.length > 0) {
      data.leaves.forEach(leave => {
        if (leave.is_approved === true) {
          const leaveEnd = toIST(leave.end_date)
          if (leaveEnd > tableEndDate) {
            tableEndDate = leaveEnd
          }
        }
      })
    }
    
    const startDate = toIST(data.dateRange.start)
    const currentDate = new Date(startDate)
    
    while (currentDate <= tableEndDate) {
      const dateKey = getISTDateString(currentDate)
      dateMap[dateKey] = { lunch: null, dinner: null }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    const leaveDates = new Set<string>()
    if (data.leaves && data.leaves.length > 0) {
      data.leaves.forEach(leave => {
        if (leave.is_approved === true) {
          const leaveStart = toIST(leave.start_date)
          const leaveEnd = toIST(leave.end_date)
          const leaveDate = new Date(leaveStart)
          
          while (leaveDate <= leaveEnd) {
            leaveDates.add(getISTDateString(leaveDate))
            leaveDate.setDate(leaveDate.getDate() + 1)
          }
        }
      })
    }
    
    data.logs.forEach(log => {
      const dateKey = getISTDateString(log.date)
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = { lunch: null, dinner: null }
      }
      
      const statusUpper = (log.status || '').toUpperCase()
      const mealTypeUpper = (log.meal_type || '').toUpperCase()
      let status: string | null = null
      
      if (CONSUMED_STATUSES.includes(statusUpper as typeof CONSUMED_STATUSES[number])) {
        status = 'TAKEN'
      } else if (statusUpper === 'LEAVE' || statusUpper === 'APPROVED_LEAVE') {
        status = 'LEAVE'
      }
      
      if (status) {
        if (mealTypeUpper === 'LUNCH') {
          dateMap[dateKey].lunch = status
        } else if (mealTypeUpper === 'DINNER') {
          dateMap[dateKey].dinner = status
        }
      }
    })
    
    const mealPlan = data.student.meal_plan || 'DL'
    const mealsPerDay = mealPlan === 'DL' ? 2 : 1
    const currentHour = now.getHours()
    
    Object.keys(dateMap).forEach(dateKey => {
      const dayData = dateMap[dateKey]
      const isApprovedLeaveDate = leaveDates.has(dateKey)
      const hasConsumedMeal = dayData.lunch === 'TAKEN' || dayData.dinner === 'TAKEN'
      
      if (isApprovedLeaveDate && !hasConsumedMeal) {
        if (dayData.lunch === null) dayData.lunch = 'LEAVE'
        if (dayData.dinner === null) dayData.dinner = 'LEAVE'
        return
      }
      
      const isFutureDate = dateKey > todayDateKey
      const isToday = dateKey === todayDateKey
      
      if (mealsPerDay === 2) {
        const isFullDayLeave = dayData.lunch === 'LEAVE' || dayData.dinner === 'LEAVE'
        
        if (isFullDayLeave) {
          if (dayData.lunch === null) dayData.lunch = 'LEAVE'
          if (dayData.dinner === null) dayData.dinner = 'LEAVE'
        } else {
          if (dayData.lunch === null) {
            if (isFutureDate) {
              dayData.lunch = '-'
            } else if (isToday && currentHour < LUNCH_CUTOFF_HOUR) {
              dayData.lunch = '-'
            } else {
              dayData.lunch = 'SKIPPED'
            }
          }
          
          if (dayData.dinner === null) {
            if (isFutureDate) {
              dayData.dinner = '-'
            } else if (isToday && currentHour < DINNER_CUTOFF_HOUR) {
              dayData.dinner = '-'
            } else {
              dayData.dinner = 'SKIPPED'
            }
          }
        }
      } else {
        const mealType = mealPlan === 'L' ? 'lunch' : 'dinner'
        const mealTimeCutoff = mealPlan === 'L' ? LUNCH_CUTOFF_HOUR : DINNER_CUTOFF_HOUR
        
        if (dayData[mealType] === null) {
          if (isFutureDate) {
            dayData[mealType] = '-'
          } else if (isToday && currentHour < mealTimeCutoff) {
            dayData[mealType] = '-'
          } else {
            dayData[mealType] = 'SKIPPED'
          }
        }
      }
    })
    
    const tableData = Object.keys(dateMap)
      .sort()
      .map((dateKey, index) => {
        const [year, month, day] = dateKey.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const dateStr = date.toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        })
        
        const lunch = dateMap[dateKey].lunch || '-'
        const dinner = dateMap[dateKey].dinner || '-'
        
        return [
          (index + 1).toString(),
          dateStr,
          lunch,
          dinner
        ]
      })
    
    autoTable(doc, {
      startY: yPos,
      head: [['Sr.No.', 'Date', 'Lunch', 'Dinner']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [46, 125, 50],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [51, 51, 51],
        halign: 'center',
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 20 },
        1: { halign: 'left', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 30 }
      },
      margin: { left: margin, right: margin, bottom: 25 },
      showFoot: 'never',
      didParseCell: (data) => {
        if (data.section === 'body' && (data.column.index === 2 || data.column.index === 3)) {
          const cellValue = data.cell.text[0]
          if (cellValue === 'TAKEN') {
            data.cell.styles.textColor = [76, 175, 80]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 9
          } else if (cellValue === 'SKIPPED') {
            data.cell.styles.textColor = [244, 67, 54]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 8
          } else if (cellValue === 'LEAVE') {
            data.cell.styles.textColor = [33, 150, 243]
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fontSize = 8
          } else if (cellValue === '-') {
            data.cell.styles.textColor = [189, 189, 189]
          }
        }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 2) {
          doc.setFontSize(8)
          doc.setTextColor(117, 117, 117)
          doc.text(`Page ${data.pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
        }
      }
    })
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const footerY = pageHeight - 18
    
    doc.setDrawColor(224, 224, 224)
    doc.setLineWidth(0.5)
    doc.line(margin, footerY, pageWidth - margin, footerY)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(46, 125, 50)
    doc.text('Gokul Mess Management System', pageWidth / 2, footerY + 5, { align: 'center' })
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(117, 117, 117)
    doc.setFontSize(8)
    doc.text('Email: gokul.mess.alandi@gmail.com', pageWidth / 2, footerY + 10, { align: 'center' })
    
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.text('Generated Automatically by Gokul Mess System', pageWidth / 2, footerY + 14, { align: 'center' })
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY + 8, { align: 'right' })
  }

  // Save PDF
  const safeStudentName = sanitizeFileNameComponent(data.student.full_name)
  const datePart = new Date().toISOString().split('T')[0]
  const fileName = `Gokul_Mess_Report_${safeStudentName}_${datePart}.pdf`
  doc.save(fileName)
}
