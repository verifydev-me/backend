/**
 * Application Card Component
 * Displays application summary with actions
 * Production-ready with hover effects and status indicators
 */

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  MessageCircle,
  Eye,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ApplicationWithDetails } from '@/types/application';
import {
  getApplicationStatusColor,
  getApplicationStatusLabel,
  getMatchScoreColor,
  formatMatchScore,
} from '@/api/services/application.service';

interface ApplicationCardProps {
  application: ApplicationWithDetails;
  onViewDetails?: () => void;
  onWithdraw?: () => void;
  onMessage?: () => void;
  className?: string;
}

export function ApplicationCard({
  application,
  onViewDetails,
  onWithdraw,
  onMessage,
  className,
}: ApplicationCardProps) {
  const statusColor = getApplicationStatusColor(application.status);
  const matchScore = application.matchScore?.overall || 0;
  const matchScoreColor = getMatchScoreColor(matchScore);

  const canWithdraw = !['REJECTED', 'WITHDRAWN', 'ACCEPTED'].includes(
    application.status
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn('group hover:shadow-lg transition-shadow', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {application.job.companyLogo && (
                <Avatar className="w-12 h-12 border">
                  <AvatarImage src={application.job.companyLogo} />
                  <AvatarFallback>
                    {application.job.companyName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="flex-1 min-w-0">
                <Link
                  to={`/job-detail/${application.jobId}`}
                  className="hover:underline"
                >
                  <h3 className="font-semibold text-lg truncate">
                    {application.job.title}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{application.job.companyName}</span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{application.job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{application.job.type.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onViewDetails && (
                  <DropdownMenuItem onClick={onViewDetails}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onMessage && (
                  <DropdownMenuItem onClick={onMessage}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message Recruiter
                  </DropdownMenuItem>
                )}
                {canWithdraw && onWithdraw && (
                  <DropdownMenuItem onClick={onWithdraw} className="text-red-600">
                    Withdraw Application
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge className={cn('capitalize', `bg-${statusColor}-100 text-${statusColor}-700`)}>
              {getApplicationStatusLabel(application.status)}
            </Badge>
            {application.interviews && application.interviews.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {application.interviews.length} Interview
                {application.interviews.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Match Score */}
          {application.matchScore && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Match Score</span>
                <span className={cn('font-semibold', `text-${matchScoreColor}-600`)}>
                  {formatMatchScore(matchScore)}
                </span>
              </div>
              <div className="relative">
                <Progress value={matchScore} className="h-2" />
                <div
                  className={cn(
                    'absolute top-0 left-0 h-2 rounded-full',
                    `bg-${matchScoreColor}-500`
                  )}
                  style={{ width: `${matchScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Skills Match */}
          {application.matchScore?.breakdown.skills && (
            <div className="flex flex-wrap gap-1.5">
              {application.matchScore.breakdown.skills.matched
                .slice(0, 5)
                .map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              {application.matchScore.breakdown.skills.matched.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{application.matchScore.breakdown.skills.matched.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {/* Applied Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Calendar className="w-4 h-4" />
            <span>Applied {format(new Date(application.appliedAt), 'PP')}</span>
          </div>
        </CardContent>

        {onViewDetails && (
          <CardFooter className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={onViewDetails}
            >
              View Full Application
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
