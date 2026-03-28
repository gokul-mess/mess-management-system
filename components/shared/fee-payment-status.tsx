'use client'

import { CheckCircle, XCircle } from 'lucide-react'

export interface FeePayment {
  payment_id: string
  payment_month?: string // Legacy field - kept for backward compatibility
  mess_period_id?: string // New field - links to mess_periods table
  installment_number: number
  amount: number
  payment_mode: 'UPI' | 'CASH'
  paid_at: string
  note?: string
}

export const PAYMENT_SUCCESS_TIMEOUT = 3000 as const
export const MAX_NOTE_LENGTH = 100 as const
export const MIN_AMOUNT = 1 as const
export const MAX_AMOUNT = 99999 as const

interface FeePaymentStatusProps {
  payments: FeePayment[]
  isLoading: boolean
  error?: string | null
  /** Total payable amount for the student's meal plan this month */
  totalPayable?: number | null
}

export function FeePaymentStatus({ payments, isLoading, error, totalPayable }: FeePaymentStatusProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <p className="text-sm font-medium text-red-700 dark:text-red-400">No payment recorded for this period</p>
      </div>
    )
  }

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const remaining = totalPayable != null ? Math.max(0, totalPayable - totalPaid) : null
  const isComplete = remaining === 0 || (totalPayable == null && payments.length >= 2)

  return (
    <div className="space-y-2">
      {payments.map(p => (
        <div
          key={p.payment_id}
          className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              Installment {p.installment_number} — ₹{Number(p.amount).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {p.payment_mode} · {new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {p.note && ` · ${p.note}`}
            </p>
          </div>
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        </div>
      ))}

      {/* Summary */}
      {isComplete ? (
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg py-2.5">
          <CheckCircle className="w-4 h-4" />
          <span>Fully Paid — ₹{totalPaid.toLocaleString('en-IN')}</span>
          {totalPayable != null && totalPayable !== totalPaid && (
            <span className="text-xs text-muted-foreground">/ ₹{totalPayable.toLocaleString('en-IN')}</span>
          )}
        </div>
      ) : remaining != null && remaining > 0 ? (
        <p className="text-center text-xs font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg py-2">
          Paid ₹{totalPaid.toLocaleString('en-IN')} — Remaining ₹{remaining.toLocaleString('en-IN')}
        </p>
      ) : (
        <p className="text-center text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg py-2">
          Paid ₹{totalPaid.toLocaleString('en-IN')} · {payments.length} installment{payments.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
