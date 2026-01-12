import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import {
  Menu,
  Home,
  ClipboardList,
  Truck,
  Users,
  MapPin,
  FileText,
  Settings,
  LogOut,
  LayoutDashboard,
  Clock,
  Shovel,
  CloudSnow,
  Route,
  Shield,
  Database,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import winterwatchLogo from '@/assets/winterwatch-pro-logo.png';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  badge?: string;
}

const navigationItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'manager', 'driver'] },
  { title: 'Shovel Crew', href: '/shovel-crew', icon: Shovel, roles: ['admin', 'manager', 'shovel_crew'] },
  { title: 'Accounts', href: '/accounts', icon: MapPin, roles: ['admin', 'manager'] },
  { title: 'Work Logs', href: '/work-logs', icon: ClipboardList, roles: ['admin', 'manager', 'driver', 'shovel_crew'] },
  { title: 'Equipment', href: '/equipment', icon: Truck, roles: ['admin', 'manager'] },
  { title: 'Employees', href: '/employees', icon: Users, roles: ['admin', 'manager'] },
  { title: 'Time Clock', href: '/time-clock', icon: Clock, roles: ['admin', 'manager', 'driver', 'shovel_crew'] },
  { title: 'Route Planner', href: '/route-planner', icon: Route, roles: ['admin', 'manager', 'driver'] },
  { title: 'Snow Forecast', href: '/snow-forecast', icon: CloudSnow, roles: ['admin', 'manager'] },
  { title: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
  { title: 'Admin', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { title: 'Audit Log', href: '/audit-log', icon: Database, roles: ['admin'] },
];

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut, roles, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredNavItems = navigationItems.filter((item) => {
    if (!item.roles) return true;
    if (isSuperAdmin) return true;
    return item.roles.some((role) => roles.includes(role as any));
  });

  const NavContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={winterwatchLogo} alt="WinterWatch-Pro" className="h-8 w-8 rounded-full object-cover" />
          <span className="text-xl font-bold text-foreground">WinterWatch-Pro</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors touch-target',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.title}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {roles.join(', ') || 'User'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => navigate('/profile')}
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="touch-target">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <NavContent />
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center gap-2">
          <img src={winterwatchLogo} alt="WinterWatch-Pro" className="h-6 w-6 rounded-full object-cover" />
          <span className="font-bold">WinterWatch-Pro</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <NotificationsDropdown />
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-sidebar">
          <NavContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-64">
          <div className="container py-6 px-4 md:px-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
