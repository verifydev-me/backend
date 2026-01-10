import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useRecruiterStore } from '@/store/recruiter-store'
import { useUIStore } from '@/store/ui-store'
import { cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Plus,
  Settings,
  ChevronLeft,
  Menu,
  Building,
  LogOut,
  MessageSquare,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/recruiter/dashboard', icon: LayoutDashboard },
  { name: 'Find Candidates', href: '/recruiter/candidates', icon: Users },
  { name: 'My Jobs', href: '/recruiter/jobs', icon: Briefcase },
  { name: 'Post Job', href: '/recruiter/post-job', icon: Plus },
  { name: 'Messages', href: '/recruiter/messages', icon: MessageSquare },
  { name: 'Settings', href: '/recruiter/settings', icon: Settings },
]

export default function RecruiterLayout() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { recruiter, logout } = useRecruiterStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/auth')
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
          'fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col',
          'border-r-[1.5px] border-border/60 shadow-[1px_0_10px_rgba(0,0,0,0.02)]', // More detailed border
          'bg-white dark:bg-black',
          sidebarOpen ? 'w-64' : 'w-20' // Slightly wider collapsed for better detailing
        )}
      >
        {/* Logo Section with Detailing */}
        <div className="flex h-16 items-center px-4 border-b border-border/50 bg-muted/5">
          <Link to="/recruiter/dashboard" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold shadow-lg shadow-primary/20 border border-primary/20">
              V
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-foreground leading-none">VerifyDev</span>
                <span className="text-[10px] font-medium text-primary mt-0.5">RECRUITER PORTAL</span>
              </div>
            )}
          </Link>
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="ml-auto h-8 w-8 hover:bg-muted/80 rounded-lg text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {!sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted transition-all"
            >
              <Menu className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
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
        <nav className="flex flex-col gap-2.5 p-3 mt-4 overflow-y-auto scrollbar-none flex-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/recruiter/dashboard' && location.pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 group relative',
                  'border border-transparent',
                  isActive
                    ? 'bg-primary/5 text-primary border-primary/20 shadow-[0_2px_10px_-3px_rgba(var(--primary),0.2)]'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border/30'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-all duration-300 relative z-10", isActive ? "text-primary scale-110" : "group-hover:text-foreground")} />
                {sidebarOpen && <span className="relative z-10 transition-transform duration-200 group-hover:translate-x-1">{item.name}</span>}
                {!sidebarOpen && isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-l-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Section with Detailing */}
        <div className="p-4 mt-auto border-t border-border/50 bg-muted/5">
          {recruiter && (
            <div className={cn('flex flex-col gap-3', sidebarOpen ? '' : 'items-center')}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-2xl p-2.5 transition-all border border-border/30 bg-card/50 shadow-sm hover:border-primary/30 hover:bg-muted/50 cursor-pointer group',
                  sidebarOpen ? 'justify-between' : 'justify-center border-none bg-transparent shadow-none'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 border-2 border-border/50 group-hover:border-primary/30 transition-colors">
                    <AvatarImage src="" alt={recruiterName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-xs font-bold">
                      {getInitials(recruiterName)}
                    </AvatarFallback>
                  </Avatar>
                  {sidebarOpen && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-foreground truncate max-w-[120px]">
                        {recruiterName}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] opacity-70">
                        {recruiterEmail}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Logout Button */}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className={cn(
                  'flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-xl',
                  sidebarOpen ? 'w-full justify-start px-3 py-2' : 'w-10 h-10 p-0 justify-center'
                )}
              >
                <LogOut className="h-4 w-4" />
                {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 flex flex-col',
          sidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        {/* Top Header Bar */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex h-14 items-center justify-between px-6">
            {/* Left side - Page Title */}
            <div />

            {/* Right side - User Actions */}
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10" asChild>
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
                  <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-xs font-semibold">
                      {getInitials(recruiterName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 relative overflow-hidden bg-muted/60 dark:bg-black p-6 md:p-8 min-h-[calc(100vh-3.5rem)]">
          {/* Premium Background Elements */}
          <div className="absolute inset-0 bg-grid-premium opacity-40 mix-blend-overlay pointer-events-none" />
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto w-full h-full relative z-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
