'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { ErrorMessage } from '@/components/ui/error-message'

interface ManualVerifyProps {
  onSuccess?: (data: unknown) => void
}

export function ManualVerify({ onSuccess }: ManualVerifyProps) {
  const [shortId, setShortId] = useState('')
  const [lastVerified, setLastVerified] = useState<{
    name: string
    id: number
    photo: string | null
    mealType: string
  } | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { loading, error, execute, clearMessages } = useAsyncOperation('Verify Meal')

  // Fast verification - combines search and log in one operation
  const quickVerify = async () => {
    if (!shortId || shortId.trim() === '') return
    
    clearMessages()
    setShowSuccess(false)

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

      // Check if already logged (in parallel with student fetch would be ideal, but keeping simple)
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

      // Show success briefly
      setLastVerified({
        name: student.full_name,
        id: student.unique_short_id,
        photo: student.photo_url,
        mealType
      })
      setShowSuccess(true)

      if (onSuccess) {
        onSuccess({ student, mealType })
      }

      // Quick reset for next student (1 second instead of 3)
      setTimeout(() => {
        setShowSuccess(false)
        setShortId('')
        // Auto-focus back to input for next student
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 1000)
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && shortId && !loading) {
      quickVerify()
    }
  }

  return (
    <div className="space-y-6">
      {/* Always show input for fast entry */}
      <div className="space-y-4">
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
              onKeyPress={handleKeyPress}
              placeholder="Enter ID & press Enter"
              className="flex-1 px-6 py-4 rounded-lg border-2 border-input bg-background text-center text-4xl font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              disabled={loading}
              autoFocus
            />
            <Button
              onClick={quickVerify}
              disabled={loading || !shortId || shortId.trim() === ''}
              size="lg"
              className="px-8 text-lg"
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
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {loading ? 'Verifying...' : 'Type ID and press Enter for fastest verification'}
          </p>
        </div>

        {error && (
          <ErrorMessage 
            error={error} 
            onDismiss={clearMessages}
          />
        )}
      </div>

      {/* Compact success indicator */}
      {showSuccess && lastVerified && (
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-xl p-4 animate-in slide-in-from-top-2 fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-green-900 dark:text-green-100">
                ✓ {lastVerified.name}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                ID: {lastVerified.id} • {lastVerified.mealType}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-accent/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {new Date().getHours() < 16 ? 'LUNCH' : 'DINNER'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Current Meal</p>
        </div>
        <div className="bg-accent/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Current Time</p>
        </div>
      </div>
    </div>
  )
}
