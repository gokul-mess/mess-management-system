'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X, CheckCircle, XCircle } from 'lucide-react'

interface MealTypeMismatchDialogProps {
  student: {
    id: string
    full_name: string
    unique_short_id: number
  }
  mealType: 'LUNCH' | 'DINNER'
  studentMealPlan: 'L' | 'D' | 'DL'
  onSelect: (option: 'substitution' | 'deduct_day' | 'cancel') => void
  onClose: () => void
}

export function MealTypeMismatchDialog({
  student,
  mealType,
  studentMealPlan,
  onSelect,
  onClose,
}: MealTypeMismatchDialogProps) {
  const [selectedOption, setSelectedOption] = useState<'substitution' | 'deduct_day' | null>(null)

  const mealPlanText = studentMealPlan === 'L' ? 'LUNCH-ONLY' : 'DINNER-ONLY'
  const originalMeal = studentMealPlan === 'L' ? 'LUNCH' : 'DINNER'

  const handleConfirm = () => {
    if (selectedOption) {
      onSelect(selectedOption)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-t-2xl">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">⚠️ Meal Type Mismatch</h2>
                <p className="text-white/90 text-sm">Action required to proceed</p>
              </div>
            </div>
            <button
              onClick={onClose}
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
          <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-300 font-medium mb-1">Student</p>
                <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                  {student.full_name} <span className="text-sm font-mono">#{student.unique_short_id}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-orange-700 dark:text-orange-300 font-medium mb-1">Subscription</p>
                <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{mealPlanText}</p>
              </div>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="text-center py-4">
            <p className="text-lg text-muted-foreground">
              Student has <span className="font-bold text-orange-600 dark:text-orange-400">{mealPlanText}</span> subscription
              <br />
              but is trying to consume <span className="font-bold text-red-600 dark:text-red-400">{mealType}</span>
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground mb-3">Choose an option:</p>

            {/* Option 1: Substitution */}
            <button
              onClick={() => setSelectedOption('substitution')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedOption === 'substitution'
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20 shadow-lg scale-[1.02]'
                  : 'border-border hover:border-green-300 hover:bg-accent'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selectedOption === 'substitution'
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300'
                }`}>
                  {selectedOption === 'substitution' && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">
                    ✓ Allow and mark today&apos;s {originalMeal} as consumed (substitution)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Student will consume {mealType} using their {originalMeal} quota for today.
                    This will be recorded as a substitution.
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Deduct Day */}
            <button
              onClick={() => setSelectedOption('deduct_day')}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedOption === 'deduct_day'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-lg scale-[1.02]'
                  : 'border-border hover:border-blue-300 hover:bg-accent'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  selectedOption === 'deduct_day'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedOption === 'deduct_day' && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground mb-1">
                    ✓ Allow and deduct 1 extra day from subscription
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Student will consume {mealType} and 1 day will be deducted from their subscription end date.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-accent/50 rounded-b-2xl flex items-center justify-between gap-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancel Verification
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedOption}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm & Proceed
          </Button>
        </div>
      </div>
    </div>
  )
}
