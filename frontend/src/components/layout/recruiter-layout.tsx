import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useRecruiterStore } from '@/store/recruiter-store'
import { useUIStore } from '@/store/ui-store'
import { cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Plus,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Building,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/recruiter/dashboard', icon: LayoutDashboard },
  { name: 'Find Candidates', href: '/recruiter/candidates', icon: Users },
  { name: 'My Jobs', href: '/recruiter/jobs', icon: Briefcase },
  { name: 'Post Job', href: '/recruiter/post-job', icon: Plus },
  { name: 'Settings', href: '/recruiter/settings', icon: Settings },
]

export default function RecruiterLayout() {
  const { recruiter, logout } = useRecruiterStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/recruiter/login')
  }

  // Get recruiter info safely
  const recruiterData = recruiter as any
  const recruiterName = recruiterData?.name || 'Recruiter'
  const recruiterEmail = recruiterData?.email || ''
  const organizationName = recruiterData?.organization?.name || recruiterData?.companyName || 'Organization'

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {sidebarOpen && (
            <Link to="/recruiter/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">VerifyDev</span>
                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-400">
                  Recruiter
                </Badge>
              </div>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="ml-auto hover:bg-muted"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Organization Badge - Collapsed view */}
        {sidebarOpen && (
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/50">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate">{organizationName}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-2 mt-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
                           (item.href !== '/recruiter/dashboard' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-400 border-l-2 border-orange-500'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-orange-400")} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-2">
          {recruiter && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg p-2',
                sidebarOpen ? 'justify-between' : 'justify-center'
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border-2 border-orange-500/30">
                  <AvatarImage src="" alt={recruiterName} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm font-semibold">
                    {getInitials(recruiterName)}
                  </AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {recruiterName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {recruiterEmail}
                    </span>
                  </div>
                )}
              </div>
              {sidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-8 w-8 hover:bg-red-500/10 hover:text-red-400"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen bg-background transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        {/* Top Header Bar */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex h-14 items-center justify-between px-6">
            {/* Left side - Page Title */}
            <div />
            
            {/* Right side - User Actions */}
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10" asChild>
                <Link to="/recruiter/post-job">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Job
                </Link>
              </Button>
              {recruiter && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {recruiterName}
                  </span>
                  <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-orange-500/30 transition-all">
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-semibold">
                      {getInitials(recruiterName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
