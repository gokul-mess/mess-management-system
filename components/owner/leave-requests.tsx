'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, CheckCircle, XCircle, Clock, User, AlertCircle } from 'lucide-react'

// Minimum leave days required to trigger a subscription extension
const MIN_DAYS_FOR_EXTENSION = 4

interface LeaveRequest {
  leave_id: string
  user_id: string
  start_date: string
  end_date: string
  is_approved: boolean
  created_at: string
  student_name: string
  student_short_id: number
  days: number
}

/** Parse a YYYY-MM-DD date string as local midnight — avoids timezone shifts */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Inclusive day count between two YYYY-MM-DD strings, timezone-safe */
function countDays(startStr: string, endStr: string): number {
  const start = parseLocalDate(startStr)
  const end = parseLocalDate(endStr)
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1
}

export function LeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')
  const supabase = createClient()

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch all leaves excluding rejected ones
      // A leave is rejected if: rejection_reason IS NOT NULL OR owner_rejected = true
      // So we want: rejection_reason IS NULL AND owner_rejected = false
      const { data, error: fetchError } = await supabase
        .from('leaves')
        .select('*, users(full_name, unique_short_id)')
        .is('rejection_reason', null)
        .eq('owner_rejected', false)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const mapped: LeaveRequest[] = (data || []).map((r) => ({
        leave_id: r.leave_id,
        user_id: r.user_id,
        start_date: r.start_date,
        end_date: r.end_date,
        is_approved: r.is_approved,
        created_at: r.created_at,
        student_name: (r.users as { full_name: string; unique_short_id: number })?.full_name ?? 'Unknown',
        student_short_id: (r.users as { full_name: string; unique_short_id: number })?.unique_short_id ?? 0,
        days: countDays(r.start_date, r.end_date),
      }))
      setRequests(mapped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave requests')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  /**
   * Approve a leave request.
   *
   * Business rule: extend mess_periods.end_date only if leave >= 4 days.
   * Uses the atomic DB function `extend_mess_period` to prevent race conditions
   * when two approvals happen simultaneously.
   */
  const handleApprove = async (req: LeaveRequest) => {
    setProcessingId(req.leave_id)
    setError(null)
    try {
      // 1. Mark leave as approved
      const { error: approveError } = await supabase
        .from('leaves')
        .update({ is_approved: true })
        .eq('leave_id', req.leave_id)
      if (approveError) throw approveError

      // 2. Extend subscription atomically — only if leave >= 4 days
      if (req.days >= MIN_DAYS_FOR_EXTENSION) {
        const { error: rpcError } = await supabase.rpc('extend_mess_period', {
          p_user_id: req.user_id,
          p_days: req.days,
        })
        if (rpcError) throw new Error(`Failed to extend subscription: ${rpcError.message}`)
      }

      await fetchRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve leave')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (leaveId: string) => {
    setProcessingId(leaveId)
    setError(null)
    try {
      // Use the reject_leave_request RPC function instead of DELETE
      // This marks the leave as rejected without deleting data
      const { error: rejectError } = await supabase.rpc('reject_leave_request', {
        p_leave_id: leaveId,
        p_rejection_reason: 'Rejected by owner'
      })
      if (rejectError) throw rejectError
      await fetchRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject leave')
    } finally {
      setProcessingId(null)
    }
  }

  const filtered = requests.filter(r => {
    if (filter === 'pending') return !r.is_approved
    if (filter === 'approved') return r.is_approved
    return true
  })

  const pendingCount = requests.filter(r => !r.is_approved).length

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-purple-400/30 shadow-xl">
            <Calendar className="w-8 h-8 text-purple-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Leave Requests</h2>
            <p className="text-slate-300 text-sm">
              {pendingCount > 0 ? `${pendingCount} pending approval` : 'All caught up'}
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Leave requests with <span className="font-semibold">{MIN_DAYS_FOR_EXTENSION} or more days</span> will automatically extend the student&apos;s subscription end date upon approval.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Action failed</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-white dark:bg-zinc-900 border border-border hover:bg-accent'
            }`}
          >
            {f === 'pending'
              ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}`
              : f === 'approved' ? 'Approved' : 'All'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground font-medium">
              No {filter === 'all' ? '' : filter} leave requests
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((req, i) => (
              <div
                key={req.leave_id}
                className="p-5 hover:bg-accent/30 transition-all duration-200 animate-in slide-in-from-left-2"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      req.is_approved
                        ? 'bg-green-100 dark:bg-green-950/30'
                        : 'bg-yellow-100 dark:bg-yellow-950/30'
                    }`}>
                      {req.is_approved
                        ? <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        : <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold text-sm">{req.student_name}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                          #{req.student_short_id}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {parseLocalDate(req.start_date).toLocaleDateString('en-IN')}
                        {' → '}
                        {parseLocalDate(req.end_date).toLocaleDateString('en-IN')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          req.days >= MIN_DAYS_FOR_EXTENSION
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {req.days} {req.days === 1 ? 'day' : 'days'}
                          {req.days >= MIN_DAYS_FOR_EXTENSION
                            ? ' · will extend subscription'
                            : ' · no extension'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.is_approved ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approved
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={processingId === req.leave_id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {processingId === req.leave_id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(req.leave_id)}
                          disabled={processingId === req.leave_id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 text-sm font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
