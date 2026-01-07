/**
 * NotificationBell Component
 * Shows unread notification count with dropdown
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { 
  useNotifications, 
  useUnreadNotificationCount, 
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead 
} from '@/hooks/use-notifications'
import type { Notification as AppNotification } from '@/api/services/notification.service'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  Bell, 
  BellRing,
  Briefcase,
  Star,
  Sparkles,
  GitBranch,
  Calendar,
  CheckCircle2,
  Info,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  APPLICATION_RECEIVED: Briefcase,
  APPLICATION_STATUS_CHANGED: CheckCircle2,
  JOB_MATCH: Star,
  AURA_UPDATED: Sparkles,
  PROJECT_ANALYZED: GitBranch,
  SHORTLISTED: Star,
  INTERVIEW_SCHEDULED: Calendar,
  OFFER_RECEIVED: CheckCircle2,
  SYSTEM: Info,
}

const NOTIFICATION_COLORS: Record<string, string> = {
  APPLICATION_RECEIVED: 'text-blue-500',
  APPLICATION_STATUS_CHANGED: 'text-purple-500',
  JOB_MATCH: 'text-yellow-500',
  AURA_UPDATED: 'text-green-500',
  PROJECT_ANALYZED: 'text-cyan-500',
  SHORTLISTED: 'text-yellow-500',
  INTERVIEW_SCHEDULED: 'text-orange-500',
  OFFER_RECEIVED: 'text-green-500',
  SYSTEM: 'text-muted-foreground',
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: notifications = [], isLoading } = useNotifications({ limit: 10 })
  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()

  const hasUnread = unreadCount > 0

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <motion.div
            animate={hasUnread ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.5, repeat: hasUnread ? Infinity : 0, repeatDelay: 5 }}
          >
            {hasUnread ? (
              <BellRing className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </motion.div>
          
          {hasUnread && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Mark all read
                </>
              )}
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-10 h-10 mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((notification, index) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  index={index}
                />
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Link to="/notifications" onClick={() => setIsOpen(false)}>
              <Button variant="ghost" className="w-full" size="sm">
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface NotificationItemProps {
  notification: AppNotification
  onClick: () => void
  index: number
}

function NotificationItem({ notification, onClick, index }: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell
  const iconColor = NOTIFICATION_COLORS[notification.type] || 'text-muted-foreground'

  const getLink = (): string | undefined => {
    const { data } = notification
    if (!data) return undefined

    switch (notification.type) {
      case 'JOB_MATCH':
      case 'APPLICATION_STATUS_CHANGED':
        return data.jobId ? `/jobs/${data.jobId}` : undefined
      case 'APPLICATION_RECEIVED':
        return data.applicationId ? `/recruiter/applications` : undefined
      case 'PROJECT_ANALYZED':
        return data.projectId ? `/projects/${data.projectId}` : undefined
      case 'AURA_UPDATED':
        return '/dashboard'
      default:
        return undefined
    }
  }

  const link = getLink()
  const Wrapper = link ? Link : 'div'
  const wrapperProps = link ? { to: link } : {}

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Wrapper
        {...wrapperProps as any}
        onClick={onClick}
        className={cn(
          'flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-b last:border-b-0',
          !notification.read && 'bg-blue-50/50 dark:bg-blue-950/20'
        )}
      >
        <div className={cn('p-2 rounded-full bg-muted', iconColor)}>
          <Icon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              'text-sm',
              !notification.read && 'font-medium'
            )}>
              {notification.title}
            </p>
            {!notification.read && (
              <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
      </Wrapper>
    </motion.div>
  )
}
