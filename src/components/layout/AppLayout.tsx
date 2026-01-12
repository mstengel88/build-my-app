import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Menu,
  Home,
  ClipboardList,
  Truck,
  Users,
  MapPin,
  FileText,
  LogOut,
  LayoutDashboard,
  Clock,
  Shovel,
  CloudSnow,
  Route,
  Database,
  User,
  ChevronDown,
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
}

// Main navigation items (shown directly in nav bar)
const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'manager', 'driver'] },
  { title: 'Shovel Crew', href: '/shovel-crew', icon: Shovel, roles: ['admin', 'manager', 'shovel_crew'] },
  { title: 'Work Logs', href: '/work-logs', icon: ClipboardList, roles: ['admin', 'manager', 'driver', 'shovel_crew'] },
  { title: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'manager'] },
];

// Secondary navigation items (shown in dropdown)
const dropdownNavItems: NavItem[] = [
  { title: 'Accounts', href: '/accounts', icon: MapPin, roles: ['admin', 'manager'] },
  { title: 'Equipment', href: '/equipment', icon: Truck, roles: ['admin', 'manager'] },
  { title: 'Employees', href: '/employees', icon: Users, roles: ['admin', 'manager'] },
  { title: 'Time Clock', href: '/time-clock', icon: Clock, roles: ['admin', 'manager', 'driver', 'shovel_crew'] },
  { title: 'Route Planner', href: '/route-planner', icon: Route, roles: ['admin', 'manager', 'driver'] },
  { title: 'Snow Forecast', href: '/snow-forecast', icon: CloudSnow, roles: ['admin', 'manager'] },
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

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!item.roles) return true;
      if (isSuperAdmin) return true;
      return item.roles.some((role) => roles.includes(role as any));
    });
  };

  const filteredMainNav = filterItems(mainNavItems);
  const filteredDropdownNav = filterItems(dropdownNavItems);

  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={winterwatchLogo} alt="WinterWatch-Pro" className="h-8 w-8 rounded-full object-cover" />
              <span className="text-xl font-bold text-foreground hidden sm:inline">WinterWatch-Pro</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredMainNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side: Notifications + User Dropdown */}
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
              
              {/* User Dropdown - Desktop */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="max-w-[100px] truncate">{userName}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{userName}</span>
                        <span className="text-xs text-muted-foreground font-normal">
                          {roles.join(', ') || 'User'}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {/* Profile Link */}
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    {/* Other navigation items */}
                    {filteredDropdownNav.map((item) => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                          <Icon className="h-4 w-4 mr-2" />
                          {item.title}
                        </DropdownMenuItem>
                      );
                    })}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Sign Out */}
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile Menu Button */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden touch-target">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <div className="flex h-full flex-col">
                    {/* User info */}
                    <div className="flex items-center gap-3 p-4 border-b border-border">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {roles.join(', ') || 'User'}
                        </p>
                      </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                      {/* Main nav items */}
                      {filteredMainNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}

                      <div className="my-2 border-t border-border" />

                      {/* Dropdown nav items */}
                      {filteredDropdownNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                    </nav>

                    {/* Footer actions */}
                    <div className="border-t border-border p-4 space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                          setMobileOpen(false);
                          navigate('/profile');
                        }}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="container py-6 px-4 md:px-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
