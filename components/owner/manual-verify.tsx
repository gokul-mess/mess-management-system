'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, Loader2, Package, Hash } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { ErrorMessage } from '@/components/ui/error-message'

interface ManualVerifyProps {
  onSuccess?: (data: unknown) => void
}

export function ManualVerify({ onSuccess }: ManualVerifyProps) {
  const [verifyMode, setVerifyMode] = useState<'ID' | 'OTP'>('ID')
  const [shortId, setShortId] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { loading, error, execute, clearMessages } = useAsyncOperation('Verify Meal')

  // Fast verification by Student ID
  const quickVerifyById = async () => {
    if (!shortId || shortId.trim() === '') return
    
    clearMessages()

    await execute(async () => {
      // Get current hour to determine meal type
      const hour = new Date().getHours()
      const mealType = hour < 16 ? 'LUNCH' : 'DINNER'
      const today = new Date().toISOString().split('T')[0]

      // Single optimized query: search student and check if already logged
      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('id, full_name, unique_short_id, photo_url, is_active')
        .eq('unique_short_id', parseInt(shortId))
        .eq('role', 'STUDENT')
        .single()

      if (studentError || !student) {
        throw new Error('Student not found. Please check the ID.')
      }

      if (!student.is_active) {
        throw new Error('Student subscription is inactive. Please renew.')
      }

      // Check if already logged
      const { data: existingLog } = await supabase
        .from('daily_logs')
        .select('log_id')
        .eq('user_id', student.id)
        .eq('date', today)
        .eq('meal_type', mealType)
        .maybeSingle()

      if (existingLog) {
        throw new Error(`${mealType} already logged for ${student.full_name} today`)
      }

      // Insert meal log
      const { error: insertError } = await supabase
        .from('daily_logs')
        .insert({
          user_id: student.id,
          meal_type: mealType,
          status: 'CONSUMED',
          access_method: 'SELF_ID'
        })

      if (insertError) throw insertError

      if (onSuccess) {
        onSuccess({ student, mealType })
      }

      // Quick reset for next student
      setTimeout(() => {
        setShortId('')
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 1000)
    })
  }

  // Verify by OTP (for parcel collection)
  const quickVerifyByOTP = async () => {
    if (!otpCode || otpCode.trim() === '') return
    
    clearMessages()

    await execute(async () => {
      // Get current hour to determine meal type
      const hour = new Date().getHours()
      const mealType = hour < 16 ? 'LUNCH' : 'DINNER'
      const today = new Date().toISOString().split('T')[0]

      // Find valid OTP
      const { data: otpRecord, error: otpError } = await supabase
        .from('parcel_otps')
        .select('otp_id, user_id, expires_at, is_used, users!inner(id, full_name, unique_short_id, photo_url, is_active)')
        .eq('otp_code', otpCode.toUpperCase())
        .eq('is_used', false)
        .single()

      if (otpError || !otpRecord) {
        throw new Error('Invalid or expired OTP. Please check the code.')
      }

      // Check if OTP is expired
      if (new Date(otpRecord.expires_at) < new Date()) {
        throw new Error('OTP has expired. Please generate a new one.')
      }

      const student = otpRecord.users as unknown as {
        id: string
        full_name: string
        unique_short_id: number
        photo_url: string | null
        is_active: boolean
      }

      if (!student.is_active) {
        throw new Error('Student subscription is inactive. Please renew.')
      }

      // Check if already logged
      const { data: existingLog } = await supabase
        .from('daily_logs')
        .select('log_id')
        .eq('user_id', student.id)
        .eq('date', today)
        .eq('meal_type', mealType)
        .maybeSingle()

      if (existingLog) {
        throw new Error(`${mealType} already logged for ${student.full_name} today`)
      }

      // Insert meal log with PARCEL_OTP method
      const { error: insertError } = await supabase
        .from('daily_logs')
        .insert({
          user_id: student.id,
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

      if (onSuccess) {
        onSuccess({ student, mealType, method: 'OTP' })
      }

      // Quick reset
      setTimeout(() => {
        setOtpCode('')
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 1000)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      if (verifyMode === 'ID' && shortId) {
        quickVerifyById()
      } else if (verifyMode === 'OTP' && otpCode) {
        quickVerifyByOTP()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-accent/50 rounded-lg">
        <button
          onClick={() => {
            setVerifyMode('ID')
            setOtpCode('')
            clearMessages()
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all ${
            verifyMode === 'ID'
              ? 'bg-white dark:bg-zinc-900 shadow-sm text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Hash className="w-4 h-4" />
          Student ID
        </button>
        <button
          onClick={() => {
            setVerifyMode('OTP')
            setShortId('')
            clearMessages()
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all ${
            verifyMode === 'OTP'
              ? 'bg-white dark:bg-zinc-900 shadow-sm text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          Parcel OTP
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
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setShortId(value)
                  clearMessages()
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter ID"
                className="flex-1 px-4 py-3 rounded-lg border-2 border-input bg-background text-center text-2xl sm:text-3xl font-mono tracking-wider focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all"
                disabled={loading}
                autoFocus
              />
              <Button
                onClick={quickVerifyById}
                disabled={loading || !shortId || shortId.trim() === ''}
                size="lg"
                className="px-6 text-base shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-6 h-6 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center flex items-center justify-center gap-2">
              {loading ? 'Verifying...' : (
                <>
                  <span>Type ID and press</span>
                  <kbd className="px-2 py-1 bg-accent rounded text-xs font-mono border border-border">Enter</kbd>
                  <span>for fastest verification</span>
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
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                  setOtpCode(value)
                  clearMessages()
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter OTP"
                className="flex-1 px-4 py-3 rounded-lg border-2 border-input bg-background text-center text-2xl sm:text-3xl font-mono tracking-wider focus:outline-none focus:ring-4 focus:ring-primary/30 focus:border-primary focus:shadow-lg focus:shadow-primary/20 transition-all"
                disabled={loading}
                autoFocus
                maxLength={6}
              />
              <Button
                onClick={quickVerifyByOTP}
                disabled={loading || !otpCode || otpCode.trim() === ''}
                size="lg"
                className="px-6 text-base shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Package className="w-6 h-6 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center flex items-center justify-center gap-2">
              {loading ? 'Verifying parcel OTP...' : (
                <>
                  <span>Enter the 6-character OTP and press</span>
                  <kbd className="px-2 py-1 bg-accent rounded text-xs font-mono border border-border">Enter</kbd>
                </>
              )}
            </p>
          </div>
        )}

        {error && (
          <ErrorMessage 
            error={error} 
            onDismiss={clearMessages}
          />
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-accent/50 rounded-lg p-4 text-center hover:bg-accent transition-colors">
          <p className="text-2xl font-bold text-primary">
            {new Date().getHours() < 16 ? 'LUNCH' : 'DINNER'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Current Meal</p>
        </div>
        <div className="bg-accent/50 rounded-lg p-4 text-center hover:bg-accent transition-colors">
          <p className="text-2xl font-bold">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Current Time</p>
        </div>
      </div>
    </div>
  )
}
