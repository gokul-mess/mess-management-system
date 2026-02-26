'use client'

import { useState } from 'react'
import { ManualVerify } from '@/components/owner/manual-verify'
import { Hash, Sparkles, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react'
import { getTimeAgo } from '@/utils/format'

interface VerificationData {
  name: string
  id: number
  photo: string | null
  mealType: string
  method: string
  timestamp: string
  success: boolean
}

export function VerifyContent() {
  const [lastVerified, setLastVerified] = useState<VerificationData | null>(null)

  const handleVerificationSuccess = (data: unknown) => {
    const verificationData = data as {
      student?: {
        full_name?: string
        unique_short_id?: number
        photo_url?: string | null
      }
      mealType?: string
      method?: string
    }

    setLastVerified({
      name: verificationData.student?.full_name || 'Unknown',
      id: verificationData.student?.unique_short_id || 0,
      photo: verificationData.student?.photo_url || null,
      mealType: verificationData.mealType || 'UNKNOWN',
      method: verificationData.method === 'OTP' ? 'Parcel OTP' : 'Student ID',
      timestamp: new Date().toISOString(),
      success: true,
    })
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Verification Interface */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-border shadow-sm hover:shadow-lg transition-shadow min-h-[600px] flex flex-col">
          <div className="mb-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 group hover:scale-110 hover:rotate-12 transition-all duration-300 shadow-lg">
              <Hash className="w-8 h-8 text-primary group-hover:animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Manual ID Verification
            </h3>
            <p className="text-muted-foreground text-sm">
              Enter student&apos;s unique short ID to verify and log meals
            </p>
          </div>
          <div className="flex-1">
            <ManualVerify onSuccess={handleVerificationSuccess} />
          </div>
        </div>

        {/* Right Column - Last Verified Display */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-border shadow-sm min-h-[600px] flex flex-col">
          <div className="mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Last Verified
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Most recent meal verification</p>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {lastVerified ? (
              <LastVerifiedCard data={lastVerified} />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <UserCheck className="w-10 h-10 text-muted-foreground opacity-50" />
                </div>
                <h4 className="text-lg font-semibold mb-2">No Verifications Yet</h4>
                <p className="text-sm text-muted-foreground max-w-xs">
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
    <div className="space-y-6 animate-in slide-in-from-right fade-in duration-500">
      {/* Success/Fail Banner */}
      <div
        className={`p-4 rounded-xl border-2 ${
          data.success
            ? 'bg-green-50 dark:bg-green-900/20 border-green-500/50'
            : 'bg-red-50 dark:bg-red-900/20 border-red-500/50'
        } animate-in slide-in-from-top-2 duration-300`}
      >
        <div className="flex items-center gap-3">
          {data.success ? (
            <>
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-900 dark:text-green-100">✓ Verification Successful</p>
                <p className="text-sm text-green-700 dark:text-green-300">Meal logged successfully</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                <XCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-900 dark:text-red-100">✗ Verification Failed</p>
                <p className="text-sm text-red-700 dark:text-red-300">Please try again</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Student Card */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-accent/50 to-accent/20 p-6 group hover:shadow-xl transition-all duration-300">
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-6">
            {/* Student Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full overflow-hidden flex items-center justify-center border-4 border-primary/30 group-hover:border-primary/50 group-hover:scale-105 transition-all duration-300 shadow-2xl">
                {data.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.photo} alt={data.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-primary">{data.name.charAt(0)}</span>
                )}
              </div>
              <div
                className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping opacity-75"
                style={{ animationDuration: '2s' }}
              />
              {data.success && (
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-in zoom-in duration-500 shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* Student Details */}
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {data.name}
                </h4>
                <p className="text-sm text-muted-foreground font-mono mt-1">ID: #{data.id}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                    data.mealType === 'LUNCH'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/50'
                      : 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/50'
                  } group-hover:scale-105 transition-transform`}
                >
                  {data.mealType}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="px-3 py-1.5 rounded-full text-sm font-bold bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 group-hover:scale-105 transition-transform">
                  {data.method}
                </span>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
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
