import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/auth-store'
import { useRecruiterStore } from '@/store/recruiter-store'
import { useUIStore } from '@/store/ui-store'
import { get, put, del } from '@/api/client'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Palette, 
  Shield,
  Moon,
  Sun,
  Monitor,
  Github,
  Mail,
  MapPin,
  Link as LinkIcon,
  Globe,
  Eye,
  Trash2,
  Download,
  AlertTriangle,
  Check,
  Loader2,
  Code2,
  Building,
  Twitter,
  Linkedin,
  ExternalLink,
  Sparkles,
  BellRing,
  UserCheck,
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
}

// Section types
type SettingsSection = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'connected' | 'danger'

// Settings interface matching backend
interface UserSettings {
  isPublic: boolean
  isOpenToWork: boolean
  emailNotifications: boolean
  showEmail: boolean
  showLocation: boolean
}

export default function Settings() {
  const location = useLocation()
  const isRecruiter = location.pathname.startsWith('/recruiter')
  
  const { user, logout: userLogout, checkAuth } = useAuthStore()
  const { recruiter, logout: recruiterLogout } = useRecruiterStore()
  const { theme, setTheme, accentColor } = useUIStore()
  const queryClient = useQueryClient()
  
  // Use appropriate user data based on role
  const currentUser = isRecruiter ? recruiter : user
  const logout = isRecruiter ? recruiterLogout : userLogout
  
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  
  // Profile form state
  const [profile, setProfile] = useState({
    name: currentUser?.name || '',
    bio: (currentUser as any)?.bio || '',
    location: (currentUser as any)?.location || '',
    website: (currentUser as any)?.website || '',
    company: currentUser?.company || (currentUser as any)?.companyName || '',
    twitter: (currentUser as any)?.twitterUsername || (currentUser as any)?.twitter || '',
    linkedin: (currentUser as any)?.linkedin || '',
  })

  // Update profile when user changes
  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        bio: (currentUser as any).bio || '',
        location: (currentUser as any).location || '',
        website: (currentUser as any).website || '',
        company: currentUser.company || (currentUser as any).companyName || '',
        twitter: (currentUser as any).twitterUsername || (currentUser as any).twitter || '',
        linkedin: (currentUser as any).linkedin || '',
      })
    }
  }, [currentUser])
  
  // Fetch settings from backend (skip for recruiters for now)
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => get<{ settings: UserSettings }>('/v1/users/settings'),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !isRecruiter, // Only fetch for regular users
  })

  // Notification settings (local for now, can be extended)
  const [notifications, setNotifications] = useState({
    emailAnalysis: true,
    emailJobMatch: true,
    emailWeeklyDigest: false,
    pushAnalysis: true,
    pushJobMatch: true,
    pushRecruiterView: true,
  })
  
  // Privacy settings from backend
  const [privacy, setPrivacy] = useState({
    showEmail: false,
    showLocation: true,
    showCompany: true,
    profilePublic: true,
    showInSearch: true,
    allowRecruiterContact: true,
  })

  // Sync privacy settings from backend
  useEffect(() => {
    if (settingsData?.settings) {
      setPrivacy(prev => ({
        ...prev,
        profilePublic: settingsData.settings.isPublic,
        showEmail: settingsData.settings.showEmail,
        showLocation: settingsData.settings.showLocation,
        showInSearch: settingsData.settings.isOpenToWork,
      }))
    }
  }, [settingsData])

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profile) => {
      if (isRecruiter) {
        return put('/v1/recruiters/profile', data)
      }
      return put('/v1/users/me', data)
    },
    onSuccess: async () => {
      if (!isRecruiter) {
        await checkAuth() // Refresh user data from backend
      }
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast({ title: 'Profile updated! ✅', description: 'Your changes have been saved successfully.' })
    },
    onError: (error: any) => {
      console.error('Profile update error:', error)
      const errorMsg = error?.response?.data?.message || 'Failed to update profile'
      toast({ variant: 'destructive', title: 'Update failed', description: errorMsg })
    },
  })

  // Update settings mutation (privacy/visibility) - skip for recruiters
  const updateSettingsMutation = useMutation({
    mutationFn: (data: { isPublic?: boolean; isOpenToWork?: boolean }) => 
      put('/v1/users/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast({ title: 'Settings updated', description: 'Your privacy settings have been saved.' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' })
    },
  })

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await get<any>('/v1/users/me/export')
      return response
    },
    onSuccess: (data) => {
      // Download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `verifydev-export-${new Date().toISOString().split('T')[0]}.json`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      toast({ title: 'Data exported', description: 'Your data has been downloaded.' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to export data.' })
    },
  })

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () => del('/v1/users/me'),
    onSuccess: () => {
      toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' })
      logout()
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete account.' })
    },
  })

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profile)
  }

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy(prev => ({ ...prev, [key]: value }))
    
    // Map to backend fields and save
    if (key === 'profilePublic') {
      updateSettingsMutation.mutate({ isPublic: value })
    } else if (key === 'showInSearch') {
      updateSettingsMutation.mutate({ isOpenToWork: value })
    }
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      deleteAccountMutation.mutate()
    }
  }

  const handleExportData = () => {
    exportDataMutation.mutate()
  }

  // Calculate profile completion
  const calculateProfileCompletion = () => {
    const fields = [
      user?.name,
      user?.bio,
      user?.location,
      user?.avatarUrl,
      user?.website,
      user?.company,
    ]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
    { id: 'connected' as const, label: 'Connected Accounts', icon: LinkIcon },
    { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-3xl" />
        <div className="relative bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-lg">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
              <SettingsIcon className="h-6 w-6 text-primary-foreground" />
            </div>
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account, privacy, and preferences
          </p>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="lg:w-64 flex-shrink-0"
        >
          <div className="sticky top-6 space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-lg">
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {sections.map((section, idx) => (
                    <motion.button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ x: 4, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        activeSection === section.id
                          ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30"
                          : "hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                        section.id === 'danger' && activeSection !== section.id && "text-destructive hover:text-destructive hover:bg-destructive/10"
                      )}
                    >
                      <section.icon className="h-4 w-4" />
                      {section.label}
                    </motion.button>
                  ))}
                  
                  {/* Job Preferences Link */}
                  {!isRecruiter && (
                    <Link to="/settings/job-preferences">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        whileHover={{ x: 4, transition: { duration: 0.2 } }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 mt-2"
                      >
                        <Code2 className="h-4 w-4" />
                        Job Preferences
                      </motion.div>
                    </Link>
                  )}
                </nav>
              </CardContent>
            </Card>
            
            {/* Profile Completion */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold">Profile Strength</span>
                  </div>
                  <Progress 
                    value={calculateProfileCompletion()} 
                    className="h-2.5 mb-2 bg-muted/30" 
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {calculateProfileCompletion()}% complete
                    {calculateProfileCompletion() < 100 
                      ? ' • Add more details to stand out' 
                      : ' • Perfect! 🎉'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 space-y-6"
        >
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-br from-primary/5 via-transparent to-transparent blur-3xl" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    Profile Information
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/80">
                    Update your personal information and how others see you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 relative"
>
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user?.name || 'Your Name'}</p>
                      <p className="text-sm text-muted-foreground">@{user?.githubUsername || user?.username || 'username'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Avatar synced from GitHub</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Display Name</label>
                      <Input 
                        value={profile.name}
                        onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={user?.email || ''} 
                          disabled 
                          className="pl-10 bg-muted"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Email is managed through GitHub</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Bio</label>
                    <Textarea 
                      value={profile.bio}
                      onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell us about yourself, your skills, and what you're passionate about"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{profile.bio.length}/500 characters</p>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={profile.location}
                          onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
                          placeholder="City, Country"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Company</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={profile.company}
                          onChange={(e) => setProfile(p => ({ ...p, company: e.target.value }))}
                          placeholder="Where do you work?"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        value={profile.website}
                        onChange={(e) => setProfile(p => ({ ...p, website: e.target.value }))}
                        placeholder="https://yourwebsite.com"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Social Links */}
                  <div>
                    <h3 className="font-medium mb-4">Social Links</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Twitter</label>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            value={profile.twitter}
                            onChange={(e) => setProfile(p => ({ ...p, twitter: e.target.value }))}
                            placeholder="@username"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">LinkedIn</label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            value={profile.linkedin}
                            onChange={(e) => setProfile(p => ({ ...p, linkedin: e.target.value }))}
                            placeholder="linkedin.com/in/username"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button 
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                        className="shadow-lg shadow-primary/30 bg-gradient-to-r from-primary to-primary/80 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
                        size="lg"
                      >
                        {updateProfileMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <motion.div variants={itemVariants}>
              <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-primary/5 via-transparent to-transparent blur-3xl" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Palette className="h-5 w-5 text-primary" />
                    </div>
                    Appearance
                  </CardTitle>
                  <CardDescription className="text-muted-foreground/80">
                    Customize how VerifyDev looks for you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 relative">
                  <div>
                    <h3 className="font-semibold mb-5 text-base">Theme Preference</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <motion.button
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setTheme('light')}
                        className={cn(
                          "p-5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group",
                          theme === 'light' 
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
                            : "border-border/50 hover:border-primary/40 hover:shadow-md"
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="h-20 w-full rounded-xl bg-gradient-to-br from-white to-gray-100 border border-gray-200 mb-4 flex items-center justify-center shadow-md relative overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]" />
                          <Sun className="h-10 w-10 text-yellow-500 relative z-10" />
                        </div>
                        <p className="font-semibold text-sm">Light</p>
                        <p className="text-xs text-muted-foreground mt-1">Clean & bright</p>
                        {theme === 'light' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3"
                          >
                            <Check className="h-5 w-5 text-primary" />
                          </motion.div>
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "p-5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group",
                          theme === 'dark' 
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
                            : "border-border/50 hover:border-primary/40 hover:shadow-md"
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="h-20 w-full rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 mb-4 flex items-center justify-center shadow-md relative overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),transparent)]" />
                          <Moon className="h-10 w-10 text-blue-400 relative z-10" />
                        </div>
                        <p className="font-semibold text-sm">Dark</p>
                        <p className="text-xs text-muted-foreground mt-1">Easy on eyes</p>
                        {theme === 'dark' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3"
                          >
                            <Check className="h-5 w-5 text-primary" />
                          </motion.div>
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setTheme('system')}
                        className={cn(
                          "p-5 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group",
                          theme === 'system' 
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
                            : "border-border/50 hover:border-primary/40 hover:shadow-md"
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="h-20 w-full rounded-xl bg-gradient-to-r from-white via-gray-400 to-zinc-900 border mb-4 flex items-center justify-center shadow-md relative overflow-hidden">
                          <Monitor className="h-10 w-10 text-muted-foreground relative z-10 drop-shadow-lg" />
                        </div>
                        <p className="font-semibold text-sm">System</p>
                        <p className="text-xs text-muted-foreground mt-1">Match device</p>
                        {theme === 'system' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-3 right-3"
                          >
                            <Check className="h-5 w-5 text-primary" />
                          </motion.div>
                        )}
                      </motion.button>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  <div>
                    <h3 className="font-semibold mb-2 text-base">Accent Color</h3>
                    <p className="text-sm text-muted-foreground/80 mb-6">Personalize the application's highlight color</p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { name: 'Indigo', value: '239 84% 67%' },
                        { name: 'Violet', value: '258 89% 66%' },
                        { name: 'Pink', value: '330 81% 60%' },
                        { name: 'Rose', value: '341 81% 58%' },
                        { name: 'Red', value: '0 84% 60%' },
                        { name: 'Orange', value: '24 94% 53%' },
                        { name: 'Amber', value: '45 93% 47%' },
                        { name: 'Yellow', value: '48 96% 53%' },
                        { name: 'Lime', value: '84 81% 44%' },
                        { name: 'Emerald', value: '142 70% 45%' },
                        { name: 'Teal', value: '173 80% 40%' },
                        { name: 'Cyan', value: '189 94% 43%' },
                        { name: 'Sky', value: '199 89% 48%' },
                        { name: 'Zinc', value: '240 5% 65%' },
                        { name: 'Slate', value: '215 16% 47%' },
                      ].map((c) => (
                        <motion.button
                          key={c.value}
                          onClick={() => {
                            const { setAccentColor } = useUIStore.getState()
                            setAccentColor(c.value)
                            toast({ title: `${c.name} applied`, description: `Accent color updated to ${c.name}.` })
                          }}
                          whileHover={{ scale: 1.15, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "h-12 w-12 rounded-xl border-2 transition-all duration-200 shadow-md hover:shadow-xl relative group",
                            accentColor === c.value 
                              ? "border-foreground ring-4 ring-primary/30 ring-offset-2 ring-offset-background scale-110" 
                              : "border-transparent hover:border-foreground/20"
                          )}
                          style={{ backgroundColor: `hsl(${c.value})` }}
                          title={c.name}
                        >
                          {accentColor === c.value && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <Check className="h-5 w-5 text-white drop-shadow-lg" />
                            </motion.div>
                          )}
                          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {c.name}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <motion.div variants={itemVariants} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>
                    Choose what emails you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Analysis Complete</p>
                      <p className="text-sm text-muted-foreground">Get notified when your project analysis is done</p>
                    </div>
                    <Switch 
                      checked={notifications.emailAnalysis}
                      onCheckedChange={(c: boolean) => setNotifications(n => ({ ...n, emailAnalysis: c }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Job Matches</p>
                      <p className="text-sm text-muted-foreground">Receive emails for new job matches</p>
                    </div>
                    <Switch 
                      checked={notifications.emailJobMatch}
                      onCheckedChange={(c: boolean) => setNotifications(n => ({ ...n, emailJobMatch: c }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Digest</p>
                      <p className="text-sm text-muted-foreground">Summary of your activity and stats</p>
                    </div>
                    <Switch 
                      checked={notifications.emailWeeklyDigest}
                      onCheckedChange={(c: boolean) => setNotifications(n => ({ ...n, emailWeeklyDigest: c }))}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-primary" />
                    Push Notifications
                    <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                  </CardTitle>
                  <CardDescription>
                    Real-time notifications in your browser
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between opacity-50">
                    <div>
                      <p className="font-medium">Analysis Updates</p>
                      <p className="text-sm text-muted-foreground">Real-time analysis progress and completion</p>
                    </div>
                    <Switch 
                      checked={notifications.pushAnalysis}
                      onCheckedChange={(c: boolean) => setNotifications(n => ({ ...n, pushAnalysis: c }))}
                      disabled
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between opacity-50">
                    <div>
                      <p className="font-medium">New Job Matches</p>
                      <p className="text-sm text-muted-foreground">Instant alerts for matching jobs</p>
                    </div>
                    <Switch 
                      checked={notifications.pushJobMatch}
                      onCheckedChange={(c: boolean) => setNotifications(n => ({ ...n, pushJobMatch: c }))}
                      disabled
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between opacity-50">
                    <div>
                      <p className="font-medium">Recruiter Views</p>
                      <p className="text-sm text-muted-foreground">Know when recruiters view your profile</p>
                    </div>
                    <Switch 
                      checked={notifications.pushRecruiterView}
                      onCheckedChange={(c: boolean) => setNotifications(n => ({ ...n, pushRecruiterView: c }))}
                      disabled
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Privacy Section */}
          {activeSection === 'privacy' && (
            <motion.div variants={itemVariants} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Profile Visibility
                  </CardTitle>
                  <CardDescription>
                    Control what information is visible to others
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Public Profile</p>
                      <p className="text-sm text-muted-foreground">Allow anyone to view your profile</p>
                    </div>
                    <Switch 
                      checked={privacy.profilePublic}
                      onCheckedChange={(c: boolean) => handlePrivacyChange('profilePublic', c)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Email</p>
                      <p className="text-sm text-muted-foreground">Display email on your public profile</p>
                    </div>
                    <Switch 
                      checked={privacy.showEmail}
                      onCheckedChange={(c: boolean) => setPrivacy(p => ({ ...p, showEmail: c }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Location</p>
                      <p className="text-sm text-muted-foreground">Display your location publicly</p>
                    </div>
                    <Switch 
                      checked={privacy.showLocation}
                      onCheckedChange={(c: boolean) => setPrivacy(p => ({ ...p, showLocation: c }))}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Show Company</p>
                      <p className="text-sm text-muted-foreground">Display where you work</p>
                    </div>
                    <Switch 
                      checked={privacy.showCompany}
                      onCheckedChange={(c: boolean) => setPrivacy(p => ({ ...p, showCompany: c }))}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Recruiter Settings
                  </CardTitle>
                  <CardDescription>
                    Control how recruiters can find and contact you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Open to Work</p>
                      <p className="text-sm text-muted-foreground">Let recruiters know you're looking for opportunities</p>
                    </div>
                    <Switch 
                      checked={privacy.showInSearch}
                      onCheckedChange={(c: boolean) => handlePrivacyChange('showInSearch', c)}
                      disabled={updateSettingsMutation.isPending}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Allow Contact</p>
                      <p className="text-sm text-muted-foreground">Let recruiters send you messages</p>
                    </div>
                    <Switch 
                      checked={privacy.allowRecruiterContact}
                      onCheckedChange={(c: boolean) => setPrivacy(p => ({ ...p, allowRecruiterContact: c }))}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {updateSettingsMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving changes...
                </div>
              )}

              {/* Link to Advanced Privacy Settings */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Advanced Privacy & Job Settings
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Control job preferences, highlight skills, and manage project visibility for recruiters
                      </p>
                    </div>
                    <Link to="/settings/privacy">
                      <Button>
                        Open Settings
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Connected Accounts Section */}
          {activeSection === 'connected' && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5 text-primary" />
                    Connected Accounts
                  </CardTitle>
                  <CardDescription>
                    Manage your linked accounts and integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* GitHub - Connected */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-green-500/5 border-green-500/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-zinc-900 flex items-center justify-center">
                        <Github className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">GitHub</p>
                        <p className="text-sm text-muted-foreground">@{user?.githubUsername || user?.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="gap-1 bg-green-500">
                        <Check className="h-3 w-3" />
                        Connected
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <a 
                          href={`https://github.com/${user?.githubUsername || user?.username}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  
                  {/* GitLab - Not Connected */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Code2 className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">GitLab</p>
                        <p className="text-sm text-muted-foreground">Import projects from GitLab</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Coming Soon
                    </Button>
                  </div>
                  
                  {/* Bitbucket - Not Connected */}
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Code2 className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">Bitbucket</p>
                        <p className="text-sm text-muted-foreground">Import projects from Bitbucket</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Danger Zone Section */}
          {activeSection === 'danger' && (
            <motion.div variants={itemVariants} className="space-y-6">
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-muted bg-muted/30">
                    <div>
                      <p className="font-medium">Export Data</p>
                      <p className="text-sm text-muted-foreground">Download all your data in JSON format</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleExportData}
                      disabled={exportDataMutation.isPending}
                    >
                      {exportDataMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div>
                      <p className="font-medium text-destructive">Delete Account</p>
                      <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteAccount}
                      disabled={deleteAccountMutation.isPending}
                    >
                      {deleteAccountMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
