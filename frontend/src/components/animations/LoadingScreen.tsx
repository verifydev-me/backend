import Lottie from 'lottie-react'
import { motion } from 'framer-motion'
import { loadingAnimation } from './lottie-data'

interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingScreen({ message = 'Loading...', fullScreen = true }: LoadingScreenProps) {
  if (!fullScreen) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-32 h-32">
          <Lottie animationData={loadingAnimation} loop />
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-muted-foreground"
        >
          {message}
        </motion.p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-48 h-48"
        >
          <Lottie animationData={loadingAnimation} loop />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-2xl font-semibold"
        >
          {message}
        </motion.h2>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-4 h-1 w-48 bg-primary/20 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-primary"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}

export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  return (
    <div className={`animate-spin rounded-full border-primary border-t-transparent ${sizeClasses[size]} ${className}`} />
  )
}
