/**
 * Match Score Card Component
 * Displays detailed match scoring breakdown with visual indicators
 * Production-ready with animations and accessibility
 */

import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Target,
  Zap,
  Briefcase,
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from 'lucide-react';
import type { MatchScore } from '@/types/application';
import { cn } from '@/lib/utils';

interface MatchScoreCardProps {
  matchScore: MatchScore;
  className?: string;
  showDetails?: boolean;
}

export function MatchScoreCard({
  matchScore,
  className,
  showDetails = true,
}: MatchScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (score: number, threshold: number = 70) => {
    if (score >= threshold) return <TrendingUp className="w-4 h-4" />;
    if (score >= threshold - 20) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const factors = [
    {
      key: 'skills',
      label: 'Skills Match',
      icon: Target,
      data: matchScore.breakdown.skills,
      description: `${matchScore.breakdown.skills.matched.length} of ${
        matchScore.breakdown.skills.matched.length +
        matchScore.breakdown.skills.missing.length
      } skills matched`,
    },
    {
      key: 'aura',
      label: 'Aura Score',
      icon: Zap,
      data: matchScore.breakdown.aura,
      description: `Your aura: ${matchScore.breakdown.aura.candidateScore} / Required: ${matchScore.breakdown.aura.requiredScore}`,
    },
    {
      key: 'experience',
      label: 'Experience',
      icon: Briefcase,
      data: matchScore.breakdown.experience,
      description: `${matchScore.breakdown.experience.candidateYears} years (${matchScore.breakdown.experience.requiredYears} required)`,
    },
    {
      key: 'location',
      label: 'Location',
      icon: MapPin,
      data: matchScore.breakdown.location,
      description: matchScore.breakdown.location.isMatch
        ? 'Location matches'
        : matchScore.breakdown.location.distance
        ? `${matchScore.breakdown.location.distance}km away`
        : 'Different location',
    },
    {
      key: 'availability',
      label: 'Availability',
      icon: Calendar,
      data: matchScore.breakdown.availability,
      description: matchScore.breakdown.availability.isAvailable
        ? 'Available to join'
        : 'Notice period applies',
    },
  ];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Match Score
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Your match score is calculated based on skills, experience, aura
                  score, location, and availability.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'rounded-lg border-2 p-6 text-center',
            getScoreColor(matchScore.overall)
          )}
        >
          <div className="text-5xl font-bold mb-2">
            {Math.round(matchScore.overall)}%
          </div>
          <div className="text-sm font-medium uppercase tracking-wide">
            {getScoreLabel(matchScore.overall)}
          </div>
        </motion.div>

        {/* Detailed Breakdown */}
        {showDetails && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Score Breakdown
            </h4>

            {factors.map((factor, index) => {
              const Icon = factor.icon;
              const score = factor.data.score;
              const weight = factor.data.weight;

              return (
                <motion.div
                  key={factor.key}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{factor.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {weight}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {Math.round(score)}%
                      </span>
                      {getTrendIcon(score)}
                    </div>
                  </div>

                  <div className="relative">
                    <Progress value={score} className="h-2" />
                    <div
                      className={cn(
                        'absolute top-0 left-0 h-2 rounded-full transition-all',
                        getProgressColor(score)
                      )}
                      style={{ width: `${score}%` }}
                    />
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-muted-foreground cursor-help">
                          {factor.description}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Contributes {weight}% to overall match score
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Skills Detail */}
        {showDetails && matchScore.breakdown.skills.matched.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">
              Matched Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {matchScore.breakdown.skills.matched.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-xs">
                  ✓ {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {showDetails && matchScore.breakdown.skills.missing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Skills to Improve
            </h4>
            <div className="flex flex-wrap gap-2">
              {matchScore.breakdown.skills.missing.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-xs text-muted-foreground"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
