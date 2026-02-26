'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, CheckCircle, XCircle, Clock, X } from 'lucide-react'

interface NotificationItem {
  type: string
  title: string
  message: string
  time: string
}

interface NotificationsContentProps {
  notifications: NotificationItem[]
  /** Whether to use enhanced mode with swipe, filters, auto-dismiss (owner) */
  enhanced?: boolean
}

/**
 * Full-page notifications list. Used by both owner (enhanced) and student (simple) dashboards.
 */
export function NotificationsContent({ notifications: initialNotifications, enhanced = false }: NotificationsContentProps) {
  if (enhanced) {
    return <EnhancedNotifications initialNotifications={initialNotifications} />
  }
  return <SimpleNotifications notifications={initialNotifications} />
}

// --- Simple Notifications (Student) ---

function SimpleNotifications({ notifications }: { notifications: NotificationItem[] }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">All Notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {notifications.length > 0
                ? `${notifications.length} notification${notifications.length > 1 ? 's' : ''}`
                : 'No notifications yet'}
            </p>
          </div>
          {notifications.length > 0 && (
            <Button variant="outline" size="sm">
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        {notifications.length > 0 ? (
          <div className="divide-y divide-border">
            {notifications.map((notification, index: number) => (
              <div
                key={index}
                className="p-6 hover:bg-accent transition-colors cursor-pointer animate-in slide-in-from-left duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.type === 'info'
                        ? 'bg-blue-100 dark:bg-blue-900/20'
                        : notification.type === 'warning'
                          ? 'bg-orange-100 dark:bg-orange-900/20'
                          : 'bg-green-100 dark:bg-green-900/20'
                    }`}
                  >
                    <Bell
                      className={`w-5 h-5 ${
                        notification.type === 'info'
                          ? 'text-blue-600 dark:text-blue-400'
                          : notification.type === 'warning'
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <h4 className="text-lg font-semibold mb-2">No notifications yet</h4>
            <p className="text-sm text-muted-foreground">
              You&apos;ll see important updates and alerts here when they arrive
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Enhanced Notifications (Owner) ---

const getPriority = (type: string): 'high' | 'medium' | 'low' => {
  if (type === 'warning') {
    return 'high'
  }
  if (type === 'info') {
    return 'medium'
  }
  return 'low'
}

function EnhancedNotifications({ initialNotifications }: { initialNotifications: NotificationItem[] }) {
  const [notifications, setNotifications] = useState(
    initialNotifications.map((n, i) => ({
      ...n,
      id: `notif-${i}`,
      read: false,
      priority: getPriority(n.type),
      dismissing: false,
      swipeOffset: 0,
    }))
  )
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const touchStartX = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, dismissing: true } : n)))
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 500)
  }, [])

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    notifications.forEach((notif) => {
      if (notif.priority === 'high' && !notif.read) {
        const timer = setTimeout(() => handleMarkAsRead(notif.id), 10000)
        timers.push(timer)
      }
    })
    return () => timers.forEach((timer) => clearTimeout(timer))
  }, [notifications, handleMarkAsRead])

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, dismissing: true })))
    setTimeout(() => setNotifications([]), 500)
  }

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, dismissing: true } : n)))
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 300)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    touchCurrentX.current = e.touches[0].clientX
    const offset = touchCurrentX.current - touchStartX.current
    if (offset < 0) {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, swipeOffset: offset } : n)))
    }
  }

  const handleTouchEnd = (id: string) => {
    const notification = notifications.find((n) => n.id === id)
    if (notification && notification.swipeOffset < -100) {
      handleDismiss(id)
    } else {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, swipeOffset: 0 } : n)))
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return Bell
      case 'warning': return Clock
      case 'success': return CheckCircle
      case 'error': return XCircle
      default: return Bell
    }
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read
    if (filter === 'read') return n.read
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header with Filters */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary animate-pulse" />
              All Notifications
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-950/20 dark:hover:text-green-400 dark:hover:border-green-900/50 transition-all group"
            >
              <CheckCircle className="w-4 h-4 mr-2 group-hover:animate-bounce" />
              Mark all as read
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {(['all', 'unread', 'read'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {f === 'all'
                ? `All (${notifications.length})`
                : f === 'unread'
                  ? `Unread (${unreadCount})`
                  : `Read (${notifications.length - unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
        {filteredNotifications.length > 0 ? (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type)
              return (
                <div
                  key={notification.id}
                  className={`relative overflow-hidden transition-all duration-300 ${
                    notification.dismissing ? 'opacity-0 scale-95 -translate-x-full' : 'opacity-100 scale-100'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    transform: `translateX(${notification.swipeOffset}px)`,
                    transition: notification.swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none',
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={(e) => handleTouchMove(e, notification.id)}
                  onTouchEnd={() => handleTouchEnd(notification.id)}
                >
                  {notification.priority === 'high' && !notification.read && (
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent animate-pulse pointer-events-none" />
                  )}
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/80 to-primary/60 animate-pulse" />
                  )}

                  <div
                    className={`p-6 hover:bg-accent transition-all cursor-pointer group animate-in slide-in-from-right-4 duration-300 ${
                      notification.read ? 'opacity-60' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative transition-all duration-300 group-hover:scale-110 ${
                          notification.type === 'info' ? 'bg-blue-100 dark:bg-blue-900/20' :
                          notification.type === 'warning' ? 'bg-orange-100 dark:bg-orange-900/20' :
                          notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/20' :
                          notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/20' :
                          'bg-gray-100 dark:bg-gray-900/20'
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 transition-all duration-300 ${
                            notification.type === 'info' ? 'text-blue-600 dark:text-blue-400' :
                            notification.type === 'warning' ? 'text-orange-600 dark:text-orange-400 group-hover:animate-bounce' :
                            notification.type === 'success' ? 'text-green-600 dark:text-green-400' :
                            notification.type === 'error' ? 'text-red-600 dark:text-red-400' :
                            'text-gray-600 dark:text-gray-400'
                          } ${!notification.read ? 'animate-pulse' : ''}`}
                        />
                        {notification.priority === 'high' && !notification.read && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 animate-ping" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </h4>
                          {notification.priority === 'high' && !notification.read && (
                            <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full animate-pulse">
                              Priority
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{notification.message}</p>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {notification.time}
                          </p>
                          {!notification.read && <span className="text-xs font-medium text-primary">New</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id) }}
                            className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-all hover:scale-110"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismiss(notification.id) }}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-all hover:scale-110"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {notification.priority === 'high' && !notification.read && (
                      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-red-500 animate-countdown"
                          style={{ animation: 'countdown 10s linear forwards' }}
                        />
                      </div>
                    )}
                  </div>

                  {notification.swipeOffset < -20 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600 dark:text-red-400 animate-pulse">
                      <X className="w-6 h-6" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Bell className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <h4 className="text-lg font-semibold mb-2">
              {filter === 'unread' ? 'No unread notifications' : filter === 'read' ? 'No read notifications' : 'No notifications yet'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {filter === 'all'
                ? "You'll see important updates and alerts here when they arrive"
                : `Switch to "${filter === 'unread' ? 'All' : 'Unread'}" to see other notifications`}
            </p>
          </div>
        )}
      </div>

      {filteredNotifications.length > 0 && (
        <div className="text-center text-xs text-muted-foreground animate-in fade-in duration-700 delay-500">
          💡 Tip: Swipe left to dismiss notifications
        </div>
      )}
    </div>
  )
}
