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
