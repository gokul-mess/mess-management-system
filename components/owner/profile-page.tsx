'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Upload,
  Save,
  X,
  Edit2,
  CheckCircle,
  TrendingUp,
  Users,
  Utensils,
  Crown,
  Target,
  Activity
} from 'lucide-react'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { ErrorMessage, SuccessMessage } from '@/components/ui/error-message'

interface ProfileData {
  id: string
  full_name: string
  unique_short_id: number
  photo_url?: string | null
  created_at?: string
  email?: string
  phone?: string
  address?: string
}

export function ProfilePage({ profile }: { profile: ProfileData | null }) {
  const [isEditing, setIsEditing] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || ''
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({})
  const [saveButtonState, setSaveButtonState] = useState<'idle' | 'saving' | 'success'>('idle')
  const [stats, setStats] = useState({
    totalMeals: 0,
    activeStudents: 0,
    monthlyRevenue: 0,
    thisMonth: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const supabase = createClient()
  const { loading: saving, error: saveError, success: saveSuccess, clearMessages } = useAsyncOperation('Save Profile')

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || ''
      })
    }
  }, [profile])

  // Fetch user email from auth
  useEffect(() => {
    const fetchEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    fetchEmail()
  }, [supabase])

  // Fetch real stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total meals
        const { data: allLogs, error: logsError } = await supabase
          .from('daily_logs')
          .select('*')
        
        if (logsError) throw logsError

        // Fetch active students
        const { data: students, error: studentsError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'STUDENT')
          .eq('is_active', true)
        
        if (studentsError) throw studentsError

        // Calculate this month's meals
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const thisMonthLogs = allLogs?.filter(log => log.date >= firstDayOfMonth) || []

        setStats({
          totalMeals: allLogs?.length || 0,
          activeStudents: students?.length || 0,
          monthlyRevenue: (allLogs?.length || 0) * 50,
          thisMonth: thisMonthLogs.length
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    fetchStats()
  }, [supabase])

  useEffect(() => {
    if (saving) {
      setSaveButtonState('saving')
    } else if (saveSuccess) {
      setSaveButtonState('success')
      setTimeout(() => {
        setSaveButtonState('idle')
        setIsEditing(false)
        // Reload the page to fetch updated profile data
        window.location.reload()
      }, 2000)
    } else {
      setSaveButtonState('idle')
    }
  }, [saving, saveSuccess])

  const validateField = (field: string, value: string) => {
    const errors: Record<string, string> = { ...validationErrors }
    
    if (field === 'full_name' && !value.trim()) {
      errors.full_name = 'Name is required'
      // Trigger shake animation once
      setShakeFields(prev => ({ ...prev, full_name: true }))
      setTimeout(() => setShakeFields(prev => ({ ...prev, full_name: false })), 500)
    } else if (field === 'full_name') {
      delete errors.full_name
    }
    
    if (field === 'phone' && value) {
      // Remove all non-digit characters to count only digits
      const digitsOnly = value.replace(/\D/g, '')
      
      if (digitsOnly.length !== 10) {
        errors.phone = 'Phone number must be exactly 10 digits'
        // Trigger shake animation once
        setShakeFields(prev => ({ ...prev, phone: true }))
        setTimeout(() => setShakeFields(prev => ({ ...prev, phone: false })), 500)
      } else {
        delete errors.phone
      }
    } else if (field === 'phone') {
      delete errors.phone
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    clearMessages()
    
    // Validate all fields
    const nameValid = validateField('full_name', formData.full_name)
    const phoneValid = formData.phone ? validateField('phone', formData.phone) : true // Phone is optional
    
    console.log('Validation:', { nameValid, phoneValid, formData })
    
    if (!nameValid || !phoneValid) {
      console.log('Validation failed')
      return
    }

    // Set saving state
    setSaveButtonState('saving')

    try {
      if (!profile?.id) {
        throw new Error('Profile ID not found')
      }

      console.log('Saving profile:', profile.id, formData)

      // Update the user profile in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          address: formData.address || null
        })
        .eq('id', profile.id)

      if (updateError) {
        console.error('Update error:', updateError)
        setSaveButtonState('idle')
        throw updateError
      }

      console.log('Profile saved successfully')
      
      // Set success state
      setSaveButtonState('success')
      
      // After 2 seconds, exit edit mode and reload
      setTimeout(() => {
        setIsEditing(false)
        setSaveButtonState('idle')
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Save failed:', error)
      setSaveButtonState('idle')
      // Show error to user
      alert('Failed to save profile: ' + (error as Error).message)
    }
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form
      setFormData({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        address: profile?.address || ''
      })
      setValidationErrors({})
    }
    setIsEditing(!isEditing)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Save Status Messages */}
      {saveError && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <ErrorMessage error={saveError} onDismiss={clearMessages} />
        </div>
      )}

      {saveSuccess && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <SuccessMessage message="Profile updated successfully!" onDismiss={clearMessages} />
        </div>
      )}

      {/* Profile Header with Animated Gradient Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-lg overflow-hidden">
        {/* Animated Gradient Header - Full height banner */}
        <div className="relative">
          {/* Banner Background */}
          <div className="h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden">
            {/* Background layers */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 hover:opacity-100 transition-opacity duration-1000" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
            
            {/* Floating particles */}
            <div className="absolute top-4 left-10 w-2 h-2 bg-white/30 rounded-full animate-float" />
            <div className="absolute top-8 right-20 w-3 h-3 bg-white/20 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-6 left-1/3 w-2 h-2 bg-white/40 rounded-full animate-float" style={{ animationDelay: '1s' }} />
            
            {/* Edit Profile Button - positioned on banner */}
            <div className="absolute top-4 right-4 z-10">
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={handleEditToggle}
                  className="mr-2 bg-white/90 hover:bg-white backdrop-blur-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                variant={isEditing ? 'default' : 'outline'}
                onClick={isEditing ? handleSave : handleEditToggle}
                disabled={saving || (isEditing && Object.keys(validationErrors).length > 0)}
                className={`relative overflow-hidden transition-all duration-300 ${
                  isEditing ? '' : 'bg-white/90 hover:bg-white backdrop-blur-sm'
                } ${
                  saveButtonState === 'success' ? 'bg-green-600 hover:bg-green-700' : ''
                } ${saveButtonState === 'saving' ? 'scale-95' : 'hover:scale-105'}`}
              >
                {saveButtonState === 'saving' ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saveButtonState === 'success' ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 animate-bounce" />
                    Saved!
                    <span className="absolute inset-0 bg-white/20 animate-ping rounded-lg" />
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Profile Content - Overlapping banner */}
          <div className="px-8 pb-6">
            <div className="flex items-start gap-6 -mt-16">
              {/* Profile Photo */}
              <div className="relative group/photo flex-shrink-0">
                <div className="w-32 h-32 bg-white dark:bg-zinc-900 rounded-full overflow-hidden flex items-center justify-center border-4 border-white dark:border-zinc-900 shadow-xl relative">
                  {profile?.photo_url || photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview || profile?.photo_url || ''}
                      alt={profile?.full_name || 'Owner'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-primary">
                      {profile?.full_name?.charAt(0) || 'O'}
                    </span>
                  )}
                  
                  {/* Animated border ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-primary/0 group-hover/photo:border-primary/50 transition-all duration-500" />
                  <div className="absolute inset-0 rounded-full animate-ping opacity-0 group-hover/photo:opacity-20 bg-primary" style={{ animationDuration: '2s' }} />
                </div>
                
                {/* Upload Overlay */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                >
                  <Upload className="w-8 h-8 text-white mb-1 animate-bounce" />
                  <p className="text-xs text-white font-medium">Change Photo</p>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Profile Info - On the banner */}
              <div className="flex-1 pt-16">
                <h2 className="text-3xl font-bold text-foreground">
                  {profile?.full_name || 'Owner'}
                </h2>
                <div className="text-muted-foreground mt-1 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  Mess Owner
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs font-mono bg-primary/10 text-primary px-3 py-1.5 rounded-full border border-primary/20">
                    ID: #{profile?.unique_short_id || '---'}
                  </span>
                  <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className={`bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm transition-all duration-500 ${
            isEditing ? 'ring-2 ring-primary/50 shadow-lg shadow-primary/10' : ''
          }`}>
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Personal Information</h3>
              {isEditing && (
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded-full animate-pulse">
                  Editing
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Full Name */}
              <div className="group">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => {
                        setFormData({ ...formData, full_name: e.target.value })
                      }}
                      onBlur={(e) => validateField('full_name', e.target.value)}
                      className={`w-full mt-2 px-4 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 transition-all duration-300 ${
                        validationErrors.full_name
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-input focus:ring-primary focus:shadow-lg focus:shadow-primary/20'
                      } ${shakeFields.full_name ? 'animate-shake' : ''}`}
                    />
                    {validationErrors.full_name && (
                      <div className="text-sm text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {validationErrors.full_name}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 font-medium text-lg">{profile?.full_name || 'Not set'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="mt-2 w-full px-4 py-2.5 border border-input rounded-lg bg-muted cursor-not-allowed opacity-75"
                />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div className="group">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                {isEditing ? (
                  <div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value })
                      }}
                      onBlur={(e) => validateField('phone', e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className={`w-full mt-2 px-4 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 transition-all duration-300 ${
                        validationErrors.phone
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-input focus:ring-primary focus:shadow-lg focus:shadow-primary/20'
                      } ${shakeFields.phone ? 'animate-shake' : ''}`}
                    />
                    {validationErrors.phone && (
                      <div className="text-sm text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {validationErrors.phone}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 font-medium">{formData.phone || 'Not set'}</p>
                )}
              </div>

              {/* Address */}
              <div className="group">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    placeholder="Enter your address"
                    className="w-full mt-2 px-4 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/20 resize-none"
                  />
                ) : (
                  <p className="mt-2 font-medium">{formData.address || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Account Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform duration-300">
                <label className="text-xs font-medium text-muted-foreground">User ID</label>
                <p className="mt-1 font-mono text-sm truncate">{profile?.id || 'N/A'}</p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300">
                <label className="text-xs font-medium text-muted-foreground">Short ID</label>
                <p className="mt-1 font-mono text-sm">#{profile?.unique_short_id || '---'}</p>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-green-50 to-transparent dark:from-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:scale-105 transition-transform duration-300">
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <div className="mt-1 font-medium text-sm flex items-center gap-1">
                  <Crown className="w-4 h-4 text-yellow-600" />
                  Owner
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-yellow-50 to-transparent dark:from-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:scale-105 transition-transform duration-300">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="mt-1 font-medium text-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                  Active
                </div>
              </div>
              
              <div className="col-span-2 p-4 bg-gradient-to-br from-gray-50 to-transparent dark:from-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Member Since
                </label>
                <p className="mt-1 font-medium text-sm">
                  {profile?.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Quick Stats */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Quick Stats</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Total Meals</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{stats.totalMeals}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Active Students</span>
                </div>
                <span className="text-lg font-bold text-green-600">{stats.activeStudents}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Total Revenue</span>
                </div>
                <span className="text-lg font-bold text-purple-600">₹{stats.monthlyRevenue.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">This Month</span>
                </div>
                <span className="text-lg font-bold text-yellow-600">{stats.thisMonth}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
