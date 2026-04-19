'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Utensils,
  User,
  AlertCircle,
  LogOut,
  Hash,
  CreditCard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { parseError } from '@/lib/error-handler'
import { StudentAvatar } from '@/components/shared/student-avatar'
import { FeePaymentStatus, type FeePayment } from '@/components/shared/fee-payment-status'
import { MessCycleTracker } from '@/components/shared/mess-cycle-tracker'
import { getPayableAmount, DEFAULT_PRICING, type MealPlanPricing } from '@/lib/pricing-utils'
import { SETTINGS_ID } from '@/lib/constants'

interface ProfileContentProps {
  profile: {
    id: string
    full_name?: string
    unique_short_id?: number
    photo_path?: string | null
    phone?: string | null
    address?: string | null
    meal_plan?: string | null
    subscription_start_date?: string | null
    subscription_end_date?: string | null
    is_active?: boolean
  } | null
  onSignOut: () => void
}

export function ProfileContent({ profile, onSignOut }: ProfileContentProps) {
  const [feePayments, setFeePayments] = useState<FeePayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [pricing, setPricing] = useState<MealPlanPricing>(DEFAULT_PRICING)
  const [messPeriod, setMessPeriod] = useState<{ id: string; start_date: string; end_date: string; meal_plan?: string | null } | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Fetch pricing, active mess period, and then fee payments
  useEffect(() => {
    if (!profile?.id) return
    Promise.all([
      supabase
        .from('mess_settings')
        .select('lunch_price, dinner_price, both_price')
        .eq('id', SETTINGS_ID)
        .single(),
      supabase
        .from('mess_periods')
        .select('id, start_date, end_date, meal_plan')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .maybeSingle(),
    ]).then(async ([{ data: ps }, { data: mp }]) => {
      if (!isMounted.current) return
      if (ps) {
        setPricing({
          lunch_price: ps.lunch_price ?? DEFAULT_PRICING.lunch_price,
          dinner_price: ps.dinner_price ?? DEFAULT_PRICING.dinner_price,
          both_price: ps.both_price ?? DEFAULT_PRICING.both_price,
        })
      }
      if (mp?.id && mp?.start_date && mp?.end_date) {
        setMessPeriod({ id: mp.id, start_date: mp.start_date, end_date: mp.end_date, meal_plan: mp.meal_plan ?? null })
        setPaymentsLoading(true)
        setPaymentsError(null)
        const { data: payData, error: payErr } = await supabase
          .from('fee_payments')
          .select('*')
          .eq('user_id', profile.id)
          .eq('mess_period_id', mp.id)
          .order('installment_number', { ascending: true })
        if (!isMounted.current) return
        if (payErr) {
          setPaymentsError(parseError(payErr).message)
        } else {
          setFeePayments(payData || [])
        }
        setPaymentsLoading(false)
      } else {
        setPaymentsLoading(false)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-orange-400/30 shadow-xl">
            <User className="w-8 h-8 text-orange-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">My Profile</h2>
            <p className="text-slate-300 text-sm">View your account information</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-yellow-400/10 animate-pulse" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col items-center -mt-16">
            {/* Profile Photo */}
            <div className="relative">
              <div className="w-28 h-28 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-2xl">
                <StudentAvatar
                  photoPath={profile?.photo_path}
                  fullName={profile?.full_name}
                  fallback={<User className="w-14 h-14 text-muted-foreground" />}
                />
              </div>
            </div>

            <h3 className="text-2xl font-bold mt-4">{profile?.full_name || 'Student'}</h3>
            <p className="text-sm text-muted-foreground">Student</p>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold border-2 border-primary/20">
              <Hash className="w-4 h-4" />
              {profile?.unique_short_id || '---'}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="bg-accent/50 border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Profile Information</p>
                  <p className="text-xs text-muted-foreground">Your profile details are managed by the mess owner. Contact them for any updates.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Full Name</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border">
                <p className="font-semibold text-foreground">{profile?.full_name || 'Not set'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Phone Number</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border">
                <p className="font-semibold text-foreground">{profile?.phone || 'Not set'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Address</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border min-h-[80px]">
                <p className="font-semibold text-foreground">{profile?.address || 'Not set'}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Meal Plan</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-primary" />
                  <p className="font-semibold text-foreground">
                    {(() => {
                      const plan = messPeriod?.meal_plan ?? profile?.meal_plan
                      if (plan === 'DL') return 'Lunch & Dinner'
                      if (plan === 'L') return 'Lunch Only'
                      if (plan === 'D') return 'Dinner Only'
                      return 'Not set'
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Fee Payment Section */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Fee Payment</label>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center px-4 py-3 bg-accent/50 border-b border-border">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">
                      {messPeriod
                        ? `${new Date(messPeriod.start_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(messPeriod.end_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <FeePaymentStatus
                    payments={feePayments}
                    isLoading={paymentsLoading}
                    error={paymentsError}
                    totalPayable={(() => {
                      const plan = messPeriod?.meal_plan ?? profile?.meal_plan
                      return plan ? getPayableAmount(plan, pricing) : null
                    })()}
                  />
                </div>
              </div>
            </div>

            {/* Mess Cycle Tracker */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">30-Day Mess Cycle</label>
              <div className="p-4 bg-accent/50 rounded-xl border border-border">
                <MessCycleTracker startDate={messPeriod?.start_date ?? null} />
              </div>
            </div>

          </div>

          <div className="mt-8">
            <Button
              variant="outline"
              className="w-full py-6 text-base font-semibold rounded-xl border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900/50 transition-all group"
              onClick={onSignOut}
            >
              <LogOut className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
