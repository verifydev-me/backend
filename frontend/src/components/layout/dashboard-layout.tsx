/**
 * Dashboard Layout - PREMIUM THEME-AWARE
 * Sidebar and header that dynamically respond to accent color.
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationCenter } from '@/components/ui/notification-center'
import {
  LayoutDashboard,
  FolderGit2,
  Briefcase,
  FileText,
  Settings,
  ChevronLeft,
  User,
  Menu,
  ScrollText,
  Search,
  Sparkles,
  LogOut,
  MessageSquare,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderGit2 },
  { name: 'Resume', href: '/resume', icon: ScrollText },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Applications', href: '/applications', icon: FileText },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Career Profile', href: '/profile', icon: User },
  { name: 'Quick Apply', href: '/settings/job-preferences', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold shadow-lg shadow-primary/20 border border-primary/20">
              V
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg tracking-tight text-foreground">VerifyDev</span>
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

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2.5 overflow-y-auto scrollbar-none">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
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
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-all duration-300 relative z-10", isActive ? "text-primary scale-110" : "group-hover:text-foreground border-border")} />
                {sidebarOpen && <span className="relative z-10 transition-transform duration-200 group-hover:translate-x-1">{item.name}</span>}
                {!sidebarOpen && isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-l-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Aura Badge (Collapsed shows icon, Expanded shows full) */}
        {sidebarOpen && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Aura Score</span>
            </div>
            <div className="text-xl font-bold text-foreground mt-1">{user?.auraScore || 0}</div>
          </div>
        )}

        <div className="p-4 mt-auto border-t border-border/50 bg-muted/5">
          {user && (
            <div className={cn('flex flex-col gap-3', sidebarOpen ? '' : 'items-center')}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-2xl p-2.5 transition-all border border-border/30 bg-card/50 shadow-sm hover:border-primary/30 hover:bg-muted/50 cursor-pointer group',
                  sidebarOpen ? 'justify-between' : 'justify-center border-none bg-transparent shadow-none'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 rounded-xl border-2 border-border/50 group-hover:border-primary/30 transition-colors">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xs font-bold">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  {sidebarOpen && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">
                        {user.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate opacity-70">
                        @{user.username}
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
        {/* Top Header */}
        <div className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{navigation.find(n => n.href === location.pathname)?.name || 'Page'}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted border border-border text-sm text-muted-foreground w-56">
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <kbd className="ml-auto text-[10px] bg-background px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
            </div>
            <NotificationCenter />
            {user && (
              <Link to="/profile">
                <Avatar className="h-8 w-8 rounded-xl cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all border border-border">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xs">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden bg-muted/60 dark:bg-black p-6 md:p-8">
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
