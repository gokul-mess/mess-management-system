import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  activeTab: string
  showNotifications: boolean
  showSearch: boolean
  showParcelOTP: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  setActiveTab: (tab: string) => void
  setShowNotifications: (show: boolean) => void
  setShowSearch: (show: boolean) => void
  setShowParcelOTP: (show: boolean) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeTab: 'dashboard',
  showNotifications: false,
  showSearch: false,
  showParcelOTP: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowNotifications: (show) => set({ showNotifications: show }),
  setShowSearch: (show) => set({ showSearch: show }),
  setShowParcelOTP: (show) => set({ showParcelOTP: show }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
