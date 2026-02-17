import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MealSettings {
  lunchStartTime: string
  lunchEndTime: string
  dinnerStartTime: string
  dinnerEndTime: string
  lunchPrice: number
  dinnerPrice: number
}

interface SettingsState {
  mealSettings: MealSettings
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  setMealSettings: (settings: MealSettings) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setNotifications: (notifications: { email: boolean; push: boolean; sms: boolean }) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      mealSettings: {
        lunchStartTime: '12:00',
        lunchEndTime: '14:00',
        dinnerStartTime: '19:00',
        dinnerEndTime: '21:00',
        lunchPrice: 50,
        dinnerPrice: 50,
      },
      theme: 'system',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      setMealSettings: (settings) => set({ mealSettings: settings }),
      setTheme: (theme) => set({ theme }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: 'settings-storage',
    }
  )
)
