'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/settings-store'
import {
  Settings,
  DollarSign,
  Bell,
  Database,
  Mail,
  Clock,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Crown,
  Zap
} from 'lucide-react'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { ErrorMessage, SuccessMessage } from '@/components/ui/error-message'

interface SettingsData {
  mealPricing: {
    lunch: number
    dinner: number
  }
  subscriptionPlans: {
    monthlyLunchOnly: number
    monthlyDinnerOnly: number
    monthlyBothMeals: number
  }
  notifications: {
    emailAlerts: boolean
    lowBalanceAlert: boolean
    leaveRequests: boolean
    dailyReport: boolean
  }
  businessHours: {
    lunchStart: string
    lunchEnd: string
    dinnerStart: string
    dinnerEnd: string
  }
  general: {
    messName: string
    ownerEmail: string
    contactNumber: string
  }
}

// Toggle Switch Component
function ToggleSwitch({ checked, onChange, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function SettingsPanel() {
  // Zustand store
  const { mealSettings, notifications: storeNotifications, setMealSettings, setNotifications } = useSettingsStore()
  
  const [settings, setSettings] = useState<SettingsData>({
    mealPricing: {
      lunch: mealSettings.lunchPrice,
      dinner: mealSettings.dinnerPrice
    },
    subscriptionPlans: {
      monthlyLunchOnly: 1500,
      monthlyDinnerOnly: 1500,
      monthlyBothMeals: 3000
    },
    notifications: {
      emailAlerts: storeNotifications.email,
      lowBalanceAlert: true,
      leaveRequests: storeNotifications.push,
      dailyReport: false
    },
    businessHours: {
      lunchStart: mealSettings.lunchStartTime,
      lunchEnd: mealSettings.lunchEndTime,
      dinnerStart: mealSettings.dinnerStartTime,
      dinnerEnd: mealSettings.dinnerEndTime
    },
    general: {
      messName: 'Gokul Mess',
      ownerEmail: '',
      contactNumber: ''
    }
  })

  const [activeTab, setActiveTab] = useState<'pricing' | 'notifications' | 'hours' | 'general'>('pricing')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mealPricing: true,
    subscriptionPlans: true,
    businessInfo: true,
    systemInfo: false
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [saveButtonState, setSaveButtonState] = useState<'idle' | 'saving' | 'success'>('idle')
  
  const supabase = createClient()
  const { loading: saving, error: saveError, success: saveSuccess, execute: executeSave, clearMessages } = useAsyncOperation('Save Settings')

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setSettings(prev => ({
        ...prev,
        general: {
          ...prev.general,
          ownerEmail: user.email || ''
        }
      }))
    }
  }

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (saving) {
      setSaveButtonState('saving')
    } else if (saveSuccess) {
      setSaveButtonState('success')
      setTimeout(() => setSaveButtonState('idle'), 3000)
    } else {
      setSaveButtonState('idle')
    }
  }, [saving, saveSuccess])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const validateField = (field: string, value: string | number) => {
    const errors: Record<string, string> = { ...validationErrors }
    
    if (field === 'messName' && !value) {
      errors.messName = 'Mess name is required'
    } else if (field === 'messName') {
      delete errors.messName
    }
    
    if (field === 'ownerEmail' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
      errors.ownerEmail = 'Invalid email format'
    } else if (field === 'ownerEmail') {
      delete errors.ownerEmail
    }
    
    if (field === 'contactNumber' && value && !/^\+?[\d\s-]{10,}$/.test(value as string)) {
      errors.contactNumber = 'Invalid phone number'
    } else if (field === 'contactNumber') {
      delete errors.contactNumber
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    clearMessages()
    
    // Validate all fields
    const isValid = validateField('messName', settings.general.messName) &&
                   validateField('ownerEmail', settings.general.ownerEmail) &&
                   validateField('contactNumber', settings.general.contactNumber)
    
    if (!isValid) {
      return
    }

    await executeSave(async () => {
      // Save to zustand store
      setMealSettings({
        lunchStartTime: settings.businessHours.lunchStart,
        lunchEndTime: settings.businessHours.lunchEnd,
        dinnerStartTime: settings.businessHours.dinnerStart,
        dinnerEndTime: settings.businessHours.dinnerEnd,
        lunchPrice: settings.mealPricing.lunch,
        dinnerPrice: settings.mealPricing.dinner
      })
      
      setNotifications({
        email: settings.notifications.emailAlerts,
        push: settings.notifications.leaveRequests,
        sms: false
      })
      
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000))
    })
  }

  const tabs = [
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'hours', label: 'Business Hours', icon: Clock },
    { id: 'general', label: 'General', icon: Settings }
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-6 h-6 text-primary animate-pulse" />
            <h3 className="text-2xl font-bold">Settings</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure your mess management system
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || Object.keys(validationErrors).length > 0}
          className={`relative overflow-hidden transition-all duration-300 ${
            saveButtonState === 'success' ? 'bg-green-600 hover:bg-green-700' : ''
          } ${saveButtonState === 'saving' ? 'scale-95' : 'hover:scale-105'}`}
        >
          {saveButtonState === 'saving' ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveButtonState === 'success' ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2 animate-bounce" />
              Saved!
              <span className="absolute inset-0 bg-white/20 animate-ping rounded-lg" />
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Save Status Messages */}
      {saveError && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <ErrorMessage 
            error={saveError} 
            onDismiss={clearMessages}
          />
        </div>
      )}

      {saveSuccess && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          <SuccessMessage 
            message="Settings saved successfully!" 
            onDismiss={clearMessages}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-2 space-y-1">
            {tabs.map((tab, index) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg scale-105'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-102'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'slideIn 0.3s ease-out forwards'
                  }}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${
                    activeTab === tab.id ? 'scale-110 rotate-12' : 'group-hover:scale-110'
                  }`} />
                  <span className="font-medium">{tab.label}</span>
                  {activeTab === tab.id && (
                    <Zap className="w-4 h-4 ml-auto animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-6 animate-in fade-in slide-in-from-right-2 duration-500">
            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                {/* Meal Pricing Section */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('mealPricing')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 hover:from-blue-100 dark:hover:from-blue-900/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <h4 className="text-lg font-semibold">Subscription Meal Pricing</h4>
                    </div>
                    {expandedSections.mealPricing ? (
                      <ChevronUp className="w-5 h-5 transition-transform duration-300" />
                    ) : (
                      <ChevronDown className="w-5 h-5 transition-transform duration-300" />
                    )}
                  </button>
                  
                  {expandedSections.mealPricing && (
                    <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-sm text-muted-foreground">
                        Pricing for students with monthly subscriptions
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group">
                          <label className="block text-sm font-medium mb-2">
                            Lunch Price (₹)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={settings.mealPricing.lunch}
                              onChange={(e) => setSettings({
                                ...settings,
                                mealPricing: { ...settings.mealPricing, lunch: parseInt(e.target.value) || 0 }
                              })}
                              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
                            />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-focus-within:from-blue-500/10 group-focus-within:to-purple-500/10 pointer-events-none transition-all duration-500" />
                          </div>
                        </div>
                        <div className="group">
                          <label className="block text-sm font-medium mb-2">
                            Dinner Price (₹)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={settings.mealPricing.dinner}
                              onChange={(e) => setSettings({
                                ...settings,
                                mealPricing: { ...settings.mealPricing, dinner: parseInt(e.target.value) || 0 }
                              })}
                              className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
                            />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-focus-within:from-blue-500/10 group-focus-within:to-purple-500/10 pointer-events-none transition-all duration-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Subscription Plans Section */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('subscriptionPlans')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 hover:from-purple-100 dark:hover:from-purple-900/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <Crown className="w-5 h-5 text-purple-600" />
                      <h4 className="text-lg font-semibold">Monthly Subscription Plans</h4>
                      <span className="px-2 py-1 text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full animate-pulse">
                        Premium
                      </span>
                    </div>
                    {expandedSections.subscriptionPlans ? (
                      <ChevronUp className="w-5 h-5 transition-transform duration-300" />
                    ) : (
                      <ChevronDown className="w-5 h-5 transition-transform duration-300" />
                    )}
                  </button>
                  
                  {expandedSections.subscriptionPlans && (
                    <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-sm text-muted-foreground">
                        Monthly subscription options for different meal preferences
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="group relative overflow-hidden rounded-lg border-2 border-blue-200 dark:border-blue-800 p-4 hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full" />
                          <label className="block text-sm font-medium mb-2">
                            Lunch Only - Monthly (₹)
                          </label>
                          <input
                            type="number"
                            value={settings.subscriptionPlans.monthlyLunchOnly}
                            onChange={(e) => setSettings({
                              ...settings,
                              subscriptionPlans: { ...settings.subscriptionPlans, monthlyLunchOnly: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            30-day subscription for lunch only
                          </p>
                        </div>
                        <div className="group relative overflow-hidden rounded-lg border-2 border-purple-200 dark:border-purple-800 p-4 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-transparent rounded-bl-full" />
                          <label className="block text-sm font-medium mb-2">
                            Dinner Only - Monthly (₹)
                          </label>
                          <input
                            type="number"
                            value={settings.subscriptionPlans.monthlyDinnerOnly}
                            onChange={(e) => setSettings({
                              ...settings,
                              subscriptionPlans: { ...settings.subscriptionPlans, monthlyDinnerOnly: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            30-day subscription for dinner only
                          </p>
                        </div>
                        <div className="group relative overflow-hidden rounded-lg border-2 border-green-200 dark:border-green-800 p-4 hover:border-green-400 dark:hover:border-green-600 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/20 to-transparent rounded-bl-full" />
                          <Sparkles className="absolute top-2 right-2 w-4 h-4 text-green-600 animate-pulse" />
                          <label className="block text-sm font-medium mb-2">
                            Both Meals - Monthly (₹)
                          </label>
                          <input
                            type="number"
                            value={settings.subscriptionPlans.monthlyBothMeals}
                            onChange={(e) => setSettings({
                              ...settings,
                              subscriptionPlans: { ...settings.subscriptionPlans, monthlyBothMeals: parseInt(e.target.value) || 0 }
                            })}
                            className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            30-day subscription for both meals
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 animate-in fade-in duration-500">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Students can choose their preferred meal plan during subscription. Lunch Only and Dinner Only plans are for students who want fixed morning or evening meals for the entire month.
                  </p>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Bell className="w-5 h-5 text-primary animate-pulse" />
                    <h4 className="text-lg font-semibold">Notification Preferences</h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        key: 'emailAlerts',
                        icon: Mail,
                        title: 'Email Alerts',
                        description: 'Receive important updates via email',
                        color: 'blue'
                      },
                      {
                        key: 'lowBalanceAlert',
                        icon: AlertCircle,
                        title: 'Low Balance Alerts',
                        description: 'Notify when student balance is low',
                        color: 'orange'
                      },
                      {
                        key: 'leaveRequests',
                        icon: Bell,
                        title: 'Leave Requests',
                        description: 'Get notified of new leave requests',
                        color: 'purple'
                      },
                      {
                        key: 'dailyReport',
                        icon: Database,
                        title: 'Daily Report',
                        description: 'Receive end-of-day summary report',
                        color: 'green'
                      }
                    ].map((item, index) => {
                      const Icon = item.icon
                      const isEnabled = settings.notifications[item.key as keyof typeof settings.notifications]
                      return (
                        <div
                          key={item.key}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer group hover:scale-102 ${
                            isEnabled
                              ? `border-${item.color}-300 dark:border-${item.color}-700 bg-${item.color}-50 dark:bg-${item.color}-900/20 shadow-lg shadow-${item.color}-500/10`
                              : 'border-border hover:border-accent bg-background'
                          }`}
                          style={{
                            animationDelay: `${index * 100}ms`,
                            animation: 'slideIn 0.3s ease-out forwards'
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              isEnabled
                                ? `bg-${item.color}-100 dark:bg-${item.color}-900/40`
                                : 'bg-muted'
                            } group-hover:scale-110 group-hover:rotate-12`}>
                              <Icon className={`w-5 h-5 ${
                                isEnabled ? `text-${item.color}-600` : 'text-muted-foreground'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                          </div>
                          <ToggleSwitch
                            checked={isEnabled}
                            onChange={(checked) => setSettings({
                              ...settings,
                              notifications: { ...settings.notifications, [item.key]: checked }
                            })}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Business Hours Tab */}
            {activeTab === 'hours' && (
              <div className="space-y-6">
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h4 className="text-lg font-semibold">Lunch Hours</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="group">
                        <label className="block text-sm font-medium mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={settings.businessHours.lunchStart}
                          onChange={(e) => setSettings({
                            ...settings,
                            businessHours: { ...settings.businessHours, lunchStart: e.target.value }
                          })}
                          className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-sm font-medium mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={settings.businessHours.lunchEnd}
                          onChange={(e) => setSettings({
                            ...settings,
                            businessHours: { ...settings.businessHours, lunchEnd: e.target.value }
                          })}
                          className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <h4 className="text-lg font-semibold">Dinner Hours</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="group">
                        <label className="block text-sm font-medium mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={settings.businessHours.dinnerStart}
                          onChange={(e) => setSettings({
                            ...settings,
                            businessHours: { ...settings.businessHours, dinnerStart: e.target.value }
                          })}
                          className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-sm font-medium mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={settings.businessHours.dinnerEnd}
                          onChange={(e) => setSettings({
                            ...settings,
                            businessHours: { ...settings.businessHours, dinnerEnd: e.target.value }
                          })}
                          className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 animate-in fade-in duration-500">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> These hours determine automatic meal type detection (LUNCH/DINNER) during verification.
                  </p>
                </div>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Business Information Section */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('businessInfo')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-transparent dark:from-green-900/20 hover:from-green-100 dark:hover:from-green-900/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-green-600" />
                      <h4 className="text-lg font-semibold">Business Information</h4>
                    </div>
                    {expandedSections.businessInfo ? (
                      <ChevronUp className="w-5 h-5 transition-transform duration-300" />
                    ) : (
                      <ChevronDown className="w-5 h-5 transition-transform duration-300" />
                    )}
                  </button>
                  
                  {expandedSections.businessInfo && (
                    <div className="p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="group">
                        <label className="block text-sm font-medium mb-2">
                          Mess Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={settings.general.messName}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              general: { ...settings.general, messName: e.target.value }
                            })
                            validateField('messName', e.target.value)
                          }}
                          className={`w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 transition-all duration-300 ${
                            validationErrors.messName
                              ? 'border-red-500 focus:ring-red-500 animate-shake'
                              : 'border-input focus:ring-primary focus:shadow-lg focus:shadow-primary/20'
                          }`}
                        />
                        {validationErrors.messName && (
                          <p className="text-sm text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200">
                            {validationErrors.messName}
                          </p>
                        )}
                      </div>
                      <div className="group">
                        <label className="block text-sm font-medium mb-2">
                          Owner Email
                        </label>
                        <input
                          type="email"
                          value={settings.general.ownerEmail}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              general: { ...settings.general, ownerEmail: e.target.value }
                            })
                            validateField('ownerEmail', e.target.value)
                          }}
                          className={`w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 transition-all duration-300 ${
                            validationErrors.ownerEmail
                              ? 'border-red-500 focus:ring-red-500 animate-shake'
                              : 'border-input focus:ring-primary focus:shadow-lg focus:shadow-primary/20'
                          }`}
                        />
                        {validationErrors.ownerEmail && (
                          <p className="text-sm text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200">
                            {validationErrors.ownerEmail}
                          </p>
                        )}
                      </div>
                      <div className="group">
                        <label className="block text-sm font-medium mb-2">
                          Contact Number
                        </label>
                        <input
                          type="tel"
                          value={settings.general.contactNumber}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              general: { ...settings.general, contactNumber: e.target.value }
                            })
                            validateField('contactNumber', e.target.value)
                          }}
                          placeholder="+91 XXXXX XXXXX"
                          className={`w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 transition-all duration-300 ${
                            validationErrors.contactNumber
                              ? 'border-red-500 focus:ring-red-500 animate-shake'
                              : 'border-input focus:ring-primary focus:shadow-lg focus:shadow-primary/20'
                          }`}
                        />
                        {validationErrors.contactNumber && (
                          <p className="text-sm text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200">
                            {validationErrors.contactNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* System Information Section */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('systemInfo')}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-900/20 hover:from-gray-100 dark:hover:from-gray-900/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-gray-600" />
                      <h4 className="text-lg font-semibold">System Information</h4>
                    </div>
                    {expandedSections.systemInfo ? (
                      <ChevronUp className="w-5 h-5 transition-transform duration-300" />
                    ) : (
                      <ChevronDown className="w-5 h-5 transition-transform duration-300" />
                    )}
                  </button>
                  
                  {expandedSections.systemInfo && (
                    <div className="p-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors duration-300">
                        <span className="text-sm text-muted-foreground">Version</span>
                        <span className="text-sm font-medium">1.0.0</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors duration-300">
                        <span className="text-sm text-muted-foreground">Database</span>
                        <span className="text-sm font-medium">Supabase PostgreSQL</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors duration-300">
                        <span className="text-sm text-muted-foreground">Last Updated</span>
                        <span className="text-sm font-medium">
                          {new Date().toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
