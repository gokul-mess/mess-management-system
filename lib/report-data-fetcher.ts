/**
 * Centralized report data fetching logic
 * Eliminates duplication between PDF and Excel report generation
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getOverlappingMessPeriod, type MessPeriod } from './mess-period-utils'
import { validateDateRange } from './date-utils'

export interface ReportDataParams {
  supabase: SupabaseClient
  userId: string
  startDate: string
  endDate: string
}

export interface FetchedReportData {
  student: {
    id: string
    full_name: string
    unique_short_id: number
    photo_path: string | null
    created_at: string
  }
  messPeriod: MessPeriod | null
  logs: Array<{
    id: string
    date: string
    meal_type: string
    status: string
    created_at: string
    user_id: string
  }>
  leaves: Array<{
    id: string
    start_date: string
    end_date: string
    is_approved: boolean
    user_id: string
  }>
}

/**
 * Fetch all data needed for report generation
 * Centralized to avoid duplication between PDF and Excel generation
 * 
 * @param params - Parameters for data fetching
 * @returns Complete report data
 * @throws Error if data fetching fails
 */
export async function fetchReportData(
  params: ReportDataParams
): Promise<FetchedReportData> {
  const { supabase, userId, startDate, endDate } = params

  // Validate date range
  validateDateRange(startDate, endDate)

  // Fetch student profile
  const { data: studentData, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error('Failed to load student profile data')
  }

  if (!studentData) {
    throw new Error('Student not found')
  }

  // Fetch mess period that overlaps with report date range
  const messPeriod = await getOverlappingMessPeriod(
    supabase,
    userId,
    startDate,
    endDate
  )

  // Fetch meal logs for the period
  const { data: logsData, error: logsError } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (logsError) {
    throw new Error('Failed to load attendance data')
  }

  if (!logsData || logsData.length === 0) {
    throw new Error('No attendance data found for the selected period')
  }

  // Fetch approved leaves for the period
  const { data: leavesData, error: leavesError } = await supabase
    .from('leaves')
    .select('*')
    .eq('user_id', userId)
    .eq('is_approved', true)
    .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`)

  if (leavesError) {
    console.error('Error fetching leaves:', leavesError)
    // Don't throw - leaves are optional
  }

  return {
    student: {
      id: studentData.id,
      full_name: studentData.full_name || 'Student',
      unique_short_id: studentData.unique_short_id || 0,
      photo_path: studentData.photo_path ?? null,
      created_at: studentData.created_at
    },
    messPeriod,
    logs: logsData,
    leaves: leavesData || []
  }
}

/**
 * Transform fetched data for PDF report format
 */
export function transformForPDFReport(
  data: FetchedReportData,
  dateRange: { start: string; end: string },
  includeDetailedTable: boolean,
  periodType: string
) {
  return {
    student: {
      id: data.student.id,
      full_name: data.student.full_name,
      unique_short_id: data.student.unique_short_id,
      photo_path: data.student.photo_path,
      meal_plan: data.messPeriod?.meal_plan || 'DL'
    },
    messPeriod: data.messPeriod
      ? {
          start_date: data.messPeriod.start_date,
          end_date: data.messPeriod.end_date,
          original_end_date: data.messPeriod.original_end_date
        }
      : null,
    logs: data.logs.map(log => ({
      log_id: log.id,
      date: log.date,
      meal_type: log.meal_type,
      status: log.status || 'VERIFIED',
      created_at: log.created_at
    })),
    leaves: data.leaves,
    dateRange,
    includeDetailedTable,
    isCustomRange: false,
    periodType
  }
}

/**
 * Transform fetched data for Excel report format
 */
export function transformForExcelReport(
  data: FetchedReportData,
  dateRange: { start: string; end: string },
  includeDetailedTable: boolean,
  periodType: string
) {
  return {
    student: {
      full_name: data.student.full_name,
      unique_short_id: data.student.unique_short_id,
      meal_plan: data.messPeriod?.meal_plan || 'DL'
    },
    logs: data.logs.map(log => ({
      date: log.date,
      meal_type: log.meal_type,
      status: log.status || 'VERIFIED',
      created_at: log.created_at
    })),
    leaves: data.leaves,
    messPeriod: data.messPeriod
      ? {
          start_date: data.messPeriod.start_date,
          end_date: data.messPeriod.end_date,
          original_end_date: data.messPeriod.original_end_date
        }
      : null,
    dateRange,
    periodType,
    includeDetailedTable
  }
}
