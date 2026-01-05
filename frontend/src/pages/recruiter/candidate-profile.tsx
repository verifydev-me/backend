/**
 * Candidate Profile Page (Full View for Recruiters)
 */

import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useFullCandidateProfile, useShortlistCandidate } from '@/hooks/use-recruiter'
import { downloadCandidateResume } from '@/api/services/recruiter.service'
import { AuraScore } from '@/components/aura-score'
import { SkillCard, SkillBadge } from '@/components/skill-card'
import {
  ArrowLeft,
  MapPin,
  Globe,
  Github,
  Mail,
  Building,
  Calendar,
  Download,
  BookmarkPlus,
  ExternalLink,
  Star,
  Code2,
  GraduationCap,
  Briefcase,
  Trophy,
} from 'lucide-react'

export default function CandidateProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { data: profileData, isLoading } = useFullCandidateProfile(userId || '')
  const shortlistMutation = useShortlistCandidate()

  // Extract candidate from response (backend nests it under 'candidate')
  const candidate = (profileData as any)?.candidate || profileData;

  if (isLoading) {
    return <CandidateProfileSkeleton />
  }

  if (!candidate) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Candidate not found</h1>
        <Button asChild>
          <Link to="/recruiter/candidates">
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to search
          </Link>
        </Button>
      </div>
    )
  }

  const handleShortlist = () => {
    shortlistMutation.mutate({ userId: candidate.id })
  }

  const handleDownloadResume = () => {
    downloadCandidateResume(candidate.id)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        to="/recruiter/candidates"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={candidate.avatarUrl} />
                  <AvatarFallback className="text-2xl">
                    {candidate.name?.[0] || candidate.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mb-1">
                  {candidate.name || candidate.username || 'Unknown Developer'}
                </h1>
                <p className="text-muted-foreground">@{candidate.username || 'anonymous'}</p>
                {(candidate.isOpenToWork || (candidate as any).openToWork) && (
                  <Badge className="mt-2 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    Open to opportunities
                  </Badge>
                )}
              </div>

              {/* Aura Score */}
              <div className="flex justify-center mb-6">
                <AuraScore
                  score={candidate.auraScore || (candidate as any).auraSummary?.score || 0}
                  level={candidate.auraScore || (candidate as any).auraSummary?.score || 0}
                  trend={(candidate as any).auraSummary?.trend || 'STABLE'}
                  size="lg"
                />
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                {candidate.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {candidate.location}
                  </div>
                )}
                {candidate.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    {candidate.company}
                  </div>
                )}
                {candidate.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {candidate.email}
                  </div>
                )}
                {candidate.websiteUrl && (
                  <a
                    href={candidate.websiteUrl.startsWith('http') ? candidate.websiteUrl : `https://${candidate.websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    {candidate.websiteUrl.replace(/^https?:\/\//, '').split('/')[0]}
                  </a>
                )}
                {candidate.githubUrl && (
                  <a
                    href={candidate.githubUrl.startsWith('http') ? candidate.githubUrl : `https://github.com/${candidate.githubUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Github className="w-4 h-4" />
                    GitHub Profile
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-6">
                <Button className="flex-1" onClick={handleShortlist}>
                  <BookmarkPlus className="mr-2 w-4 h-4" />
                  Shortlist
                </Button>
                <Button variant="outline" onClick={handleDownloadResume}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Aura Breakdown */}
            {candidate.auraSummary?.breakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Aura Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AuraBreakdownItem
                    label="Skill Diversity"
                    value={candidate.auraSummary.breakdown.skillDiversity}
                  />
                  <AuraBreakdownItem
                    label="Project Quality"
                    value={candidate.auraSummary.breakdown.projectQuality}
                  />
                  <AuraBreakdownItem
                    label="Activity Consistency"
                    value={candidate.auraSummary.breakdown.activityConsistency}
                  />
                  <AuraBreakdownItem
                    label="Community Impact"
                    value={candidate.auraSummary.breakdown.communityImpact}
                  />
                </CardContent>
              </Card>
            )}
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="skills">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
            </TabsList>

            {/* Skills Tab */}
            <TabsContent value="skills" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="w-5 h-5" />
                    Verified Skills ({(candidate.allSkills || candidate.skills || []).filter((s: any) => s.isVerified).length})
                  </CardTitle>
                  <CardDescription>
                    Skills extracted and verified from code analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(candidate.allSkills || candidate.skills || []).map((skill: any, idx: number) => (
                      <SkillCard
                        key={skill.id || `skill-${idx}`}
                        skill={skill}
                        compact
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Projects Tab */}
            <TabsContent value="projects" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Github className="w-5 h-5" />
                    Analyzed Projects ({(candidate.analyzedProjects || candidate.projects || []).length})
                  </CardTitle>
                  <CardDescription>
                    Projects analyzed for skill verification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(candidate.analyzedProjects || candidate.projects || []).map((project: any, idx: number) => (
                    <ProjectItem key={project.id || `project-${idx}`} project={project} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Work Experience
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const experienceList = candidate.experiences || candidate.experience || [];
                    return (experienceList.length > 0 ? (
                      <div className="space-y-6">
                        {experienceList.map((exp: any, idx: number) => (
                          <ExperienceItem key={exp.id || `exp-${idx}`} experience={exp} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No work experience added
                      </p>
                    ))
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.education && candidate.education.length > 0 ? (
                    <div className="space-y-6">
                      {candidate.education.map((edu: any) => (
                        <EducationItem key={edu.id} education={edu} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No education added
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// Sub-components
function AuraBreakdownItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  )
}

function ProjectItem({ project }: { project: any }) {
  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline flex items-center gap-1"
          >
            {project.name}
            <ExternalLink className="w-3 h-3" />
          </a>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        {project.qualityScore && (
          <Badge variant="secondary">{project.qualityScore}/100</Badge>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {project.language && (
          <span className="flex items-center gap-1">
            <Code2 className="w-3.5 h-3.5" />
            {project.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5" />
          {project.stars}
        </span>
      </div>
      {project.technologies.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {project.technologies.slice(0, 6).map((tech: string) => (
            <SkillBadge key={tech} name={tech} verified size="sm" />
          ))}
        </div>
      )}
    </div>
  )
}

function ExperienceItem({ experience }: { experience: any }) {
  return (
    <div className="border-l-2 border-primary/20 pl-4">
      <h4 className="font-semibold">{experience.title}</h4>
      <p className="text-sm text-muted-foreground">{experience.company}</p>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
        <Calendar className="w-3 h-3" />
        {new Date(experience.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        {' - '}
        {experience.endDate
          ? new Date(experience.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : 'Present'}
      </p>
      {experience.description && (
        <p className="text-sm mt-2">{experience.description}</p>
      )}
    </div>
  )
}

function EducationItem({ education }: { education: any }) {
  return (
    <div className="border-l-2 border-primary/20 pl-4">
      <h4 className="font-semibold">{education.degree}</h4>
      <p className="text-sm text-muted-foreground">{education.institution}</p>
      <p className="text-xs text-muted-foreground">
        {education.fieldOfStudy} • {education.startYear} - {education.endYear || 'Present'}
      </p>
    </div>
  )
}

function CandidateProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-6 w-32 mb-6" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
              <Skeleton className="h-8 w-40 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
