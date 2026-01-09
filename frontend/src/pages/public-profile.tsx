import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { get } from '@/api/client'
import {
  getInitials,
  formatNumber,
  getAuraBadgeClass,
  getAuraLevel,
  formatRelativeTime,
} from '@/lib/utils'
import type { User, VerifiedSkill, Project } from '@/types'
import {
  MapPin,
  Building,
  Link as LinkIcon,
  Users,
  GitFork,
  Star,
  Zap,
  FolderGit2,
  Loader2,
  Calendar,
  Github,
  Code,
  CheckCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { motion } from 'framer-motion'

// Skill category colors
const skillCategoryColors: Record<string, string> = {
  LANGUAGE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FRAMEWORK: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DATABASE: 'bg-green-500/20 text-green-400 border-green-500/30',
  DEVOPS: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  TOOL: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  OTHER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  language: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  framework: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  database: 'bg-green-500/20 text-green-400 border-green-500/30',
  devops: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  tool: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>()

  // Fetch user profile
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: async () => {
      const res = await get<{ profile: User & { skills?: VerifiedSkill[]; projects?: Project[] } }>(`/v1/u/${username}`)
      return res
    },
    enabled: !!username,
  })

  const user = profileData?.profile

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-4">User not found</h1>
          <p className="text-muted-foreground mb-6">
            The user @{username} doesn't exist or has a private profile.
          </p>
          <a href="/" className="text-primary hover:underline">
            Go back home
          </a>
        </div>
      </div>
    )
  }

  const auraLevel = getAuraLevel(user.auraScore)

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/10" />
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative container mx-auto px-4 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row items-center lg:items-start gap-8 lg:gap-12"
          >
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-purple-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
              <Avatar className="relative h-48 w-48 border-4 border-primary/30 shadow-2xl ring-4 ring-primary/20">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-5xl bg-gradient-to-br from-primary to-purple-500 text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-3 -right-3 p-3 rounded-full bg-background border-2 border-border shadow-lg">
                <Github className="h-6 w-6" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-4">
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold">{user.name}</h1>
                  <p className="text-xl text-muted-foreground mt-1">@{user.username}</p>
                </div>
                {user.auraScore > 100 && (
                  <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-1">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Verified Developer
                  </Badge>
                )}
              </div>

              {/* Auto-generated Role Tags */}
              {user.tags && user.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 justify-center lg:justify-start">
                  {user.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              {user.bio && (
                <p className="text-lg text-muted-foreground max-w-2xl mb-6">{user.bio}</p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-muted-foreground mb-6">
                {user.location && (
                  <span className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <MapPin className="h-5 w-5" />
                    {user.location}
                  </span>
                )}
                {user.company && (
                  <span className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Building className="h-5 w-5" />
                    {user.company}
                  </span>
                )}
                {user.blog && (
                  <a
                    href={user.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <LinkIcon className="h-5 w-5" />
                    Website
                  </a>
                )}
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Joined {formatRelativeTime(user.createdAt)}
                </span>
              </div>

              {/* GitHub Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-8">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-xl font-bold">{formatNumber(user.followers)}</span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-xl font-bold">{formatNumber(user.following)}</span>
                  <span className="text-muted-foreground">following</span>
                </div>
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-5 w-5 text-primary" />
                  <span className="text-xl font-bold">{user.publicRepos}</span>
                  <span className="text-muted-foreground">repositories</span>
                </div>
              </div>
            </div>

            {/* Aura Score Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="lg:ml-auto"
            >
              <div className="relative p-8 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 backdrop-blur-sm min-w-[220px] text-center shadow-2xl">
                <div className="absolute inset-0 bg-grid-white/5 rounded-2xl" />
                <div className="relative">
                  <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="text-6xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
                    {formatNumber(user.auraScore)}
                  </p>
                  <Badge className={getAuraBadgeClass(user.auraScore)} variant="outline">
                    {auraLevel.label} Level
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-3">Verified Aura Score</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Skills Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Skills Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Verified Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(user as any).skills && (user as any).skills.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {(user as any).skills.map((skill: VerifiedSkill, index: number) => (
                        <motion.div
                          key={skill.name}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                        >
                          <Badge
                            variant="outline"
                            className={`px-4 py-2 text-sm font-medium ${
                              skillCategoryColors[skill.category] || skillCategoryColors.OTHER
                            }`}
                          >
                            {skill.name}
                            {(skill.score || 0) > 50 && (
                              <CheckCircle className="h-3.5 w-3.5 ml-2" />
                            )}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Skills are verified through project analysis.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Projects Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderGit2 className="h-5 w-5 text-primary" />
                    Top Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(user as any).projects && (user as any).projects.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      {(user as any).projects.slice(0, 6).map((project: Project, index: number) => (
                        <motion.div
                          key={project.id || project.repoUrl}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.05 }}
                          className="p-4 rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <FolderGit2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{project.name || (project as any).repoName}</p>
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {project.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {project.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {project.language && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-primary" />
                                    {project.language}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {formatNumber(project.stars)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <GitFork className="h-3 w-3" />
                                  {formatNumber(project.forks)}
                                </span>
                              </div>
                              {project.score !== undefined && (project as any).overallScore !== undefined && (
                                <div className="mt-2">
                                  <Progress 
                                    value={project.score || (project as any).overallScore} 
                                    className="h-1.5" 
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Project details are visible to authenticated users only.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Aura Breakdown */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Aura Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>GitHub</span>
                      <span className="text-muted-foreground">~40%</span>
                    </div>
                    <Progress value={40} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Projects</span>
                      <span className="text-muted-foreground">~30%</span>
                    </div>
                    <Progress value={30} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Skills</span>
                      <span className="text-muted-foreground">~20%</span>
                    </div>
                    <Progress value={20} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Profile</span>
                      <span className="text-muted-foreground">~10%</span>
                    </div>
                    <Progress value={10} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Want to get verified?</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your GitHub and analyze your projects to build your verified developer profile.
                    </p>
                    <a 
                      href="/" 
                      className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                    >
                      Get Started
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">VerifyDev</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Profile verified by{' '}
            <a href="/" className="text-primary hover:underline">
              VerifyDev
            </a>{' '}
            - The platform for verified developers
          </p>
        </div>
      </footer>
    </div>
  )
}
