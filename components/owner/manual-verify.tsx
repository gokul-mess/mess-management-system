'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, Loader2, Package, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { ErrorMessage } from '@/components/ui/error-message'
import { MealTypeMismatchDialog } from './meal-type-mismatch-dialog'
import { ExpiredSubscriptionDialog } from './expired-subscription-dialog'

interface ManualVerifyProps {
  onSuccess?: (data: unknown) => void
}

interface StudentWithSubscription {
  id: string
  full_name: string
  unique_short_id: number
  photo_path: string | null
  is_active: boolean
  mess_periods: Array<{
    id: string
    meal_plan: 'L' | 'D' | 'DL'
    end_date: string
    start_date: string
    extra_meals_count: number
    is_active: boolean
  }>
}

export function ManualVerify({ onSuccess }: ManualVerifyProps) {
  const [verifyMode, setVerifyMode] = useState<'ID' | 'OTP'>('ID')
  const [shortId, setShortId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [showMismatchDialog, setShowMismatchDialog] = useState(false)
  const [showExpiredDialog, setShowExpiredDialog] = useState(false)
  const [pendingStudent, setPendingStudent] = useState<StudentWithSubscription | null>(null)
  const [pendingMealType, setPendingMealType] = useState<'LUNCH' | 'DINNER'>('LUNCH')
  const [pendingAccessMethod, setPendingAccessMethod] = useState<'SELF_ID' | 'PARCEL_OTP'>('SELF_ID')
  const [pendingOtpId, setPendingOtpId] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { loading, error, execute, clearMessages } = useAsyncOperation('Verify Meal')

  const calculateDaysRemaining = (endDate: string): number => {
    const today = new Date().toISOString().split('T')[0]
    const end = new Date(endDate)
    const current = new Date(today)
    return Math.max(0, Math.round((end.getTime() - current.getTime()) / 86400000))
  }

  const quickVerifyById = async () => {
    if (!shortId || shortId.trim() === '') return
    clearMessages()

    await execute(async () => {
      const hour = new Date().getHours()
      const mealType: 'LUNCH' | 'DINNER' = hour < 16 ? 'LUNCH' : 'DINNER'
      const today = new Date().toISOString().split('T')[0]

      // Fetch student with mess_period info
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select(`
          id, full_name, unique_short_id, photo_path, is_active,
          mess_periods!inner(
            id, meal_plan, end_date, start_date, extra_meals_count, is_active
          )
        `)
        .eq('unique_short_id', parseInt(shortId))
        .eq('role', 'STUDENT')
        .eq('mess_periods.is_active', true)
        .single()

      if (studentError || !student) throw new Error('Student not found. Please check the ID.')

      const studentData = student as unknown as StudentWithSubscription
      const messPeriod = studentData.mess_periods[0]

      if (!messPeriod) throw new Error('No active subscription found for this student.')

      // Check if subscription expired
      const daysRemaining = calculateDaysRemaining(messPeriod.end_date)
      if (daysRemaining <= 0) {
        setPendingStudent(studentData)
        setPendingMealType(mealType)
        setPendingAccessMethod('SELF_ID')
        setShowExpiredDialog(true)
        return
      }

      // Validate meal type against meal_plan
      const studentMealPlan = messPeriod.meal_plan || 'DL'
      const isValidMealType = 
        studentMealPlan === 'DL' || 
        (studentMealPlan === 'L' && mealType === 'LUNCH') ||
        (studentMealPlan === 'D' && mealType === 'DINNER')

      if (!isValidMealType) {
        setPendingStudent(studentData)
        setPendingMealType(mealType)
        setPendingAccessMethod('SELF_ID')
        setShowMismatchDialog(true)
        return
      }

      // Check if meal already logged
      const { data: existingLog } = await supabase
        .from('daily_logs')
        .select('log_id')
        .eq('user_id', studentData.id)
        .eq('date', today)
        .eq('meal_type', mealType)
        .maybeSingle()

      if (existingLog) throw new Error(`${mealType} already logged for ${studentData.full_name} today`)

      // Insert meal log
      const { error: insertError } = await supabase
        .from('daily_logs')
        .insert({ 
          user_id: studentData.id, 
          meal_type: mealType, 
          status: 'CONSUMED', 
          access_method: 'SELF_ID' 
        })

      if (insertError) throw insertError

      if (onSuccess) onSuccess({ student: studentData, mealType, messPeriod })

      setTimeout(() => {
        setShortId('')
        if (inputRef.current) inputRef.current.focus()
      }, 1000)
    })
  }

  const handleMismatchOption = async (option: 'substitution' | 'deduct_day' | 'cancel') => {
    setShowMismatchDialog(false)
    
    if (option === 'cancel' || !pendingStudent) {
      setPendingStudent(null)
      return
    }

    await execute(async () => {
      const messPeriod = pendingStudent.mess_periods[0]
      const originalMeal = messPeriod.meal_plan === 'L' ? 'LUNCH' : 'DINNER'

      if (option === 'substitution') {
        // Insert with substitution flag
        const { error: insertError } = await supabase
          .from('daily_logs')
          .insert({
            user_id: pendingStudent.id,
            meal_type: pendingMealType,
            status: 'CONSUMED',
            access_method: pendingAccessMethod,
            is_substitution: true,
            original_meal_type: originalMeal,
            substitution_note: `${messPeriod.meal_plan} student consumed ${pendingMealType} using ${originalMeal} quota`
          })

        if (insertError) throw insertError

        if (pendingOtpId) {
          await supabase.from('parcel_otps').update({ is_used: true }).eq('otp_id', pendingOtpId)
        }

        if (onSuccess) onSuccess({ student: pendingStudent, mealType: pendingMealType, substitution: true, messPeriod })
      } else if (option === 'deduct_day') {
        // Insert meal log
        const { error: insertError } = await supabase
          .from('daily_logs')
          .insert({
            user_id: pendingStudent.id,
            meal_type: pendingMealType,
            status: 'CONSUMED',
            access_method: pendingAccessMethod
          })

        if (insertError) throw insertError

        // Deduct 1 day from subscription
        const { error: deductError } = await supabase.rpc('deduct_subscription_day', {
          p_user_id: pendingStudent.id,
          p_days: 1
        })

        if (deductError) throw deductError

        if (pendingOtpId) {
          await supabase.from('parcel_otps').update({ is_used: true }).eq('otp_id', pendingOtpId)
        }

        if (onSuccess) onSuccess({ student: pendingStudent, mealType: pendingMealType, deductedDay: true, messPeriod })
      }

      setPendingStudent(null)
      setPendingOtpId(null)
      setShortId('')
      setOtpCode('')
      if (inputRef.current) inputRef.current.focus()
    })
  }

  const handleExpiredAllow = async () => {
    setShowExpiredDialog(false)
    
    if (!pendingStudent) return

    await execute(async () => {
      const messPeriod = pendingStudent.mess_periods[0]

      // Insert meal log
      const { error: insertError } = await supabase
        .from('daily_logs')
        .insert({
          user_id: pendingStudent.id,
          meal_type: pendingMealType,
          status: 'CONSUMED',
          access_method: pendingAccessMethod
        })

      if (insertError) throw insertError

      // Increment extra meals count
      const { error: updateError } = await supabase
        .from('mess_periods')
        .update({ 
          extra_meals_count: (messPeriod.extra_meals_count || 0) + 1 
        })
        .eq('id', messPeriod.id)

      if (updateError) throw updateError

      if (pendingOtpId) {
        await supabase.from('parcel_otps').update({ is_used: true }).eq('otp_id', pendingOtpId)
      }

      if (onSuccess) onSuccess({ 
        student: pendingStudent, 
        mealType: pendingMealType, 
        extraMeal: true,
        messPeriod: { ...messPeriod, extra_meals_count: (messPeriod.extra_meals_count || 0) + 1 }
      })

      setPendingStudent(null)
      setPendingOtpId(null)
      setShortId('')
      setOtpCode('')
      if (inputRef.current) inputRef.current.focus()
    })
  }

  const handleExpiredCancel = () => {
    setShowExpiredDialog(false)
    setPendingStudent(null)
    setPendingOtpId(null)
  }

  const quickVerifyByOTP = async () => {
    if (!otpCode || otpCode.trim() === '') return
    clearMessages()

    await execute(async () => {
      const hour = new Date().getHours()
      const mealType: 'LUNCH' | 'DINNER' = hour < 16 ? 'LUNCH' : 'DINNER'
      const today = new Date().toISOString().split('T')[0]

      const { data: otpRecord, error: otpError } = await supabase
        .from('parcel_otps')
        .select(`
          otp_id, user_id, expires_at, is_used,
          users!inner(
            id, full_name, unique_short_id, photo_path, is_active,
            mess_periods!inner(
              id, meal_plan, end_date, start_date, extra_meals_count, is_active
            )
          )
        `)
        .eq('otp_code', otpCode.toUpperCase())
        .eq('is_used', false)
        .eq('users.mess_periods.is_active', true)
        .single()

      if (otpError || !otpRecord) throw new Error('Invalid or expired OTP. Please check the code.')
      if (new Date(otpRecord.expires_at) < new Date()) throw new Error('OTP has expired. Please generate a new one.')

      const studentData = otpRecord.users as unknown as StudentWithSubscription
      const messPeriod = studentData.mess_periods[0]

      if (!messPeriod) throw new Error('No active subscription found for this student.')

      // Check if subscription expired
      const daysRemaining = calculateDaysRemaining(messPeriod.end_date)
      if (daysRemaining <= 0) {
        setPendingStudent(studentData)
        setPendingMealType(mealType)
        setPendingAccessMethod('PARCEL_OTP')
        setPendingOtpId(otpRecord.otp_id)
        setShowExpiredDialog(true)
        return
      }

      // Validate meal type
      const studentMealPlan = messPeriod.meal_plan || 'DL'
      const isValidMealType = 
        studentMealPlan === 'DL' || 
        (studentMealPlan === 'L' && mealType === 'LUNCH') ||
        (studentMealPlan === 'D' && mealType === 'DINNER')

      if (!isValidMealType) {
        setPendingStudent(studentData)
        setPendingMealType(mealType)
        setPendingAccessMethod('PARCEL_OTP')
        setPendingOtpId(otpRecord.otp_id)
        setShowMismatchDialog(true)
        return
      }

      // Check if meal already logged
      const { data: existingLog } = await supabase
        .from('daily_logs')
        .select('log_id')
        .eq('user_id', studentData.id)
        .eq('date', today)
        .eq('meal_type', mealType)
        .maybeSingle()

      if (existingLog) throw new Error(`${mealType} already logged for ${studentData.full_name} today`)

      // Insert meal log
      const { error: insertError } = await supabase
        .from('daily_logs')
        .insert({ 
          user_id: studentData.id, 
          meal_type: mealType, 
          status: 'CONSUMED', 
          access_method: 'PARCEL_OTP' 
        })

      if (insertError) throw insertError

      // Mark OTP as used
      const { error: updateError } = await supabase
        .from('parcel_otps')
        .update({ is_used: true })
        .eq('otp_id', otpRecord.otp_id)

      if (updateError) throw updateError

      if (onSuccess) onSuccess({ student: studentData, mealType, method: 'OTP', messPeriod })

      setTimeout(() => {
        setOtpCode('')
        if (inputRef.current) inputRef.current.focus()
      }, 1000)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      if (verifyMode === 'ID' && shortId) quickVerifyById()
      else if (verifyMode === 'OTP' && otpCode) quickVerifyByOTP()
    }
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-accent/50 rounded-lg">
          <button
            onClick={() => { setVerifyMode('ID'); setOtpCode(''); clearMessages() }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-md font-medium transition-all text-sm sm:text-base ${
              verifyMode === 'ID' ? 'bg-white dark:bg-zinc-900 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span className="hidden sm:inline">Student ID</span>
            <span className="sm:hidden">ID</span>
          </button>
          <button
            onClick={() => { setVerifyMode('OTP'); setShortId(''); clearMessages() }}
            className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-md font-medium transition-all text-sm sm:text-base ${
              verifyMode === 'OTP' ? 'bg-white dark:bg-zinc-900 shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Parcel OTP</span>
            <span className="sm:hidden">OTP</span>
          </button>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          {verifyMode === 'ID' ? (
            <div>
              <label className="block text-sm font-medium mb-2">
                Student ID - Press Enter to Verify
              </label>
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={shortId}
                  onChange={(e) => { setShortId(e.target.value.replace(/\D/g, '')); clearMessages() }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter ID"
                  className="flex-1 min-w-0 px-4 py-3 rounded-lg border-2 border-input bg-background text-center text-2xl sm:text-3xl font-mono tracking-wider focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all"
                  disabled={loading}
                  autoFocus
                />
                <Button
                  onClick={quickVerifyById}
                  disabled={loading || !shortId || shortId.trim() === ''}
                  size="lg"
                  className="px-4 lg:px-6 text-base shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" />
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5 lg:w-6 lg:h-6 lg:mr-2" />
                      <span className="hidden lg:inline">Verify</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                {loading ? 'Verifying...' : (
                  <>
                    <span>Type ID and press</span>
                    <kbd className="px-2 py-1 bg-accent rounded text-xs font-mono border border-border">Enter</kbd>
                    <span className="hidden sm:inline">for fastest verification</span>
                  </>
                )}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">
                Parcel OTP - Press Enter to Verify
              </label>
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); clearMessages() }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter OTP"
                  className="flex-1 min-w-0 px-4 py-3 rounded-lg border-2 border-input bg-background text-center text-2xl sm:text-3xl font-mono tracking-wider focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all"
                  disabled={loading}
                  autoFocus
                  maxLength={6}
                />
                <Button
                  onClick={quickVerifyByOTP}
                  disabled={loading || !otpCode || otpCode.trim() === ''}
                  size="lg"
                  className="px-4 lg:px-6 text-base shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 animate-spin" />
                  ) : (
                    <>
                      <Package className="w-5 h-5 lg:w-6 lg:h-6 lg:mr-2" />
                      <span className="hidden lg:inline">Verify</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                {loading ? 'Verifying parcel OTP...' : (
                  <>
                    <span className="hidden sm:inline">Enter the 6-character OTP and press</span>
                    <span className="sm:hidden">Press</span>
                    <kbd className="px-2 py-1 bg-accent rounded text-xs font-mono border border-border">Enter</kbd>
                  </>
                )}
              </p>
            </div>
          )}

          {error && <ErrorMessage error={error} onDismiss={clearMessages} />}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <div className="bg-accent/50 rounded-lg p-3 sm:p-4 text-center hover:bg-accent transition-colors">
            <p className="text-xl sm:text-2xl font-bold text-primary">
              {new Date().getHours() < 16 ? 'LUNCH' : 'DINNER'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Current Meal</p>
          </div>
          <div className="bg-accent/50 rounded-lg p-3 sm:p-4 text-center hover:bg-accent transition-colors">
            <p className="text-xl sm:text-2xl font-bold">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Current Time</p>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showMismatchDialog && pendingStudent && (
        <MealTypeMismatchDialog
          student={pendingStudent}
          mealType={pendingMealType}
          studentMealPlan={pendingStudent.mess_periods[0].meal_plan}
          onSelect={handleMismatchOption}
          onClose={() => { setShowMismatchDialog(false); setPendingStudent(null) }}
        />
      )}

      {showExpiredDialog && pendingStudent && (
        <ExpiredSubscriptionDialog
          student={pendingStudent}
          endDate={pendingStudent.mess_periods[0].end_date}
          extraMealsCount={pendingStudent.mess_periods[0].extra_meals_count || 0}
          mealType={pendingMealType}
          mealPlan={pendingStudent.mess_periods[0].meal_plan}
          onAllow={handleExpiredAllow}
          onCancel={handleExpiredCancel}
        />
      )}
    </>
  )
}
