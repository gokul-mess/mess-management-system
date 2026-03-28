'use client'

import { Button } from '@/components/ui/button'
import { AlertCircle, X, CheckCircle, XCircle, Calendar } from 'lucide-react'

interface ExpiredSubscriptionDialogProps {
  student: {
    id: string
    full_name: string
    unique_short_id: number
  }
  endDate: string
  extraMealsCount: number
  mealType: 'LUNCH' | 'DINNER'
  mealPlan: 'L' | 'D' | 'DL'
  onAllow: () => void
  onCancel: () => void
}

export function ExpiredSubscriptionDialog({
  student,
  endDate,
  extraMealsCount,
  mealType,
  mealPlan,
  onAllow,
  onCancel,
}: ExpiredSubscriptionDialogProps) {
  const formattedDate = new Date(endDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  
  const getMealPlanLabel = (plan: 'L' | 'D' | 'DL') => {
    switch (plan) {
      case 'L': return 'Lunch Only'
      case 'D': return 'Dinner Only'
      case 'DL': return 'Lunch & Dinner'
      default: return plan
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-t-2xl">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30 animate-pulse">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">⚠️ Subscription Expired</h2>
                <p className="text-white/90 text-sm">Student has 0 days remaining</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Student Info */}
          <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Student</p>
                  <p className="text-lg font-bold text-red-900 dark:text-red-100">
                    {student.full_name} <span className="text-sm font-mono">#{student.unique_short_id}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">Meal Type</p>
                  <p className="text-lg font-bold text-red-900 dark:text-red-100">{mealType}</p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-red-200 dark:border-red-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <Calendar className="w-4 h-4" />
                    <p className="text-sm font-medium">
                      Subscription ended on: <span className="font-bold">{formattedDate}</span>
                    </p>
                  </div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-0.5">Expired Plan:</p>
                  <p className="text-sm font-bold text-red-900 dark:text-red-100">
                    {getMealPlanLabel(mealPlan)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Extra Meals Info */}
          {extraMealsCount > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{extraMealsCount}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                    Current Extra Meals (Debt)
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    These will be deducted when student recharges
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Question */}
          <div className="bg-accent/50 rounded-xl p-6 text-center">
            <p className="text-lg font-semibold text-foreground mb-2">
              Do you want to allow this meal as EXTRA?
            </p>
            <p className="text-sm text-muted-foreground">
              Extra meals will be deducted when student recharges their subscription.
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-semibold mb-1">Important:</p>
              <p>
                If you allow this extra meal, it will be tracked as debt. When the student recharges
                (e.g., purchases 30 days), the extra meals will be deducted from the credited days.
              </p>
              {extraMealsCount > 0 && (
                <p className="mt-2">
                  Current debt: <span className="font-bold">{extraMealsCount} meal{extraMealsCount !== 1 ? 's' : ''}</span>
                  {' → '}New debt: <span className="font-bold">{extraMealsCount + 1} meal{extraMealsCount + 1 !== 1 ? 's' : ''}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-accent/50 rounded-b-2xl flex items-center justify-between gap-4">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancel Verification
          </Button>
          <Button
            onClick={onAllow}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-500 hover:from-orange-700 hover:to-red-600"
          >
            <CheckCircle className="w-4 h-4" />
            Allow Extra Meal
          </Button>
        </div>
      </div>
    </div>
  )
}
