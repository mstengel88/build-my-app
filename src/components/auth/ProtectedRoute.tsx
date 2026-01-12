import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '@/lib/supabase-types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireStaff?: boolean;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireStaff = false,
  requireAdmin = false,
  requireSuperAdmin = false,
}: ProtectedRouteProps) => {
  const { user, loading, rolesLoading, roles, isStaff, isAdminOrManager, isSuperAdmin } = useAuth();
  const location = useLocation();

  // Wait for both auth and roles to load
  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check super admin requirement
  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdminOrManager()) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check staff requirement
  if (requireStaff && !isStaff()) {
    // Non-staff users (clients) should go to client portal
    return <Navigate to="/client-portal" replace />;
  }

  // Check specific role requirements
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.some(role => roles.includes(role)) || isSuperAdmin;
    if (!hasAllowedRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
