import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Check, X, AlertCircle, Target } from 'lucide-react'
import type { Job, VerifiedSkill } from '@/types'
import { cn } from '@/lib/utils'

interface JobMatchDetailsProps {
  job: Job
  userSkills: VerifiedSkill[]
  userAura?: number
  className?: string
}

interface SkillMatch {
  name: string
  hasSkill: boolean
  confidence?: number
}

export function JobMatchDetails({ job, userSkills, userAura, className }: JobMatchDetailsProps) {
  // Calculate skill matches
  const skillMatches: SkillMatch[] = job.skills.map(required => {
    const userSkill = userSkills.find(s => 
      s.name.toLowerCase() === required.toLowerCase() ||
      s.name.toLowerCase().includes(required.toLowerCase()) ||
      required.toLowerCase().includes(s.name.toLowerCase())
    )
    return {
      name: required,
      hasSkill: !!userSkill,
      confidence: userSkill?.confidence || userSkill?.score,
    }
  })

  const matchedSkills = skillMatches.filter(s => s.hasSkill)
  const skillMatchPercent = job.skills.length > 0 
    ? Math.round((matchedSkills.length / job.skills.length) * 100) 
    : 0

  // Aura match
  const auraMatch = !job.minAuraScore || (userAura && userAura >= job.minAuraScore)
  const auraDiff = job.minAuraScore && userAura 
    ? userAura - job.minAuraScore 
    : 0

  // Overall match score
  const overallMatch = Math.round(
    (skillMatchPercent * 0.7) + // 70% weight on skills
    (auraMatch ? 30 : 0) // 30% weight on aura
  )

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Match Analysis
          </span>
          <Badge 
            className={`text-lg px-3 ${
              overallMatch >= 80 ? 'bg-green-500' :
              overallMatch >= 60 ? 'bg-blue-500' :
              overallMatch >= 40 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
          >
            {overallMatch}% Match
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Skills Match */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Skills Match</span>
            <span className="text-sm text-muted-foreground">
              {matchedSkills.length}/{job.skills.length} skills
            </span>
          </div>
          <Progress value={skillMatchPercent} className="h-2 mb-3" />
          
          <div className="grid grid-cols-2 gap-2">
            {skillMatches.map((skill) => (
              <div 
                key={skill.name}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg text-sm',
                  skill.hasSkill ? 'bg-green-500/10' : 'bg-red-500/10'
                )}
              >
                {skill.hasSkill ? (
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <span className={skill.hasSkill ? 'text-foreground' : 'text-muted-foreground'}>
                  {skill.name}
                </span>
                {skill.hasSkill && skill.confidence && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {Math.round(skill.confidence)}%
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Aura Requirement */}
        {job.minAuraScore && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Aura Requirement</span>
              <Badge variant={auraMatch ? 'default' : 'destructive'}>
                {auraMatch ? 'Met' : 'Not Met'}
              </Badge>
            </div>
            <div className={cn(
              'p-3 rounded-lg',
              auraMatch ? 'bg-green-500/10' : 'bg-red-500/10'
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  Required: <span className="font-semibold">{job.minAuraScore}</span>
                </span>
                <span className="text-sm">
                  Your Aura: <span className="font-semibold">{userAura || 0}</span>
                </span>
              </div>
              {!auraMatch && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  You need {Math.abs(auraDiff)} more aura points
                </p>
              )}
              {auraMatch && auraDiff > 0 && (
                <p className="text-xs text-green-400 mt-2">
                  ✓ You exceed the requirement by {auraDiff} points
                </p>
              )}
            </div>
          </div>
        )}

        {/* Recommendation */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          {overallMatch >= 80 ? (
            <p className="text-sm">
              <span className="font-semibold text-green-400">Great Match!</span> You have most of the required skills. Apply now!
            </p>
          ) : overallMatch >= 60 ? (
            <p className="text-sm">
              <span className="font-semibold text-blue-400">Good Match!</span> Consider applying and highlighting your transferable skills.
            </p>
          ) : overallMatch >= 40 ? (
            <p className="text-sm">
              <span className="font-semibold text-yellow-400">Moderate Match.</span> Focus on building missing skills or check similar roles.
            </p>
          ) : (
            <p className="text-sm">
              <span className="font-semibold text-red-400">Low Match.</span> Consider gaining more experience in the required areas.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default JobMatchDetails
