'use client'

import { useState, useEffect } from 'react'
import { formatDateTime } from '@/utils/format'
import {
  Clock,
  CheckCircle,
  XCircle,
  Package,
  AlertCircle,
  Sparkles,
  History,
  X,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ParcelOTPContentProps {
  profile: { id: string; full_name?: string } | null
  showParcelOTP: boolean
  setShowParcelOTP: (show: boolean) => void
}

interface OTPRecord {
  otp_id: string
  otp_code: string
  created_at: string
  expires_at: string
  is_used: boolean
}

export function ParcelOTPContent({ profile, showParcelOTP, setShowParcelOTP }: ParcelOTPContentProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentOTP, setCurrentOTP] = useState<{ code: string; expiresAt: string } | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpHistory, setOtpHistory] = useState<OTPRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [selectedOTP, setSelectedOTP] = useState<OTPRecord | null>(null)
  const supabase = createClient()

  // Fetch OTP history
  useEffect(() => {
    const fetchOTPHistory = async () => {
      if (!profile?.id) return
      try {
        const { data, error } = await supabase
          .from('parcel_otps')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5)
        if (error) throw error
        setOtpHistory(data || [])
      } catch (err) {
        console.error('Error fetching OTP history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    fetchOTPHistory()
  }, [profile?.id, supabase])

  const generateOTP = async () => {
    if (!profile?.id) return
    setIsGenerating(true)
    setError(null)

    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

      const { error: insertError } = await supabase
        .from('parcel_otps')
        .insert({ user_id: profile.id, otp_code: otpCode, expires_at: expiresAt, is_used: false })

      if (insertError) throw insertError

      setCurrentOTP({ code: otpCode, expiresAt })
      setShowParcelOTP(true)
      setShowConfetti(true)

      const { data } = await supabase
        .from('parcel_otps')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) setOtpHistory(data)

      setTimeout(() => setShowConfetti(false), 3000)
    } catch (err) {
      console.error('Error generating OTP:', err)
      setError('Failed to generate OTP. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const closeModal = () => {
    setShowParcelOTP(false)
    setCurrentOTP(null)
    setShowConfetti(false)
  }

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    return `${Math.floor(diff / 60000)} min left`
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white shadow-2xl group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full -ml-24 -mb-24 blur-3xl animate-pulse group-hover:scale-150 transition-transform duration-1000" style={{ animationDelay: '1s' }} />
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-blue-400/30 shadow-xl">
            <Package className="w-8 h-8 text-blue-300" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-1">Parcel OTP</h2>
            <p className="text-slate-300 text-sm">Generate secure OTP for parcel collection</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Generate Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Generate New OTP</h3>
              <p className="text-xs text-muted-foreground">Valid for 15 minutes</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-xl p-5 border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-blue-950/30 dark:via-cyan-950/30 dark:to-blue-900/30 group hover:scale-105 transition-all shadow-md">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-transparent dark:from-blue-900/20 animate-pulse" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1 text-blue-900 dark:text-blue-100">Quick & Secure</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">OTP expires in 15 minutes</p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl p-5 border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-green-900/30 group hover:scale-105 transition-all shadow-md">
              <div className="absolute inset-0 bg-gradient-to-r from-green-100/50 to-transparent dark:from-green-900/20 animate-pulse" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1 text-green-900 dark:text-green-100">Easy Collection</h3>
                  <p className="text-xs text-green-700 dark:text-green-300">Share with anyone to collect</p>
                </div>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateOTP}
            disabled={isGenerating}
            className="relative w-full py-6 text-lg font-bold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
          >
            {isGenerating ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 to-primary/30 animate-pulse" />
                <span className="relative flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Generating OTP...
                </span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate New OTP
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* OTP History */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Recent OTPs</h3>
              <p className="text-xs text-muted-foreground">Click on any OTP to view details</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border max-h-96 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading history...</p>
            </div>
          ) : otpHistory.length > 0 ? (
            otpHistory.map((otp, index) => {
              const isExpired = new Date(otp.expires_at).getTime() < Date.now()
              return (
                <button
                  key={otp.otp_id}
                  onClick={() => setSelectedOTP(otp)}
                  className="w-full p-5 hover:bg-accent/30 transition-all duration-300 animate-in slide-in-from-right-2 text-left cursor-pointer"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        otp.is_used ? 'bg-gray-100 dark:bg-gray-900/30' :
                        isExpired ? 'bg-red-100 dark:bg-red-950/30' : 'bg-green-100 dark:bg-green-950/30'
                      }`}>
                        {otp.is_used ? <CheckCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" /> :
                         isExpired ? <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" /> :
                         <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-lg tracking-wider">{otp.otp_code}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(otp.created_at)}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      otp.is_used ? 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400' :
                      isExpired ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                      'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                    }`}>
                      {otp.is_used ? 'Used' : isExpired ? 'Expired' : getTimeRemaining(otp.expires_at)}
                    </span>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="p-16 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No OTPs generated yet</p>
            </div>
          )}
        </div>
      </div>

      {/* OTP Modal */}
      {showParcelOTP && currentOTP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: '-10%',
                    backgroundColor: ['#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981'][Math.floor(Math.random() * 5)],
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-border animate-in zoom-in-95 duration-300 relative">
            <button onClick={closeModal} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-all hover:scale-110 hover:rotate-90 duration-300">
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-500">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">OTP Generated!</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">Share this code to collect your parcel</p>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 mb-6 border-2 border-primary/20 animate-glow">
              <p className="text-6xl font-bold text-center tracking-wider bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {currentOTP.code}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
              <Clock className="w-4 h-4" />
              <span>Expires in 15 minutes</span>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigator.clipboard.writeText(currentOTP.code)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Copy OTP
              </button>
              <button onClick={closeModal} className="w-full py-3 rounded-xl border-2 border-border bg-accent hover:bg-accent/80 font-semibold transition-all hover:scale-105">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Details Modal */}
      {selectedOTP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-border animate-in zoom-in-95 duration-300 relative">
            <button onClick={() => setSelectedOTP(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-accent hover:bg-accent/80 flex items-center justify-center transition-all hover:scale-110 hover:rotate-90 duration-300">
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                selectedOTP.is_used ? 'bg-gradient-to-br from-gray-500 to-gray-600' :
                new Date(selectedOTP.expires_at).getTime() < Date.now() ? 'bg-gradient-to-br from-red-500 to-red-600' :
                'bg-gradient-to-br from-green-500 to-emerald-500'
              }`}>
                {selectedOTP.is_used ? <CheckCircle className="w-10 h-10 text-white" /> :
                 new Date(selectedOTP.expires_at).getTime() < Date.now() ? <XCircle className="w-10 h-10 text-white" /> :
                 <Clock className="w-10 h-10 text-white" />}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-center mb-2">OTP Details</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {selectedOTP.is_used ? 'This OTP has been used' :
               new Date(selectedOTP.expires_at).getTime() < Date.now() ? 'This OTP has expired' : 'This OTP is active'}
            </p>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border-2 border-primary/20">
                <p className="text-5xl font-bold text-center tracking-wider bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {selectedOTP.otp_code}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-accent/50 rounded-xl">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedOTP.is_used ? 'bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400' :
                    new Date(selectedOTP.expires_at).getTime() < Date.now() ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                    'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                  }`}>
                    {selectedOTP.is_used ? 'Used' : new Date(selectedOTP.expires_at).getTime() < Date.now() ? 'Expired' : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-accent/50 rounded-xl">
                  <span className="text-sm font-medium text-muted-foreground">Generated</span>
                  <span className="text-sm font-bold">{formatDateTime(selectedOTP.created_at)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-accent/50 rounded-xl">
                  <span className="text-sm font-medium text-muted-foreground">Expires</span>
                  <span className="text-sm font-bold">{formatDateTime(selectedOTP.expires_at)}</span>
                </div>
                {selectedOTP.is_used && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-xl border border-gray-200 dark:border-gray-900/50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Usage Information</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This OTP was used for parcel collection. The owner verified and marked it as used in the system.
                    </p>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedOTP(null)} className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
