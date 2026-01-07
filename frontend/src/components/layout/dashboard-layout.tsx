/**
 * Dashboard Layout - PREMIUM THEME-AWARE
 * Sidebar and header that dynamically respond to accent color.
 */

import { Outlet, Link, useLocation } from 'react-router-dom'
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
  LogOut,
  ChevronLeft,
  User,
  Menu,
  ScrollText,
  Search,
  Sparkles,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderGit2 },
  { name: 'Resume', href: '/resume', icon: ScrollText },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Applications', href: '/applications', icon: FileText },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout() {
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-border">
          {sidebarOpen && (
             <Link to="/dashboard" className="flex items-center gap-2 px-2">
               <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                 V
               </div>
               <span className="font-semibold text-foreground">VerifyDev</span>
             </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="ml-auto h-8 w-8"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
                {sidebarOpen && <span>{item.name}</span>}
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

        {/* User section */}
        <div className="p-2 mt-auto border-t border-border">
          {user && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted cursor-pointer',
                sidebarOpen ? 'justify-between' : 'justify-center'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8 rounded-xl border border-border">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xs">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </span>
                  </div>
                )}
              </div>
              {sidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => logout()}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
          'min-h-screen transition-all duration-300 flex flex-col',
          sidebarOpen ? 'ml-64' : 'ml-16'
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
        <div className="flex-1 bg-muted/30 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
