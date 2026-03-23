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

export interface MealPlanPricingStore {
  lunchOnlyPrice: number
  dinnerOnlyPrice: number
  bothMealsPrice: number
}

interface SettingsState {
  mealSettings: MealSettings
  mealPlanPricing: MealPlanPricingStore
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  setMealSettings: (settings: MealSettings) => void
  setMealPlanPricing: (pricing: MealPlanPricingStore) => void
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
      mealPlanPricing: {
        lunchOnlyPrice: 1500,
        dinnerOnlyPrice: 1500,
        bothMealsPrice: 3000,
      },
      theme: 'system',
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      setMealSettings: (settings) => set({ mealSettings: settings }),
      setMealPlanPricing: (pricing) => set({ mealPlanPricing: pricing }),
      setTheme: (theme) => set({ theme }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: 'settings-storage',
    }
  )
)
