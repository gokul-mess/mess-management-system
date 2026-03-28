'use client'

import { useState, useEffect } from 'react'
import { ManualVerify } from '@/components/owner/manual-verify'
import { Hash, Sparkles, CheckCircle, XCircle, Clock, UserCheck, Calendar, Utensils, AlertTriangle } from 'lucide-react'
import { getTimeAgo } from '@/utils/format'
import { MealPlanBadge } from '@/components/shared/meal-plan-badge'
import { createClient } from '@/lib/supabase/client'
import { markSkippedMeals } from '@/lib/subscription-maintenance'
export { MealPlanBadge } from '@/components/shared/meal-plan-badge'

interface VerificationData {
  name: string
  id: number
  photo: string | null
  mealType: string
  method: string
  timestamp: string
  success: boolean
  mealPlan?: 'L' | 'D' | 'DL'
  daysRemaining?: number
  extraMeals?: number
  substitution?: boolean
  deductedDay?: boolean
  extraMeal?: boolean
}

export function VerifyContent() {
  const [lastVerified, setLastVerified] = useState<VerificationData | null>(null)

  // Mark skipped meals when verify section is opened
  useEffect(() => {
    const checkSkippedMeals = async () => {
      const supabase = createClient()
      await markSkippedMeals(supabase)
    }
    
    checkSkippedMeals()
  }, [])

  const handleVerificationSuccess = (data: unknown) => {
    const verificationData = data as {
      student?: {
        full_name?: string
        unique_short_id?: number
        photo_url?: string | null
      }
      mealType?: string
      method?: string
      messPeriod?: {
        meal_plan?: 'L' | 'D' | 'DL'
        end_date?: string
        extra_meals_count?: number
      }
      substitution?: boolean
      deductedDay?: boolean
      extraMeal?: boolean
    }

    const messPeriod = verificationData.messPeriod
    const daysRemaining = messPeriod?.end_date 
      ? Math.max(0, Math.round((new Date(messPeriod.end_date).getTime() - new Date().getTime()) / 86400000))
      : undefined

    setLastVerified({
      name: verificationData.student?.full_name || 'Unknown',
      id: verificationData.student?.unique_short_id || 0,
      photo: verificationData.student?.photo_url || null,
      mealType: verificationData.mealType || 'UNKNOWN',
      method: verificationData.method === 'OTP' ? 'Parcel OTP' : 'Student ID',
      timestamp: new Date().toISOString(),
      success: true,
      mealPlan: messPeriod?.meal_plan,
      daysRemaining,
      extraMeals: messPeriod?.extra_meals_count,
      substitution: verificationData.substitution,
      deductedDay: verificationData.deductedDay,
      extraMeal: verificationData.extraMeal,
    })
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column - Verification Interface */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-6 lg:p-8 border border-border shadow-sm hover:shadow-lg transition-shadow min-h-[400px] lg:min-h-[600px] flex flex-col order-2 lg:order-1">
          <div className="mb-4 sm:mb-6 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 group hover:scale-110 hover:rotate-12 transition-all duration-300 shadow-lg">
              <Hash className="w-6 h-6 sm:w-8 sm:h-8 text-primary group-hover:animate-pulse" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Manual ID Verification
            </h3>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Enter student&apos;s unique short ID to verify and log meals
            </p>
          </div>
          <div className="flex-1">
            <ManualVerify onSuccess={handleVerificationSuccess} />
          </div>
        </div>

        {/* Right Column - Last Verified Display */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-6 lg:p-8 border border-border shadow-sm min-h-[300px] lg:min-h-[600px] flex flex-col order-1 lg:order-2">
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
              Last Verified
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Most recent meal verification</p>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {lastVerified ? (
              <LastVerifiedCard data={lastVerified} />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mb-3 sm:mb-4 animate-pulse">
                  <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground opacity-50" />
                </div>
                <h4 className="text-base sm:text-lg font-semibold mb-2">No Verifications Yet</h4>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
                  Verified student details will appear here after successful meal verification
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



function LastVerifiedCard({ data }: { data: VerificationData }) {
  return (
    <div className="w-full space-y-4 sm:space-y-6 animate-in slide-in-from-right fade-in duration-500">
      {/* Success Banner */}
      <div
        className={`p-3 sm:p-4 rounded-xl border-2 ${
          data.success
            ? 'bg-green-50 dark:bg-green-900/20 border-green-500/50'
            : 'bg-red-50 dark:bg-red-900/20 border-red-500/50'
        } animate-in slide-in-from-top-2 duration-300`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {data.success ? (
            <>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500 flex-shrink-0">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm sm:text-base text-green-900 dark:text-green-100 truncate">✓ Verification Successful</p>
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-300">Meal logged successfully</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500 flex-shrink-0">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm sm:text-base text-red-900 dark:text-red-100 truncate">✗ Verification Failed</p>
                <p className="text-xs sm:text-sm text-red-700 dark:text-red-300">Please try again</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Special Status Badges */}
      {(data.substitution || data.deductedDay || data.extraMeal) && (
        <div className="flex flex-wrap gap-2">
          {data.substitution && (
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="font-semibold text-orange-900 dark:text-orange-100">Substitution</span>
            </div>
          )}
          {data.deductedDay && (
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-xs sm:text-sm">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-900 dark:text-blue-100">1 Day Deducted</span>
            </div>
          )}
          {data.extraMeal && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs sm:text-sm">
              <Utensils className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="font-semibold text-red-900 dark:text-red-100">Extra Meal (Debt)</span>
            </div>
          )}
        </div>
      )}

      {/* Student Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-accent/50 to-accent/20 p-4 sm:p-6 group hover:shadow-xl transition-all duration-300">
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Student Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-4 border-primary/30 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-300 shadow-2xl">
                {data.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.photo} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl sm:text-4xl font-bold text-primary">{data.name.charAt(0)}</span>
                )}
              </div>
              {data.success && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-in zoom-in duration-500 shadow-lg">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              )}
            </div>

            {/* Student Details */}
            <div className="flex-1 space-y-3 text-center sm:text-left w-full">
              <div>
                <h4 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {data.name}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">ID: #{data.id}</p>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold ${
                    data.mealType === 'LUNCH'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/50'
                      : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/50'
                  } group-hover:scale-105 transition-transform`}
                >
                  {data.mealType}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 group-hover:scale-105 transition-transform">
                  {data.method}
                </span>
              </div>

              {/* Subscription Info */}
              {data.mealPlan && (
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-muted-foreground">Plan:</span>
                    <MealPlanBadge plan={data.mealPlan} />
                  </div>
                  {data.daysRemaining !== undefined && (
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        <span className="font-bold text-foreground">{data.daysRemaining}</span> days remaining
                      </span>
                    </div>
                  )}
                  {data.extraMeals !== undefined && data.extraMeals > 0 && (
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Utensils className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs sm:text-sm text-orange-700 dark:text-orange-300">
                        <span className="font-bold">{data.extraMeals}</span> extra meal{data.extraMeals !== 1 ? 's' : ''} (debt)
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {new Date(data.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(data.timestamp)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
