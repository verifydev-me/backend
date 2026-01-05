import { useState, useEffect } from 'react'
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
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
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
  const { user, logout, checkAuth } = useAuthStore()
  const { theme, setTheme, accentColor } = useUIStore()
  const queryClient = useQueryClient()
  
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')
  
  // Profile form state
  const [profile, setProfile] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    company: user?.company || '',
    twitter: user?.twitterUsername || user?.twitter || '',
    linkedin: user?.linkedin || '',
  })

  // Update profile when user changes
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        company: user.company || '',
        twitter: user.twitterUsername || user.twitter || '',
        linkedin: user.linkedin || '',
      })
    }
  }, [user])
  
  // Fetch settings from backend
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => get<{ settings: UserSettings }>('/v1/users/settings'),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    mutationFn: (data: typeof profile) => put('/v1/users/me', data),
    onSuccess: async () => {
      await checkAuth() // Refresh user data from backend
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

  // Update settings mutation (privacy/visibility)
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
      >
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, privacy, and preferences
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:w-64 flex-shrink-0"
        >
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground",
                      section.id === 'danger' && "text-destructive hover:text-destructive"
                    )}
                  >
                    <section.icon className="h-4 w-4" />
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
          
          {/* Profile Completion */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Profile Completion</span>
              </div>
              <Progress value={calculateProfileCompletion()} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {calculateProfileCompletion()}% complete - {calculateProfileCompletion() < 100 ? 'Add more details to increase visibility' : 'Great job!'}
              </p>
            </CardContent>
          </Card>
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Profile Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal information and how others see you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
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
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize how VerifyDev looks for you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-4">Theme</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          theme === 'light' 
                            ? "border-primary bg-primary/5" 
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <div className="h-16 w-full rounded-lg bg-white border mb-3 flex items-center justify-center">
                          <Sun className="h-8 w-8 text-yellow-500" />
                        </div>
                        <p className="font-medium text-sm">Light</p>
                        <p className="text-xs text-muted-foreground">Clean & bright</p>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          theme === 'dark' 
                            ? "border-primary bg-primary/5" 
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <div className="h-16 w-full rounded-lg bg-zinc-900 border border-zinc-700 mb-3 flex items-center justify-center">
                          <Moon className="h-8 w-8 text-blue-400" />
                        </div>
                        <p className="font-medium text-sm">Dark</p>
                        <p className="text-xs text-muted-foreground">Easy on eyes</p>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all",
                          theme === 'system' 
                            ? "border-primary bg-primary/5" 
                            : "border-muted hover:border-primary/50"
                        )}
                      >
                        <div className="h-16 w-full rounded-lg bg-gradient-to-r from-white to-zinc-900 border mb-3 flex items-center justify-center">
                          <Monitor className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-sm">System</p>
                        <p className="text-xs text-muted-foreground">Match device</p>
                      </button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-4">Accent Color</h3>
                    <p className="text-sm text-muted-foreground mb-6">Personalize the application's highlight color</p>
                    <div className="flex flex-wrap gap-4">
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
                        <button
                          key={c.value}
                          onClick={() => {
                            const { setAccentColor } = useUIStore.getState()
                            setAccentColor(c.value)
                            toast({ title: `${c.name} applied`, description: `Accent color updated to ${c.name}.` })
                          }}
                          className={cn(
                            "h-10 w-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 shadow-lg",
                            accentColor === c.value ? "border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-transparent"
                          )}
                          style={{ backgroundColor: `hsl(${c.value})` }}
                          title={c.name}
                        />
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
