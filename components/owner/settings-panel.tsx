'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
  AlertCircle
} from 'lucide-react'
import { useAsyncOperation } from '@/hooks/use-error-handler'
import { validateRequired } from '@/lib/error-handler'
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

export function SettingsPanel() {
  const [settings, setSettings] = useState<SettingsData>({
    mealPricing: {
      lunch: 50,
      dinner: 50
    },
    subscriptionPlans: {
      monthlyLunchOnly: 1500,
      monthlyDinnerOnly: 1500,
      monthlyBothMeals: 3000
    },
    notifications: {
      emailAlerts: true,
      lowBalanceAlert: true,
      leaveRequests: true,
      dailyReport: false
    },
    businessHours: {
      lunchStart: '12:00',
      lunchEnd: '14:00',
      dinnerStart: '19:00',
      dinnerEnd: '21:00'
    },
    general: {
      messName: 'Gokul Mess',
      ownerEmail: '',
      contactNumber: ''
    }
  })

  const [activeTab, setActiveTab] = useState<'pricing' | 'notifications' | 'hours' | 'general'>('pricing')
  const supabase = createClient()
  const { loading: saving, error: saveError, success: saveSuccess, execute: executeSave, clearMessages } = useAsyncOperation('Save Settings')

  const loadSettings = async () => {
    // In production, load from database
    // For now, using default values
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

  const handleSave = async () => {
    clearMessages()
    
    // Validate required fields
    const validationError = validateRequired(settings.general, ['messName'])
    if (validationError) return

    await executeSave(async () => {
      // Simulate save operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In production, save to database
      // await supabase.from('settings').upsert(settings)
    })
  }

  const tabs = [
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'hours', label: 'Business Hours', icon: Clock },
    { id: 'general', label: 'General', icon: Settings }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your mess management system
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Saved
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
        <ErrorMessage 
          error={saveError} 
          onDismiss={clearMessages}
        />
      )}

      {saveSuccess && (
        <SuccessMessage 
          message="Settings saved successfully!" 
          onDismiss={clearMessages}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'general' | 'notifications')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-6">
            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Subscription Meal Pricing</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Pricing for students with monthly subscriptions
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Lunch Price (₹)
                      </label>
                      <input
                        type="number"
                        value={settings.mealPricing.lunch}
                        onChange={(e) => setSettings({
                          ...settings,
                          mealPricing: { ...settings.mealPricing, lunch: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Dinner Price (₹)
                      </label>
                      <input
                        type="number"
                        value={settings.mealPricing.dinner}
                        onChange={(e) => setSettings({
                          ...settings,
                          mealPricing: { ...settings.mealPricing, dinner: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="text-lg font-semibold mb-4">Monthly Subscription Plans</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Monthly subscription options for different meal preferences
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Lunch Only - Monthly (₹)
                      </label>
                      <input
                        type="number"
                        value={settings.subscriptionPlans.monthlyLunchOnly}
                        onChange={(e) => setSettings({
                          ...settings,
                          subscriptionPlans: { ...settings.subscriptionPlans, monthlyLunchOnly: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        30-day subscription for lunch only (morning meal)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Dinner Only - Monthly (₹)
                      </label>
                      <input
                        type="number"
                        value={settings.subscriptionPlans.monthlyDinnerOnly}
                        onChange={(e) => setSettings({
                          ...settings,
                          subscriptionPlans: { ...settings.subscriptionPlans, monthlyDinnerOnly: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        30-day subscription for dinner only (evening meal)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Both Meals - Monthly (₹)
                      </label>
                      <input
                        type="number"
                        value={settings.subscriptionPlans.monthlyBothMeals}
                        onChange={(e) => setSettings({
                          ...settings,
                          subscriptionPlans: { ...settings.subscriptionPlans, monthlyBothMeals: parseInt(e.target.value) }
                        })}
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        30-day subscription for both lunch and dinner
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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
                  <h4 className="text-lg font-semibold mb-4">Notification Preferences</h4>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email Alerts</p>
                          <p className="text-sm text-muted-foreground">
                            Receive important updates via email
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailAlerts}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, emailAlerts: e.target.checked }
                        })}
                        className="w-5 h-5 rounded border-input"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Low Balance Alerts</p>
                          <p className="text-sm text-muted-foreground">
                            Notify when student balance is low
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.lowBalanceAlert}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, lowBalanceAlert: e.target.checked }
                        })}
                        className="w-5 h-5 rounded border-input"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Leave Requests</p>
                          <p className="text-sm text-muted-foreground">
                            Get notified of new leave requests
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.leaveRequests}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, leaveRequests: e.target.checked }
                        })}
                        className="w-5 h-5 rounded border-input"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Daily Report</p>
                          <p className="text-sm text-muted-foreground">
                            Receive end-of-day summary report
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.dailyReport}
                        onChange={(e) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, dailyReport: e.target.checked }
                        })}
                        className="w-5 h-5 rounded border-input"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Business Hours Tab */}
            {activeTab === 'hours' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Lunch Hours</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
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
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
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
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="text-lg font-semibold mb-4">Dinner Hours</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
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
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
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
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> These hours determine automatic meal type detection (LUNCH/DINNER) during verification.
                  </p>
                </div>
              </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Business Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Mess Name
                      </label>
                      <input
                        type="text"
                        value={settings.general.messName}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, messName: e.target.value }
                        })}
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Owner Email
                      </label>
                      <input
                        type="email"
                        value={settings.general.ownerEmail}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, ownerEmail: e.target.value }
                        })}
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        value={settings.general.contactNumber}
                        onChange={(e) => setSettings({
                          ...settings,
                          general: { ...settings.general, contactNumber: e.target.value }
                        })}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="text-lg font-semibold mb-4">System Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Version</span>
                      <span className="text-sm font-medium">1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Database</span>
                      <span className="text-sm font-medium">Supabase PostgreSQL</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Last Updated</span>
                      <span className="text-sm font-medium">
                        {new Date().toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
