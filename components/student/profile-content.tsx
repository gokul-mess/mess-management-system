'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Clock,
  CheckCircle,
  Utensils,
  User,
  AlertCircle,
  Sparkles,
  LogOut,
  Hash,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ProfileContentProps {
  profile: {
    id: string
    full_name?: string
    unique_short_id?: number
    photo_url?: string | null
    phone?: string | null
    address?: string | null
    meal_plan?: string | null
    subscription_start_date?: string | null
    subscription_end_date?: string | null
    is_active?: boolean
    photo_update_allowed?: boolean
    permission_expires_at?: string | null
  } | null
  onSignOut: () => void
}

export function ProfileContent({ profile, onSignOut }: ProfileContentProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const supabase = createClient()

  const daysRemaining = profile?.subscription_end_date
    ? Math.max(0, Math.ceil((new Date(profile.subscription_end_date).getTime() - Date.now()) / 86400000))
    : 0

  const canUpdatePhoto = profile?.photo_update_allowed &&
    profile?.permission_expires_at &&
    new Date(profile.permission_expires_at) > new Date()

  const getTimeRemaining = () => {
    if (!profile?.permission_expires_at) return null
    const diff = new Date(profile.permission_expires_at).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    if (!canUpdatePhoto) {
      setError('You do not have permission to update your photo. Please contact the mess owner.')
      return
    }
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Image size must be less than 2MB'); return }

    setIsUploadingPhoto(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('users')
        .update({ photo_url: publicUrl, photo_update_allowed: false, permission_expires_at: null })
        .eq('id', profile.id)
      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => { setSuccess(false); window.location.reload() }, 2000)
    } catch (err) {
      console.error('Error uploading photo:', err)
      setError('Failed to upload photo. Please try again.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

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

      {/* Success */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Photo updated successfully!</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500/30 rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Photo Upload Permission Notice */}
      {canUpdatePhoto && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-500/30 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">Photo Update Enabled</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You can update your profile photo. Permission expires in {getTimeRemaining()}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-xl overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-yellow-400/10 animate-pulse" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-col items-center -mt-16">
            {/* Profile Photo */}
            <div className="relative group">
              <div className="w-28 h-28 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-2xl">
                {isUploadingPhoto ? (
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                ) : profile?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photo_url} alt={profile.full_name || 'Student'} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-14 h-14 text-muted-foreground" />
                )}
              </div>
              {canUpdatePhoto && (
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:shadow-xl transition-all hover:scale-110 opacity-0 group-hover:opacity-100">
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={isUploadingPhoto} />
                  <Sparkles className="w-5 h-5 text-white" />
                </label>
              )}
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
                    {profile?.meal_plan === 'DL' ? 'Lunch & Dinner' :
                     profile?.meal_plan === 'L' ? 'Lunch Only' :
                     profile?.meal_plan === 'D' ? 'Dinner Only' : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Subscription Status</label>
              <div className={`p-5 rounded-xl border-2 ${
                daysRemaining > 7 ? 'bg-green-50 dark:bg-green-950/20 border-green-500/30' :
                daysRemaining > 3 ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500/30' :
                'bg-red-50 dark:bg-red-950/20 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-bold text-4xl ${
                      daysRemaining > 7 ? 'text-green-600 dark:text-green-400' :
                      daysRemaining > 3 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>{daysRemaining}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">days remaining</p>
                  </div>
                  {daysRemaining > 7 ? (
                    <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                  ) : daysRemaining > 3 ? (
                    <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400 animate-pulse" />
                  )}
                </div>
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
