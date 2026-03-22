'use client'

import { CheckCircle, XCircle } from 'lucide-react'

export interface FeePayment {
  payment_id: string
  payment_month: string
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

export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

interface FeePaymentStatusProps {
  payments: FeePayment[]
  isLoading: boolean
  error?: string | null
}

export function FeePaymentStatus({ payments, isLoading, error }: FeePaymentStatusProps) {
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
        <p className="text-sm font-medium text-red-700 dark:text-red-400">No payment recorded for this month</p>
      </div>
    )
  }

  const total = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-2">
      {payments.map(p => (
        <div
          key={p.payment_id}
          className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              Installment {p.installment_number} — ₹{p.amount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {p.payment_mode} · {new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {p.note && ` · ${p.note}`}
            </p>
          </div>
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
        </div>
      ))}

      {payments.length >= 2 && (
        <p className="text-center text-xs font-semibold text-green-700 dark:text-green-400 pt-1">
          ✓ Fully Paid — Total ₹{total}
        </p>
      )}

      {payments.length === 1 && (
        <p className="text-center text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg py-2">
          1 of 2 installments paid
        </p>
      )}
    </div>
  )
}
