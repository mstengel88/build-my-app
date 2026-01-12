import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ShovelCrew from "./pages/ShovelCrew";
import ClientPortal from "./pages/ClientPortal";
import Accounts from "./pages/Accounts";
import Equipment from "./pages/Equipment";
import Employees from "./pages/Employees";
import TimeClock from "./pages/TimeClock";
import WorkLogs from "./pages/WorkLogs";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import RoutePlanner from "./pages/RoutePlanner";
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle role-based redirect after login
const RoleBasedRedirect = () => {
  const { loading, roles, employeeCategory, isStaff } = useAuth();

  if (loading) return null;

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />

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
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
