import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderGit2 },
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
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-lg">VerifyDev</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="ml-auto"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-2">
          {user && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg p-2',
                sidebarOpen ? 'justify-between' : 'justify-center'
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
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
                  className="h-8 w-8"
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
          'transition-all duration-300',
          sidebarOpen ? 'ml-64' : 'ml-16'
        )}
      >
        <div className="min-h-screen p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
