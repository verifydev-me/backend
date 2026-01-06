/**
 * Application Timeline Component
 * Visual timeline showing application status progression
 * Production-ready with animations and status indicators
 */

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  XCircle,
  Clock,
  Eye,
  Star,
  Video,
  FileText,
  ThumbsUp,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatusChange, ApplicationStatus } from '@/types/application';
import { Badge } from '@/components/ui/badge';

interface ApplicationTimelineProps {
  statusHistory: StatusChange[];
  currentStatus: ApplicationStatus;
  className?: string;
}

const statusConfig: Record<
  ApplicationStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  PENDING: {
    icon: Clock,
    color: 'text-gray-500',
    label: 'Application Submitted',
  },
  REVIEWING: { icon: Eye, color: 'text-blue-500', label: 'Under Review' },
  SHORTLISTED: { icon: Star, color: 'text-purple-500', label: 'Shortlisted' },
  INTERVIEW: { icon: Video, color: 'text-orange-500', label: 'Interview Stage' },
  OFFER: { icon: FileText, color: 'text-green-500', label: 'Offer Extended' },
  ACCEPTED: { icon: ThumbsUp, color: 'text-green-600', label: 'Offer Accepted' },
  REJECTED: { icon: XCircle, color: 'text-red-500', label: 'Not Selected' },
  WITHDRAWN: { icon: Ban, color: 'text-gray-400', label: 'Withdrawn' },
};

export function ApplicationTimeline({
  statusHistory,
  currentStatus,
  className,
}: ApplicationTimelineProps) {
  const isActive = (status: ApplicationStatus) => status === currentStatus;
  const isPast = (index: number) => index < statusHistory.length - 1;

  return (
    <div className={cn('space-y-0', className)}>
      {statusHistory.map((change, index) => {
        const config = statusConfig[change.to];
        const Icon = config.icon;
        const active = isActive(change.to);
        const past = isPast(index);

        return (
          <motion.div
            key={`${change.to}-${change.changedAt}`}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-8 pb-8 last:pb-0"
          >
            {/* Timeline Line */}
            {index < statusHistory.length - 1 && (
              <div
                className={cn(
                  'absolute left-[11px] top-6 w-0.5 h-full',
                  past ? 'bg-primary' : 'bg-gray-200'
                )}
              />
            )}

            {/* Status Icon */}
            <div
              className={cn(
                'absolute left-0 top-0 rounded-full p-1.5 border-2',
                active && 'ring-4 ring-primary/20',
                past
                  ? 'bg-primary border-primary'
                  : active
                  ? 'bg-background border-primary'
                  : 'bg-background border-gray-200'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4',
                  past
                    ? 'text-white'
                    : active
                    ? 'text-primary'
                    : 'text-gray-400'
                )}
              />
            </div>

            {/* Status Content */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4
                  className={cn(
                    'font-medium',
                    active ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {config.label}
                </h4>
                {active && (
                  <Badge variant="default" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {format(new Date(change.changedAt), 'PPp')}
              </p>

              {change.reason && (
                <p className="text-sm text-muted-foreground italic mt-1">
                  "{change.reason}"
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
