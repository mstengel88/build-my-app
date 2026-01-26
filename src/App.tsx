import { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PWAInstallBanner } from "@/components/pwa/PWAInstallBanner";
import { SplashLoader, PageLoader } from "@/components/pwa/SplashLoader";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ShovelCrew = lazy(() => import("./pages/ShovelCrew"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Equipment = lazy(() => import("./pages/Equipment"));
const Employees = lazy(() => import("./pages/Employees"));
const TimeClock = lazy(() => import("./pages/TimeClock"));
const WorkLogs = lazy(() => import("./pages/WorkLogs"));
const Reports = lazy(() => import("./pages/Reports"));
const Admin = lazy(() => import("./pages/Admin"));
const RoutePlanner = lazy(() => import("./pages/RoutePlanner"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Profile = lazy(() => import("./pages/Profile"));

const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient for iOS performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data longer for offline reliability
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      // Reduce unnecessary refetches on iOS
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      // Retry with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Network mode for better offline handling
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations on network failure
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// Component to handle role-based redirect after login
const RoleBasedRedirect = () => {
  const { loading, rolesLoading, employeeCategory, isStaff } = useAuth();

  if (loading || rolesLoading) return null;

  // Clients go to client portal
  if (!isStaff()) {
    return <Navigate to="/client-portal" replace />;
  }

  // Shovel crew goes to shovel dashboard
  if (employeeCategory === 'shovel') {
    return <Navigate to="/shovel-crew" replace />;
  }

  // Everyone else goes to main dashboard
  return <Navigate to="/dashboard" replace />;
};

// Main app content with initial splash screen
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if this is a fresh page load (not a navigation)
    const isFirstVisit = !sessionStorage.getItem('app_loaded');
    if (!isFirstVisit) {
      setShowSplash(false);
    } else {
      sessionStorage.setItem('app_loaded', 'true');
    }
  }, []);

  return (
    <>
      {showSplash && <SplashLoader onComplete={() => setShowSplash(false)} />}
      <OfflineIndicator />
      <PWAInstallBanner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/install" element={<Install />} />

          {/* Role-based redirect */}
          <Route path="/redirect" element={<RoleBasedRedirect />} />

          {/* Staff routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireStaff>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shovel-crew"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'shovel_crew']}>
                <ShovelCrew />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Accounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Equipment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Employees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/time-clock"
            element={
              <ProtectedRoute requireStaff>
                <TimeClock />
              </ProtectedRoute>
            }
          />
          <Route
            path="/work-logs"
            element={
              <ProtectedRoute requireStaff>
                <WorkLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/route-planner"
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'driver']}>
                <RoutePlanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-log"
            element={
              <ProtectedRoute requireSuperAdmin>
                <AuditLog />
              </ProtectedRoute>
            }
          />
          {/* Redirect /users to /employees for backwards compatibility */}
          <Route path="/users" element={<Navigate to="/employees" replace />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Client routes */}
          <Route
            path="/client-portal"
            element={
              <ProtectedRoute>
                <ClientPortal />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
