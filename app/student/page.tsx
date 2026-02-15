'use client'

import { useState } from 'react'
import { useProfile } from '@/hooks/use-profile'
import { useDailyLogs } from '@/hooks/use-daily-logs'
import { Button } from '@/components/ui/button'
import { 
  QrCode, 
  Calendar, 
  History, 
  User,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Utensils,
  Package,
  X,
  Camera
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StudentDashboard() {
  const { data: profile } = useProfile()
  const { logs } = useDailyLogs()
  const [activeTab, setActiveTab] = useState<'home' | 'qr' | 'leave' | 'history' | 'profile'>('home')
  const [showParcelOTP, setShowParcelOTP] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Calculate today's meals
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = logs?.filter(log => log.date === today && log.user_id === profile?.id) || []
  const hasLunch = todayLogs.some(log => log.meal_type === 'LUNCH')
  const hasDinner = todayLogs.some(log => log.meal_type === 'DINNER')

  // Calculate subscription days remaining
  const daysRemaining = profile?.subscription_end_date 
    ? Math.ceil((new Date(profile.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-border backdrop-blur-lg bg-white/80 dark:bg-zinc-900/80 flex-shrink-0">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">
                  {profile?.full_name?.charAt(0) || 'S'}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold">Gokul Mess</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Student Portal</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('profile')}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        {activeTab === 'home' && (
          <HomeContent 
            profile={profile} 
            hasLunch={hasLunch} 
            hasDinner={hasDinner}
            daysRemaining={daysRemaining}
            onNavigate={setActiveTab}
            showParcelOTP={showParcelOTP}
            setShowParcelOTP={setShowParcelOTP}
          />
        )}
        {activeTab === 'qr' && <QRContent />}
        {activeTab === 'leave' && <LeaveContent />}
        {activeTab === 'history' && <HistoryContent profile={profile} logs={logs} />}
        {activeTab === 'profile' && <ProfileContent profile={profile} onSignOut={handleSignOut} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white dark:bg-zinc-900 border-t border-border flex-shrink-0">
        <div className="px-2 py-2">
          <div className="flex items-center justify-around">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'home'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Utensils className="w-5 h-5" />
              <span className="text-xs font-medium">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('qr')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'qr'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span className="text-xs font-medium">QR Code</span>
            </button>

            <button
              onClick={() => setActiveTab('leave')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'leave'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs font-medium">Leave</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-xs font-medium">History</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  )
}

// Home Content Component
function HomeContent({ profile, hasLunch, hasDinner, daysRemaining, onNavigate, showParcelOTP, setShowParcelOTP }: any) {
  const supabase = createClient()
  const [parcelOTP, setParcelOTP] = useState<string | null>(null)
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateParcelOTP = async () => {
    setLoading(true)
    setError(null)
    
    try {
      if (!profile?.id) {
        throw new Error('Profile not loaded. Please refresh the page.')
      }

      // Generate 4-digit OTP
      const otp = Math.floor(1000 + Math.random() * 9000).toString()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      const { data, error: insertError } = await supabase
        .from('parcel_otp')
        .insert({
          student_id: profile.id,
          otp_code: otp,
          expires_at: expiresAt.toISOString(),
          status: 'ACTIVE'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Database error:', insertError)
        throw new Error(`Failed to generate OTP: ${insertError.message}`)
      }

      setParcelOTP(otp)
      setOtpExpiry(expiresAt)
      setShowParcelOTP(true)
    } catch (err: any) {
      console.error('OTP generation error:', err)
      setError(err.message || 'Failed to generate OTP. Please try again.')
      // Show error in modal
      setShowParcelOTP(true)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowParcelOTP(false)
    setParcelOTP(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-muted-foreground text-sm mb-1">Welcome back,</p>
            <h2 className="text-2xl font-bold">{profile?.full_name || 'Student'}</h2>
            <p className="text-muted-foreground text-sm mt-1">ID: #{profile?.unique_short_id || '---'}</p>
          </div>
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-lg overflow-hidden flex items-center justify-center border border-border shadow-sm">
            {profile?.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.full_name || 'Student'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-accent/50 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Subscription Status</p>
              <p className="text-2xl font-bold">{daysRemaining} days</p>
              <p className="text-muted-foreground text-xs mt-1">remaining</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              daysRemaining > 7 ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 
              daysRemaining > 3 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 
              'bg-red-500/10 text-red-600 dark:text-red-400'
            }`}>
              {daysRemaining > 7 ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Meals */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Today's Meals</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border ${
            hasLunch 
              ? 'border-green-500/50 bg-green-500/5' 
              : 'border-border bg-accent/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Lunch</span>
              {hasLunch ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasLunch ? 'Consumed' : 'Not yet'}
            </p>
          </div>

          <div className={`p-4 rounded-lg border ${
            hasDinner 
              ? 'border-green-500/50 bg-green-500/5' 
              : 'border-border bg-accent/30'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Dinner</span>
              {hasDinner ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasDinner ? 'Consumed' : 'Not yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        
        <button
          onClick={() => onNavigate('qr')}
          className="w-full bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Generate Meal Token</p>
              <p className="text-xs text-muted-foreground">Show QR code for verification</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={generateParcelOTP}
          disabled={loading}
          className="w-full bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold">{loading ? 'Generating...' : 'Generate Parcel OTP'}</p>
              <p className="text-xs text-muted-foreground">For parcel collection by delegate</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('leave')}
          className="w-full bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Mark Leave</p>
              <p className="text-xs text-muted-foreground">Request leave for meals</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('history')}
          className="w-full bg-white dark:bg-zinc-900 rounded-lg p-4 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <History className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Meal History</p>
              <p className="text-xs text-muted-foreground">View past consumption</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Parcel OTP Modal */}
      {showParcelOTP && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Parcel OTP</h3>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error ? (
              // Error State
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-full mb-4">
                  <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-lg font-semibold mb-2">Failed to Generate OTP</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={() => {
                    closeModal()
                    setTimeout(generateParcelOTP, 100)
                  }}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            ) : parcelOTP ? (
              // Success State
              <>
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
                    <Package className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">Share this OTP with your delegate</p>
                  <div className="text-5xl font-bold tracking-wider mb-2 font-mono">{parcelOTP}</div>
                  <p className="text-xs text-muted-foreground">
                    Expires at {otpExpiry?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                <div className="bg-accent/50 border border-border rounded-lg p-3 mb-4">
                  <p className="text-xs text-foreground">
                    <strong>Note:</strong> This OTP is valid for 15 minutes. Your delegate should provide this to the mess owner for parcel collection.
                  </p>
                </div>

                <Button
                  onClick={closeModal}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </>
            ) : (
              // Loading State
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-muted-foreground">Generating OTP...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// QR Content Component
function QRContent() {
  const { data: profile } = useProfile()
  const [QRCodeComponent, setQRCodeComponent] = useState<any>(null)

  // Dynamically import QRCode component (client-side only)
  useState(() => {
    import('qrcode.react').then((mod) => {
      setQRCodeComponent(() => mod.QRCodeSVG)
    })
  })

  // Check if subscription is active
  const isActive = profile?.subscription_end_date 
    ? new Date(profile.subscription_end_date) > new Date()
    : false

  // Generate QR data with student information
  const qrData = JSON.stringify({
    id: profile?.id,
    shortId: profile?.unique_short_id,
    name: profile?.full_name,
    timestamp: Date.now(),
  })

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Meal Token</h2>
        <p className="text-muted-foreground">Show this QR code to the mess owner</p>
      </div>

      {!isActive ? (
        // Subscription Expired State
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-border shadow-sm">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-full mb-4">
              <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Subscription Expired</h3>
            <p className="text-muted-foreground mb-6">
              Your subscription has expired. Please renew your subscription to generate meal tokens.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>Note:</strong> QR code generation is disabled for expired subscriptions. Contact the mess owner to renew your subscription.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Active Subscription - Show QR Code
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-8 border border-border shadow-sm">
          <div className="flex items-center justify-center mb-6 bg-white p-6 rounded-lg border border-border">
            {QRCodeComponent && profile ? (
              <QRCodeComponent
                value={qrData}
                size={256}
                level="H"
                includeMargin={true}
                className="w-full h-auto max-w-[256px]"
              />
            ) : (
              <div className="w-64 h-64 bg-accent rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Loading QR Code...</p>
                </div>
              </div>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="font-semibold text-lg">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">ID: #{profile?.unique_short_id}</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
              <CheckCircle className="w-4 h-4" />
              Active Subscription
            </div>
          </div>
        </div>
      )}

      <div className="bg-accent/50 border border-border rounded-lg p-4">
        <p className="text-sm text-foreground">
          <strong>Note:</strong> This QR code is unique to you and refreshes with each view. Do not share screenshots with others.
        </p>
      </div>
    </div>
  )
}

// Leave Content Component
function LeaveContent() {
  const { data: profile } = useProfile()
  const supabase = createClient()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [leaves, setLeaves] = useState<any[]>([])

  // Fetch existing leaves
  useState(() => {
    const fetchLeaves = async () => {
      if (!profile?.id) return
      const { data } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) setLeaves(data)
    }
    fetchLeaves()
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    
    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select both start and end dates' })
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      setMessage({ type: 'error', text: 'End date must be after start date' })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('leaves')
        .insert({
          user_id: profile?.id,
          start_date: startDate,
          end_date: endDate,
          status: 'PENDING'
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Leave request submitted successfully!' })
      setStartDate('')
      setEndDate('')
      
      // Refresh leaves list
      const { data } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) setLeaves(data)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to submit leave request' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Mark Leave</h2>
        <p className="text-muted-foreground">Request leave for your meals</p>
      </div>

      {/* Leave Request Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </Button>
        </form>
      </div>

      {/* Leave History */}
      {leaves.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Leave Requests</h3>
          </div>
          <div className="divide-y divide-border">
            {leaves.map((leave) => (
              <div key={leave.leave_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {new Date(leave.start_date).toLocaleDateString('en-IN')} - {new Date(leave.end_date).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    leave.status === 'APPROVED' 
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                      : leave.status === 'REJECTED'
                      ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                      : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20'
                  }`}>
                    {leave.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-accent/50 border border-border rounded-lg p-4">
        <p className="text-sm text-foreground">
          <strong>Note:</strong> Leave requests for 4 or more consecutive days will extend your subscription period automatically.
        </p>
      </div>
    </div>
  )
}

// History Content Component (Placeholder)
function HistoryContent({ profile, logs }: any) {
  const userLogs = logs?.filter((log: any) => log.user_id === profile?.id) || []

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Meal History</h2>
        <p className="text-muted-foreground">Your consumption records</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        {userLogs.length > 0 ? (
          <div className="divide-y divide-border">
            {userLogs.slice(0, 10).map((log: any) => (
              <div key={log.log_id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{log.meal_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded-md border border-green-500/20">
                      <CheckCircle className="w-3 h-3" />
                      {log.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No meal history yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Profile Content Component
function ProfileContent({ profile, onSignOut }: any) {
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  
  const [authEmail, setAuthEmail] = useState<string>('')
  
  // Editable fields
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  })

  // Check if profile editing is allowed
  const canEditProfile = profile?.profile_edit_allowed === true

  // Fetch auth email and update form when profile loads
  useState(() => {
    const fetchAuthEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setAuthEmail(user.email)
      }
    }
    fetchAuthEmail()

    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
      })
    }
  })

  const handleSave = async () => {
    if (!canEditProfile) {
      setMessage({ type: 'error', text: 'Profile editing is not permitted. Contact the mess owner.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
        })
        .eq('id', profile?.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setIsEditing(false)
      
      // Refresh profile data
      window.location.reload()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoUpload = async () => {
    if (!photoFile) return

    setLoading(true)
    setMessage(null)

    try {
      // Upload to Supabase Storage (if configured)
      // For now, we'll show an error that photo upload requires owner permission
      throw new Error('Photo upload requires owner permission. Please contact the mess owner to update your photo.')
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
      setShowPhotoUpload(false)
      setPhotoFile(null)
      setPhotoPreview(null)
    }
  }

  const daysRemaining = profile?.subscription_end_date 
    ? Math.ceil((new Date(profile.subscription_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">My Profile</h2>
        <p className="text-muted-foreground">Your account information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary to-primary/70" />
        <div className="px-6 pb-6">
          <div className="flex flex-col items-center -mt-12">
            {/* Profile Photo */}
            <div className="relative group">
              <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-lg">
                {profile?.photo_url ? (
                  <img
                    src={profile.photo_url}
                    alt={profile.full_name || 'Student'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              
              {/* Photo Upload Overlay - Only if owner permits */}
              {profile?.photo_update_allowed && (
                <button
                  onClick={() => setShowPhotoUpload(true)}
                  className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              )}
            </div>

            <h3 className="text-xl font-bold mt-4">{profile?.full_name || 'Student'}</h3>
            <p className="text-sm text-muted-foreground">Student</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/20">
              ID: #{profile?.unique_short_id || '---'}
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          {/* Profile Information */}
          <div className="mt-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
              {isEditing && canEditProfile ? (
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <div className="p-3 bg-accent/50 rounded-lg border border-border">
                  <p className="font-medium">{profile?.full_name || 'Not set'}</p>
                </div>
              )}
            </div>

            {/* Email (Non-editable - from auth) */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Email Address</label>
              <div className="p-3 bg-accent/30 rounded-lg border border-border">
                <p className="font-medium text-muted-foreground">{authEmail || 'Loading...'}</p>
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone Number</label>
              {isEditing && canEditProfile ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <div className="p-3 bg-accent/50 rounded-lg border border-border">
                  <p className="font-medium">{profile?.phone || 'Not set'}</p>
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
              {isEditing && canEditProfile ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your address"
                  rows={3}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              ) : (
                <div className="p-3 bg-accent/50 rounded-lg border border-border">
                  <p className="font-medium">{profile?.address || 'Not set'}</p>
                </div>
              )}
            </div>

            {/* Meal Plan (Non-editable) */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Meal Plan</label>
              <div className="p-3 bg-accent/30 rounded-lg border border-border">
                <p className="font-medium">
                  {profile?.meal_plan === 'L' ? 'Lunch Only' : 
                   profile?.meal_plan === 'D' ? 'Dinner Only' : 
                   profile?.meal_plan === 'DL' ? 'Lunch & Dinner' : 'Not set'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Contact owner to change meal plan</p>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Subscription Start</label>
                <div className="p-3 bg-accent/30 rounded-lg border border-border">
                  <p className="font-medium text-sm">
                    {profile?.subscription_start_date 
                      ? new Date(profile.subscription_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Not set'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Subscription End</label>
                <div className="p-3 bg-accent/30 rounded-lg border border-border">
                  <p className="font-medium text-sm">
                    {profile?.subscription_end_date 
                      ? new Date(profile.subscription_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Balance Days */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Balance Days</label>
              <div className={`p-3 rounded-lg border ${
                daysRemaining > 7 ? 'bg-green-500/10 border-green-500/20' :
                daysRemaining > 3 ? 'bg-yellow-500/10 border-yellow-500/20' :
                'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-lg">{daysRemaining} days remaining</p>
                  {daysRemaining > 7 ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : daysRemaining > 3 ? (
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Account Status</label>
              <div className="p-3 bg-accent/50 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  {profile?.is_active ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="font-semibold text-green-600 dark:text-green-400">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="font-semibold text-red-600 dark:text-red-400">Inactive</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={loading || !canEditProfile}
                  className="w-full"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false)
                    setMessage(null)
                    // Reset form data
                    setFormData({
                      full_name: profile?.full_name || '',
                      phone: profile?.phone || '',
                      address: profile?.address || '',
                    })
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    if (!canEditProfile) {
                      setMessage({ type: 'error', text: 'Profile editing is disabled. Contact the mess owner to enable editing.' })
                      return
                    }
                    setIsEditing(true)
                  }}
                  variant="outline"
                  className="w-full"
                  disabled={!canEditProfile}
                >
                  {canEditProfile ? 'Edit Profile' : 'Edit Profile (Disabled)'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onSignOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            )}
          </div>

          {/* Permission Notes */}
          <div className="mt-4 space-y-2">
            {!canEditProfile && (
              <div className="bg-accent/50 border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Profile editing is currently disabled. Contact the mess owner to enable profile updates.
                </p>
              </div>
            )}
            
            {!profile?.photo_update_allowed && (
              <div className="bg-accent/50 border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Photo updates are currently disabled. Contact the mess owner to enable photo changes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Update Profile Photo</h3>
              <button
                onClick={() => {
                  setShowPhotoUpload(false)
                  setPhotoFile(null)
                  setPhotoPreview(null)
                }}
                className="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {photoPreview ? (
                <div className="flex justify-center">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-lg object-cover border border-border"
                  />
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-32 h-32 bg-accent rounded-lg flex items-center justify-center border border-border">
                    <Camera className="w-12 h-12 text-muted-foreground" />
                  </div>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full text-sm"
              />

              <div className="bg-accent/50 border border-border rounded-lg p-3">
                <p className="text-xs text-foreground">
                  <strong>Note:</strong> Photo changes require owner approval. Your photo will be reviewed before being updated.
                </p>
              </div>

              <Button
                onClick={handlePhotoUpload}
                disabled={!photoFile || loading}
                className="w-full"
              >
                {loading ? 'Uploading...' : 'Upload Photo'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
