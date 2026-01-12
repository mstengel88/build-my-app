import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/lib/supabase-types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  employeeId: string | null;
  employeeCategory: 'plow' | 'shovel' | null;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isStaff: () => boolean;
  isAdminOrManager: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeCategory, setEmployeeCategory] = useState<'plow' | 'shovel' | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const SUPER_ADMIN_EMAIL = 'matthewstengel69@gmail.com';

  const fetchUserData = useCallback(async (userId: string, userEmail: string) => {
    try {
      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData) {
        setRoles(rolesData.map(r => r.role as AppRole));
      }

      // Fetch employee info
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id, category')
        .eq('user_id', userId)
        .maybeSingle();

      if (employeeData) {
        setEmployeeId(employeeData.id);
        setEmployeeCategory(employeeData.category as 'plow' | 'shovel');
      }

      // Check if super admin
      setIsSuperAdmin(userEmail === SUPER_ADMIN_EMAIL);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential deadlocks
          setTimeout(() => {
            fetchUserData(session.user.id, session.user.email || '');
          }, 0);
        } else {
          setRoles([]);
          setEmployeeId(null);
          setEmployeeCategory(null);
          setIsSuperAdmin(false);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id, session.user.email || '');
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setEmployeeId(null);
    setEmployeeCategory(null);
    setIsSuperAdmin(false);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const isStaff = () => 
    roles.some(r => ['admin', 'manager', 'driver', 'shovel_crew'].includes(r));

  const isAdminOrManager = () => 
    roles.some(r => ['admin', 'manager'].includes(r));

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        roles,
        employeeId,
        employeeCategory,
        isSuperAdmin,
        signIn,
        signUp,
        signOut,
        hasRole,
        isStaff,
        isAdminOrManager,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
