import { motion, AnimatePresence } from 'framer-motion'
import Lottie from 'lottie-react'
import { successAnimation } from './lottie-data'
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface FeedbackAnimationProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  onClose?: () => void
  show: boolean
  autoClose?: boolean
  autoCloseDuration?: number
}

const typeConfig = {
  success: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
}

export function FeedbackAnimation({
  type,
  title,
  message,
  actionLabel,
  onAction,
  onClose,
  show,
  autoClose = true,
  autoCloseDuration = 3000,
}: FeedbackAnimationProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 z-50 w-96"
        >
          <Card className={`border ${config.borderColor} ${config.bgColor}`}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {type === 'success' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="w-12 h-12 flex-shrink-0"
                  >
                    <Lottie animationData={successAnimation} loop={false} />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  >
                    <Icon className={`h-12 w-12 ${config.color}`} />
                  </motion.div>
                )}

                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{title}</h3>
                  {message && <p className="text-sm text-muted-foreground">{message}</p>}
                  
                  {(actionLabel || onClose) && (
                    <div className="flex items-center gap-2 mt-4">
                      {actionLabel && onAction && (
                        <Button size="sm" onClick={onAction}>
                          {actionLabel}
                        </Button>
                      )}
                      {onClose && (
                        <Button size="sm" variant="ghost" onClick={onClose}>
                          Dismiss
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {autoClose && (
                <motion.div
                  className={`absolute bottom-0 left-0 h-1 ${config.bgColor.replace('/10', '/30')}`}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: autoCloseDuration / 1000, ease: 'linear' }}
                  onAnimationComplete={onClose}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Simple toast-style notification
export function Toast({
  type,
  message,
  show,
  onClose,
}: {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  show: boolean
  onClose?: () => void
}) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${config.borderColor} ${config.bgColor} shadow-lg`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
            <span className="font-medium">{message}</span>
            {onClose && (
              <button onClick={onClose} className="ml-2">
                <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
