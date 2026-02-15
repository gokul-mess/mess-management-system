'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, Loader2, CheckCircle, XCircle, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ManualVerifyProps {
  onSuccess?: (data: any) => void
}

export function ManualVerify({ onSuccess }: ManualVerifyProps) {
  const [shortId, setShortId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [student, setStudent] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const supabase = createClient()

  const searchStudent = async () => {
    if (!shortId || shortId.length < 3) {
      setError('Please enter a valid 3-digit ID')
      return
    }

    setIsLoading(true)
    setError(null)
    setStudent(null)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('unique_short_id', parseInt(shortId))
        .eq('role', 'STUDENT')
        .single()

      if (error || !data) {
        setError('Student not found. Please check the ID.')
        return
      }

      setStudent(data)
    } catch (err: any) {
      setError('Failed to search student. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyMeal = async () => {
    if (!student) return

    setIsLoading(true)
    try {
      // Get current hour to determine meal type
      const hour = new Date().getHours()
      const mealType = hour < 16 ? 'LUNCH' : 'DINNER'

      // Check if already logged today
      const today = new Date().toISOString().split('T')[0]
      const { data: existingLog } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', student.id)
        .eq('date', today)
        .eq('meal_type', mealType)
        .single()

      if (existingLog) {
        setVerificationResult({
          success: false,
          message: `${mealType} already logged for this student today`
        })
        return
      }

      // Insert into daily_logs
      const { data, error } = await supabase
        .from('daily_logs')
        .insert({
          user_id: student.id,
          meal_type: mealType,
          status: 'CONSUMED',
          access_method: 'SELF_ID'
        })
        .select('*, users(full_name, unique_short_id, photo_url)')
        .single()

      if (error) throw error

      setVerificationResult({
        success: true,
        data
      })

      if (onSuccess) {
        onSuccess(data)
      }

      // Reset after 3 seconds
      setTimeout(() => {
        setShortId('')
        setStudent(null)
        setVerificationResult(null)
      }, 3000)
    } catch (err: any) {
      setVerificationResult({
        success: false,
        message: err.message || 'Verification failed'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !student) {
      searchStudent()
    } else if (e.key === 'Enter' && student) {
      verifyMeal()
    }
  }

  return (
    <div className="space-y-6">
      {!verificationResult ? (
        <>
          {/* ID Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Student Unique Short ID
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={shortId}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 3)
                    setShortId(value)
                    setError(null)
                    setStudent(null)
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., 101"
                  className="flex-1 px-6 py-4 rounded-lg border border-input bg-background text-center text-3xl font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={3}
                  disabled={isLoading}
                  autoFocus
                />
                <Button
                  onClick={searchStudent}
                  disabled={isLoading || shortId.length < 3}
                  size="lg"
                  className="px-8"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Student Preview */}
          {student && (
            <div className="bg-accent/50 border-2 border-primary/20 rounded-xl p-6 animate-in slide-in-from-top-2 fade-in">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-4 border-primary/20">
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.full_name || 'Student'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold mb-1">{student.full_name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded">
                      ID: {student.unique_short_id}
                    </span>
                    <span className={`text-sm px-3 py-1 rounded ${
                      student.is_active
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    }`}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {student.is_active ? (
                <Button
                  onClick={verifyMeal}
                  disabled={isLoading}
                  size="lg"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5 mr-2" />
                      Verify & Log Meal
                    </>
                  )}
                </Button>
              ) : (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                  <p className="text-sm text-destructive font-medium">
                    This student's subscription is inactive
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 animate-in zoom-in fade-in">
          {verificationResult.success ? (
            <>
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-3">
                Verified Successfully!
              </h4>
              {verificationResult.data?.users && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-2 border-primary/20">
                    {verificationResult.data.users.photo_url ? (
                      <img
                        src={verificationResult.data.users.photo_url}
                        alt={verificationResult.data.users.full_name || 'Student'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-primary">
                        {verificationResult.data.users.full_name?.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-semibold">{verificationResult.data.users.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {verificationResult.data.users.unique_short_id}
                    </p>
                  </div>
                </div>
              )}
              <p className="text-lg text-muted-foreground mb-2">
                Meal logged successfully
              </p>
              <p className="text-sm text-muted-foreground">
                {verificationResult.data?.meal_type} • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-16 h-16 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-3">
                Verification Failed
              </h4>
              <p className="text-lg text-muted-foreground">
                {verificationResult.message}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
