/**
 * Candidate Profile Page (Full View for Recruiters)
 * Ultra Premium Design with Animations and Glassmorphism
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useFullCandidateProfile, useShortlistCandidate } from '@/hooks/use-recruiter'
import { downloadCandidateResume } from '@/api/services/recruiter.service'
import { AuraScore } from '@/components/aura-score'
import { SkillCard, SkillBadge } from '@/components/skill-card'
import { SendMessageDialog } from '@/components/messaging/send-message-dialog'
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
  Sparkles,
  Zap,
  GitBranch,
  Clock,
  Award,
  Shield,
  CheckCircle2,
  Users,
  MessageSquare,
  Target,
  TrendingUp,
  Folder,
  Brain,
  Rocket,
} from 'lucide-react'

export default function CandidateProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { data: profileData, isLoading } = useFullCandidateProfile(userId || '')
  const shortlistMutation = useShortlistCandidate()
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)

  // Extract candidate from response (backend nests it under 'candidate')
  const candidate = (profileData as any)?.candidate || profileData;

  if (isLoading) {
    return <CandidateProfileSkeleton />
  }

  if (!candidate) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-12 rounded-3xl glass-premium border border-white/10 max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
            <Users className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Candidate Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The developer profile you're looking for doesn't exist or may have been removed.
          </p>
          <Button asChild className="group">
            <Link to="/recruiter/candidates">
              <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to search
            </Link>
          </Button>
        </motion.div>
      </div>
    )
  }

  const handleShortlist = () => {
    if (candidate?.id) {
      shortlistMutation.mutate({ userId: candidate.id })
    }
  }

  const handleDownloadResume = () => {
    if (candidate?.id) {
      downloadCandidateResume(candidate.id)
    }
  }

  const skills = candidate.allSkills || candidate.skills || [];
  const verifiedSkillsCount = skills.filter((s: any) => s.isVerified).length;
  const projects = candidate.analyzedProjects || candidate.projects || [];
  const experiences = candidate.experiences || candidate.experience || [];
  const educationList = candidate.education || [];
  const auraScore = candidate.auraScore || (candidate as any).auraSummary?.score || 0;

  // Calculate stats
  const totalStars = projects.reduce((acc: number, p: any) => acc + (p.stars || 0), 0);
  const avgQuality = projects.length > 0
    ? Math.round(projects.reduce((acc: number, p: any) => acc + (p.qualityScore || 0), 0) / projects.length)
    : 0;

  return (
    <div className="min-h-screen relative">
      {/* Premium Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-violet-500/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-500/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-pink-500/5 to-transparent rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Back Button - Premium Style */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/recruiter/candidates"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group transition-colors"
          >
            <span className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </span>
            <span className="group-hover:translate-x-1 transition-transform">Back to search</span>
          </Link>
        </motion.div>

        {/* Hero Section - Profile Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-500/10 opacity-50" />
            <CardContent className="p-8 relative">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Avatar Section */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-500 rounded-full opacity-50 blur-lg animate-pulse" />
                    <Avatar className="w-32 h-32 relative border-4 border-background shadow-2xl">
                      <AvatarImage src={candidate.avatarUrl} />
                      <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
                        {candidate.name?.[0] || candidate.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {(candidate.isOpenToWork || (candidate as any).openToWork) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-green-500/30"
                      >
                        ✨ Open to Work
                      </motion.span>
                    )}
                  </div>

                  {/* Aura Score Display */}
                  <div className="mt-8">
                    <AuraScore
                      score={auraScore}
                      level={auraScore}
                      trend={(candidate as any).auraSummary?.trend || 'STABLE'}
                      size="xl"
                    />
                  </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 lg:pt-4">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                      {candidate.name || candidate.username || 'Unknown Developer'}
                    </h1>
                    <Badge className="glass-premium text-violet-400 border-violet-500/30">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified Profile
                    </Badge>
                  </div>

                  <p className="text-xl text-muted-foreground mb-6">@{candidate.username || 'anonymous'}</p>

                  {/* Contact Info Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {candidate.location && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                          <MapPin className="w-4 h-4 text-blue-400" />
                        </div>
                        <span className="text-sm truncate">{candidate.location}</span>
                      </motion.div>
                    )}
                    {candidate.company && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-pink-500/20">
                          <Building className="w-4 h-4 text-violet-400" />
                        </div>
                        <span className="text-sm truncate">{candidate.company}</span>
                      </motion.div>
                    )}
                    {candidate.email && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                          <Mail className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-sm truncate">{candidate.email}</span>
                      </motion.div>
                    )}
                    {candidate.githubUrl && (
                      <motion.a
                        href={candidate.githubUrl.startsWith('http') ? candidate.githubUrl : `https://github.com/${candidate.githubUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all hover:scale-[1.02] group cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-gradient-to-br from-gray-500/20 to-gray-600/20">
                          <Github className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-sm group-hover:text-primary transition-colors">GitHub</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.a>
                    )}
                    {candidate.websiteUrl && (
                      <motion.a
                        href={candidate.websiteUrl.startsWith('http') ? candidate.websiteUrl : `https://${candidate.websiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all hover:scale-[1.02] group cursor-pointer"
                      >
                        <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-rose-500/20">
                          <Globe className="w-4 h-4 text-pink-400" />
                        </div>
                        <span className="text-sm group-hover:text-primary transition-colors truncate">
                          {candidate.websiteUrl.replace(/^https?:\/\//, '').split('/')[0]}
                        </span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.a>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4">
                    <Button
                      onClick={handleShortlist}
                      className="relative overflow-hidden group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-xl shadow-violet-500/25"
                      size="lg"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <BookmarkPlus className="mr-2 w-5 h-5" />
                      Add to Shortlist
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleDownloadResume}
                      className="glass-premium border-white/20 hover:bg-white/10 hover:border-white/30"
                    >
                      <Download className="mr-2 w-5 h-5" />
                      Download Resume
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setIsMessageDialogOpen(true)}
                      className="glass-premium border-white/20 hover:bg-white/10 hover:border-white/30"
                    >
                      <MessageSquare className="mr-2 w-5 h-5" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            icon={<Code2 className="w-5 h-5" />}
            label="Verified Skills"
            value={verifiedSkillsCount}
            total={skills.length}
            gradient="from-violet-500 to-purple-500"
            delay={0}
          />
          <StatCard
            icon={<Folder className="w-5 h-5" />}
            label="Projects"
            value={projects.length}
            gradient="from-cyan-500 to-blue-500"
            delay={0.1}
          />
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label="Total Stars"
            value={totalStars}
            gradient="from-yellow-500 to-orange-500"
            delay={0.2}
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Avg Quality"
            value={avgQuality}
            suffix="%"
            gradient="from-emerald-500 to-green-500"
            delay={0.3}
          />
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Aura & Stats */}
          <div className="space-y-6">
            {/* Aura Breakdown Card */}
            {candidate.auraSummary?.breakdown && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="overflow-hidden border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Aura Breakdown</CardTitle>
                        <CardDescription>Performance metrics analysis</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <AuraMetric
                      label="Skill Diversity"
                      value={candidate.auraSummary.breakdown.skillDiversity}
                      icon={<Brain className="w-4 h-4" />}
                      color="violet"
                    />
                    <AuraMetric
                      label="Project Quality"
                      value={candidate.auraSummary.breakdown.projectQuality}
                      icon={<Rocket className="w-4 h-4" />}
                      color="cyan"
                    />
                    <AuraMetric
                      label="Activity Consistency"
                      value={candidate.auraSummary.breakdown.activityConsistency}
                      icon={<TrendingUp className="w-4 h-4" />}
                      color="emerald"
                    />
                    <AuraMetric
                      label="Community Impact"
                      value={candidate.auraSummary.breakdown.communityImpact}
                      icon={<Users className="w-4 h-4" />}
                      color="pink"
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Quick Insights Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="overflow-hidden border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                      <Sparkles className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Quick Insights</CardTitle>
                      <CardDescription>AI-powered analysis</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InsightItem
                    icon={<Zap className="w-4 h-4" />}
                    text={skills.length > 0 ? `Proficient in ${skills.length} technologies` : 'No skills analyzed yet'}
                    highlight={skills.length > 5}
                  />
                  <InsightItem
                    icon={<GitBranch className="w-4 h-4" />}
                    text={projects.length > 0 ? `${projects.length} projects analyzed for verification` : 'No projects connected'}
                    highlight={projects.length > 3}
                  />
                  <InsightItem
                    icon={<Award className="w-4 h-4" />}
                    text={auraScore >= 400 ? 'Elite level developer' : auraScore >= 200 ? 'Experienced developer' : 'Rising talent'}
                    highlight={auraScore >= 400}
                  />
                  <InsightItem
                    icon={<Clock className="w-4 h-4" />}
                    text={experiences.length > 0 ? `${experiences.length} work experience${experiences.length > 1 ? 's' : ''}` : 'No work experience listed'}
                    highlight={experiences.length >= 2}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Tabs defaultValue="skills" className="w-full">
                <TabsList className="grid w-full grid-cols-4 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                  <TabsTrigger
                    value="skills"
                    className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/20 data-[state=active]:to-indigo-500/20 data-[state=active]:border-violet-500/30"
                  >
                    <Code2 className="w-4 h-4 mr-2" />
                    Skills
                  </TabsTrigger>
                  <TabsTrigger
                    value="projects"
                    className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:border-cyan-500/30"
                  >
                    <Github className="w-4 h-4 mr-2" />
                    Projects
                  </TabsTrigger>
                  <TabsTrigger
                    value="experience"
                    className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-green-500/20 data-[state=active]:border-emerald-500/30"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Experience
                  </TabsTrigger>
                  <TabsTrigger
                    value="education"
                    className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/20 data-[state=active]:to-rose-500/20 data-[state=active]:border-pink-500/30"
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Education
                  </TabsTrigger>
                </TabsList>

                {/* Skills Tab */}
                <TabsContent value="skills" className="mt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="skills"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                                <Code2 className="w-5 h-5 text-violet-400" />
                              </div>
                              <div>
                                <CardTitle>Verified Skills</CardTitle>
                                <CardDescription>
                                  {verifiedSkillsCount} of {skills.length} skills verified through code analysis
                                </CardDescription>
                              </div>
                            </div>
                            {verifiedSkillsCount > 0 && (
                              <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {verifiedSkillsCount} Verified
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {skills.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                              {skills.map((skill: any, idx: number) => (
                                <motion.div
                                  key={skill.id || `skill-${idx}`}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                >
                                  <SkillCard skill={skill} compact />
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <EmptyState
                              icon={<Code2 className="w-12 h-12" />}
                              title="No Skills Yet"
                              description="This developer hasn't had any projects analyzed for skill verification."
                            />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </AnimatePresence>
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects" className="mt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="projects"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                                <Github className="w-5 h-5 text-cyan-400" />
                              </div>
                              <div>
                                <CardTitle>Analyzed Projects</CardTitle>
                                <CardDescription>
                                  {projects.length} projects analyzed for skill verification
                                </CardDescription>
                              </div>
                            </div>
                            {totalStars > 0 && (
                              <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {totalStars} Total Stars
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {projects.length > 0 ? (
                            projects.map((project: any, idx: number) => (
                              <motion.div
                                key={project.id || `project-${idx}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                              >
                                <ProjectCard project={project} />
                              </motion.div>
                            ))
                          ) : (
                            <EmptyState
                              icon={<Folder className="w-12 h-12" />}
                              title="No Projects Analyzed"
                              description="This developer hasn't connected any projects for analysis yet."
                            />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </AnimatePresence>
                </TabsContent>

                {/* Experience Tab */}
                <TabsContent value="experience" className="mt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="experience"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20">
                              <Briefcase className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <CardTitle>Work Experience</CardTitle>
                              <CardDescription>
                                {experiences.length > 0 ? `${experiences.length} position${experiences.length > 1 ? 's' : ''}` : 'Professional history'}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {experiences.length > 0 ? (
                            <div className="space-y-6">
                              {experiences.map((exp: any, idx: number) => (
                                <motion.div
                                  key={exp.id || `exp-${idx}`}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                >
                                  <ExperienceCard experience={exp} isLast={idx === experiences.length - 1} />
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <EmptyState
                              icon={<Briefcase className="w-12 h-12" />}
                              title="No Experience Listed"
                              description="This developer hasn't added their work experience yet."
                            />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </AnimatePresence>
                </TabsContent>

                {/* Education Tab */}
                <TabsContent value="education" className="mt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="education"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card className="border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10">
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20">
                              <GraduationCap className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                              <CardTitle>Education</CardTitle>
                              <CardDescription>
                                {educationList.length > 0 ? `${educationList.length} qualification${educationList.length > 1 ? 's' : ''}` : 'Academic background'}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {educationList.length > 0 ? (
                            <div className="space-y-6">
                              {educationList.map((edu: any, idx: number) => (
                                <motion.div
                                  key={edu.id || `edu-${idx}`}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                >
                                  <EducationCard education={edu} isLast={idx === educationList.length - 1} />
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <EmptyState
                              icon={<GraduationCap className="w-12 h-12" />}
                              title="No Education Listed"
                              description="This developer hasn't added their educational background yet."
                            />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </AnimatePresence>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Send Message Dialog */}
      <SendMessageDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        candidateId={candidate?.id || userId || ''}
        candidateName={candidate?.name || candidate?.username || 'Candidate'}
        candidateAvatar={candidate?.avatarUrl}
      />
    </div>
  )
}

// === SUB-COMPONENTS ===

function StatCard({
  icon,
  label,
  value,
  total,
  suffix = '',
  gradient,
  delay
}: {
  icon: React.ReactNode
  label: string
  value: number
  total?: number
  suffix?: string
  gradient: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-0 bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all group">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient.replace('from-', 'from-').replace('to-', 'to-')}/20`}>
              <span className={`text-transparent bg-clip-text bg-gradient-to-r ${gradient}`}>
                {icon}
              </span>
            </div>
            <div>
              <p className="text-3xl font-bold">
                {value}{suffix}
                {total !== undefined && <span className="text-lg text-muted-foreground">/{total}</span>}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AuraMetric({
  label,
  value,
  icon,
  color
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: 'violet' | 'cyan' | 'emerald' | 'pink'
}) {
  const colorClasses = {
    violet: 'from-violet-500 to-purple-500 text-violet-400',
    cyan: 'from-cyan-500 to-blue-500 text-cyan-400',
    emerald: 'from-emerald-500 to-green-500 text-emerald-400',
    pink: 'from-pink-500 to-rose-500 text-pink-400',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={colorClasses[color].split(' ')[2]}>{icon}</span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <span className={`text-sm font-bold bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')} bg-clip-text text-transparent`}>
          {value}
        </span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${colorClasses[color].split(' ').slice(0, 2).join(' ')} rounded-full`}
        />
      </div>
    </div>
  )
}

function InsightItem({
  icon,
  text,
  highlight
}: {
  icon: React.ReactNode
  text: string
  highlight: boolean
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${highlight
      ? 'bg-gradient-to-r from-violet-500/10 via-transparent to-transparent border-l-2 border-violet-500'
      : 'bg-white/5'
      }`}>
      <span className={highlight ? 'text-violet-400' : 'text-muted-foreground'}>{icon}</span>
      <span className={`text-sm ${highlight ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{text}</span>
    </div>
  )
}

function ProjectCard({ project }: { project: any }) {
  const technologies = project.technologies || [];

  return (
    <div className="group p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all hover:bg-white/[0.07]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold hover:text-primary transition-colors inline-flex items-center gap-2 group/link"
          >
            {project.name}
            <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
        {project.qualityScore && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">{project.qualityScore}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
        {project.language && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500" />
            {project.language}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-yellow-500 fill-current" />
          {project.stars || 0}
        </span>
        {project.forks !== undefined && (
          <span className="flex items-center gap-1.5">
            <GitBranch className="w-4 h-4" />
            {project.forks}
          </span>
        )}
      </div>

      {technologies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {technologies.slice(0, 6).map((tech: string, idx: number) => (
            <SkillBadge key={`${tech}-${idx}`} name={tech} verified size="sm" />
          ))}
          {technologies.length > 6 && (
            <Badge variant="outline" className="text-xs border-white/20">
              +{technologies.length - 6} more
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

function ExperienceCard({ experience, isLast }: { experience: any; isLast: boolean }) {
  return (
    <div className="relative pl-8">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500/50 to-transparent" />
      )}

      {/* Timeline Dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <Briefcase className="w-3 h-3 text-white" />
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors">
        <h4 className="text-lg font-semibold mb-1">{experience.title}</h4>
        <p className="text-sm text-emerald-400 mb-2">{experience.company}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-2 mb-3">
          <Calendar className="w-3 h-3" />
          {new Date(experience.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          {' — '}
          {experience.endDate
            ? new Date(experience.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : 'Present'}
        </p>
        {experience.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{experience.description}</p>
        )}
      </div>
    </div>
  )
}

function EducationCard({ education, isLast }: { education: any; isLast: boolean }) {
  return (
    <div className="relative pl-8">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-0 w-[2px] bg-gradient-to-b from-pink-500/50 to-transparent" />
      )}

      {/* Timeline Dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
        <GraduationCap className="w-3 h-3 text-white" />
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-pink-500/30 transition-colors">
        <h4 className="text-lg font-semibold mb-1">{education.degree}</h4>
        <p className="text-sm text-pink-400 mb-2">{education.institution}</p>
        <p className="text-xs text-muted-foreground">
          {education.fieldOfStudy} • {education.startYear} — {education.endYear || 'Present'}
        </p>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  )
}

function CandidateProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button Skeleton */}
      <Skeleton className="h-10 w-40 mb-8 rounded-xl" />

      {/* Hero Skeleton */}
      <Card className="mb-8 border-0 bg-white/5">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex flex-col items-center">
              <Skeleton className="w-32 h-32 rounded-full" />
              <Skeleton className="w-20 h-20 rounded-2xl mt-8" />
            </div>
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-32" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
              <div className="flex gap-4 mt-6">
                <Skeleton className="h-12 w-40 rounded-xl" />
                <Skeleton className="h-12 w-40 rounded-xl" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 bg-white/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="border-0 bg-white/5">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="border-0 bg-white/5">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
