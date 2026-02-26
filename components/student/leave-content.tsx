'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  History,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeaveContentProps {
  profile: { id: string; full_name?: string } | null
}

export function LeaveContent({ profile }: LeaveContentProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [leaveHistory, setLeaveHistory] = useState<Array<{
    leave_id: string
    start_date: string
    end_date: string
    is_approved: boolean
    created_at: string
  }>>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchLeaveHistory = async () => {
      if (!profile?.id) return
      try {
        const { data, error } = await supabase
          .from('leaves')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10)
        if (error) throw error
        setLeaveHistory(data || [])
      } catch (err) {
        console.error('Error fetching leave history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    fetchLeaveHistory()
  }, [profile?.id, supabase])

  const validateForm = (): string | null => {
    if (!startDate || !endDate) return 'Please select both start and end dates'
    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (start < today) return 'Start date cannot be in the past'
    if (end < start) return 'End date must be after start date'
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 30) return 'Leave duration cannot exceed 30 days'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    const validationError = validateForm()
    if (validationError) { setError(validationError); return }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('leaves')
        .insert({ user_id: profile.id, start_date: startDate, end_date: endDate, is_approved: false })
      if (insertError) throw insertError

      setSuccess(true)
      setStartDate('')
      setEndDate('')

      const { data } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setLeaveHistory(data)

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error submitting leave:', err)
      setError('Failed to submit leave request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    return Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-purple-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-purple-400/30 shadow-xl">
            <Calendar className="w-8 h-8 text-purple-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Leave Request</h2>
            <p className="text-slate-300 text-sm">Request leave for your meal subscription</p>
          </div>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Leave request submitted successfully!</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center animate-pulse">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Request New Leave</h3>
              <p className="text-xs text-muted-foreground">Fill in the details below</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-foreground">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium hover:border-primary/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-bold text-foreground">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium hover:border-primary/50"
                  required
                />
              </div>
            </div>

            {startDate && endDate && calculateDays() > 0 && (
              <div className="relative overflow-hidden rounded-xl p-5 border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 animate-in slide-in-from-top-2 duration-300 group hover:scale-105 transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent animate-pulse" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">Leave Duration</span>
                  </div>
                  <span className="text-3xl font-bold text-primary">
                    {calculateDays()} {calculateDays() === 1 ? 'day' : 'days'}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="relative w-full py-6 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
            >
              {isSubmitting ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-primary/30 animate-pulse" />
                  <span className="relative flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Submit Leave Request
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Leave History */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Leave History</h3>
              <p className="text-xs text-muted-foreground">Your recent leave requests</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : leaveHistory.length > 0 ? (
            leaveHistory.map((leave, index) => (
              <div
                key={leave.leave_id}
                className="p-5 hover:bg-accent/30 transition-all duration-300 animate-in slide-in-from-right-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      leave.is_approved ? 'bg-green-100 dark:bg-green-950/30' : 'bg-yellow-100 dark:bg-yellow-950/30'
                    }`}>
                      {leave.is_approved
                        ? <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        : <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />}
                    </div>
                    <div>
                      <p className="font-bold">
                        {new Date(leave.start_date).toLocaleDateString('en-IN')} - {new Date(leave.end_date).toLocaleDateString('en-IN')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    leave.is_approved
                      ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400'
                  }`}>
                    {leave.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-16 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No leave requests yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
