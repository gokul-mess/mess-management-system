'use client'

import { Zap } from 'lucide-react'

interface NavItemProps {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
  collapsed: boolean
}

/**
 * Reusable sidebar navigation item with enhanced hover/active effects.
 * Used in both owner and student dashboard sidebars.
 */
export function NavItem({ icon: Icon, label, active, onClick, collapsed }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group ${
        active
          ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30'
          : 'text-muted-foreground hover:bg-gradient-to-r hover:from-accent hover:to-accent/50 hover:text-accent-foreground'
      }`}
      title={collapsed ? label : ''}
    >
      {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
      )}
      <Icon
        className={`w-5 h-5 flex-shrink-0 relative z-10 transition-transform duration-300 ${
          active ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-12'
        }`}
      />
      {!collapsed && <span className="font-medium relative z-10">{label}</span>}
      {active && !collapsed && <Zap className="w-4 h-4 ml-auto animate-pulse" />}
    </button>
  )
}
