/**
 * Notifications Page
 * View and manage all notifications
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  useNotifications, 
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead 
} from '@/hooks/use-notifications'
import { Notification } from '@/api/services/notification.service'
import { 
  Bell, 
  Briefcase,
  Star,
  Sparkles,
  GitBranch,
  Calendar,
  CheckCircle2,
  Info,
  Check,
  Loader2,
  ArrowLeft,
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
  APPLICATION_RECEIVED: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  APPLICATION_STATUS_CHANGED: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  JOB_MATCH: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
  AURA_UPDATED: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  PROJECT_ANALYZED: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30',
  SHORTLISTED: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
  INTERVIEW_SCHEDULED: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
  OFFER_RECEIVED: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  SYSTEM: 'text-gray-500 bg-gray-100 dark:bg-gray-900/30',
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()

  const unreadCount = notifications.filter((n: Notification) => !n.read).length
  const unreadNotifications = notifications.filter((n: Notification) => !n.read)

  const handleMarkAsRead = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Mark all as read
            </Button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground text-center">
              When you receive notifications, they'll appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="space-y-3">
              <AnimatePresence>
                {notifications.map((notification, index) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleMarkAsRead(notification)}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="unread">
            <div className="space-y-3">
              {unreadNotifications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                    <p className="text-muted-foreground">You're all caught up!</p>
                  </CardContent>
                </Card>
              ) : (
                <AnimatePresence>
                  {unreadNotifications.map((notification, index) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleMarkAsRead(notification)}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

interface NotificationCardProps {
  notification: Notification
  onClick: () => void
  index: number
}

function NotificationCard({ notification, onClick, index }: NotificationCardProps) {
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell
  const colorClass = NOTIFICATION_COLORS[notification.type] || 'text-gray-500 bg-gray-100'

  const getLink = (): string | undefined => {
    const { data } = notification
    if (!data) return undefined

    switch (notification.type) {
      case 'JOB_MATCH':
      case 'APPLICATION_STATUS_CHANGED':
        return data.jobId ? `/jobs/${data.jobId}` : undefined
      case 'APPLICATION_RECEIVED':
        return '/recruiter/applications'
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card 
        className={cn(
          'cursor-pointer hover:shadow-md transition-all',
          !notification.read && 'border-l-4 border-l-primary'
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <Wrapper {...wrapperProps as any} className="block">
            <div className="flex items-start gap-4">
              <div className={cn('p-3 rounded-full', colorClass)}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={cn(
                    'text-base',
                    !notification.read && 'font-semibold'
                  )}>
                    {notification.title}
                  </h3>
                  {!notification.read && (
                    <Badge className="bg-primary text-primary-foreground">
                      New
                    </Badge>
                  )}
                </div>
                
                <p className="text-muted-foreground mb-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                  <span>•</span>
                  <span>
                    {format(new Date(notification.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </Wrapper>
        </CardContent>
      </Card>
    </motion.div>
  )
}
