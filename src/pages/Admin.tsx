import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Users,
  Shield,
  Database,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  UserPlus,
  Key,
  Bell,
  MapPin,
  Clock,
  Snowflake,
  Check,
  X,
  Loader2,
  AlertTriangle,
  FileText,
  Activity,
  BarChart3,
  MessageSquare,
  Timer,
  LogOut,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { AppRole } from '@/lib/supabase-types';

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'Manage operations and staff' },
  { value: 'driver', label: 'Driver', description: 'Plow truck operations' },
  { value: 'shovel_crew', label: 'Shovel Crew', description: 'Sidewalk services' },
  { value: 'client', label: 'Client', description: 'Customer access only' },
];

// Timer component for live elapsed time
const LiveTimer = ({ startTime }: { startTime: string }) => {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <span className="font-mono text-sm text-primary">{elapsed}</span>;
};

const Admin = () => {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Fetch all users with roles
  const { data: usersWithRoles = [], isLoading: usersLoading } = useQuery({
    queryKey: ['usersWithRoles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      return profiles.map(profile => ({
        ...profile,
        roles: roles.filter(r => r.user_id === profile.user_id).map(r => r.role),
      }));
    },
  });

  // Fetch system settings
  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch backups
  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [accounts, employees, equipment, workLogsToday, notifications, clients] = await Promise.all([
        supabase.from('accounts').select('id', { count: 'exact', head: true }),
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('equipment').select('id', { count: 'exact', head: true }),
        supabase.from('work_logs').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('accounts').select('id', { count: 'exact', head: true }).not('client_user_id', 'is', null),
      ]);

      // Count admin/manager roles
      const { data: rolesData } = await supabase.from('user_roles').select('role');
      const adminCount = rolesData?.filter(r => r.role === 'admin').length || 0;
      const managerCount = rolesData?.filter(r => r.role === 'manager').length || 0;

      return {
        accounts: accounts.count || 0,
        employees: employees.count || 0,
        equipment: equipment.count || 0,
        workLogsToday: workLogsToday.count || 0,
        unreadNotifications: notifications.count || 0,
        clients: clients.count || 0,
        totalUsers: usersWithRoles.length || 0,
        adminCount,
        managerCount,
      };
    },
  });

  // Fetch employees currently on shift
  const { data: onShiftEmployees = [], isLoading: onShiftLoading, refetch: refetchOnShift } = useQuery({
    queryKey: ['onShiftEmployees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_clock')
        .select(`
          *,
          employees (
            id,
            name,
            category,
            role
          )
        `)
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const now = new Date().toISOString();
      const entry = onShiftEmployees.find(e => e.id === entryId);
      if (!entry) throw new Error('Entry not found');
      
      const clockInTime = new Date(entry.clock_in_time).getTime();
      const clockOutTime = new Date(now).getTime();
      const durationMinutes = Math.round((clockOutTime - clockInTime) / 60000);

      const { error } = await supabase
        .from('time_clock')
        .update({
          clock_out_time: now,
          duration_minutes: durationMinutes,
        })
        .eq('id', entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetchOnShift();
      toast({ title: 'Employee clocked out successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error clocking out', description: String(error), variant: 'destructive' });
    },
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const existing = settings.find(s => s.key === key);
      
      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value, updated_by: user?.id, updated_at: new Date().toISOString() })
          .eq('key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key, value, updated_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Setting updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating setting', description: String(error), variant: 'destructive' });
    },
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersWithRoles'] });
      toast({ title: 'Role added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error adding role', description: String(error), variant: 'destructive' });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usersWithRoles'] });
      toast({ title: 'Role removed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error removing role', description: String(error), variant: 'destructive' });
    },
  });

  // Create backup mutation - exports actual data as JSON file
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      // Fetch all data from each table
      const [
        accountsData,
        employeesData,
        equipmentData,
        workLogsData,
        shovelWorkLogsData,
        invoicesData,
        timeClockData,
        workLogEmployeesData,
        workLogEquipmentData,
        shovelWorkLogEmployeesData,
      ] = await Promise.all([
        supabase.from('accounts').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('equipment').select('*'),
        supabase.from('work_logs').select('*'),
        supabase.from('shovel_work_logs').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('time_clock').select('*'),
        supabase.from('work_log_employees').select('*'),
        supabase.from('work_log_equipment').select('*'),
        supabase.from('shovel_work_log_employees').select('*'),
      ]);

      const backupData = {
        exported_at: new Date().toISOString(),
        exported_by: user?.email || user?.id,
        data: {
          accounts: accountsData.data || [],
          employees: employeesData.data || [],
          equipment: equipmentData.data || [],
          work_logs: workLogsData.data || [],
          shovel_work_logs: shovelWorkLogsData.data || [],
          invoices: invoicesData.data || [],
          time_clock: timeClockData.data || [],
          work_log_employees: workLogEmployeesData.data || [],
          work_log_equipment: workLogEquipmentData.data || [],
          shovel_work_log_employees: shovelWorkLogEmployeesData.data || [],
        },
        counts: {
          accounts: accountsData.data?.length || 0,
          employees: employeesData.data?.length || 0,
          equipment: equipmentData.data?.length || 0,
          work_logs: workLogsData.data?.length || 0,
          shovel_work_logs: shovelWorkLogsData.data?.length || 0,
          invoices: invoicesData.data?.length || 0,
          time_clock: timeClockData.data?.length || 0,
          work_log_employees: workLogEmployeesData.data?.length || 0,
          work_log_equipment: workLogEquipmentData.data?.length || 0,
          shovel_work_log_employees: shovelWorkLogEmployeesData.data?.length || 0,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `backup_${timestamp}.json`;

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Also log the backup in the database
      const totalRecords = Object.values(backupData.counts).reduce((a, b) => a + b, 0);
      await supabase.from('backups').insert({
        filename,
        created_by: user?.id,
        entity_counts: backupData.counts,
        file_size_bytes: blob.size,
      });

      return filename;
    },
    onSuccess: (filename) => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast({ title: 'Backup exported successfully', description: `Downloaded ${filename}` });
    },
    onError: (error) => {
      toast({ title: 'Error exporting backup', description: String(error), variant: 'destructive' });
    },
  });

  const getSetting = (key: string, defaultValue: any = null) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value ?? defaultValue;
  };

  const handleToggleSetting = (key: string, currentValue: boolean) => {
    updateSettingMutation.mutate({ key, value: !currentValue });
  };

  const getRecordCount = (backup: any) => {
    if (!backup.entity_counts) return 0;
    const counts = backup.entity_counts as Record<string, number>;
    return Object.values(counts).reduce((a: number, b: number) => a + b, 0);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">System overview and management</p>
            </div>
          </div>
          <Button 
            className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => setInviteDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
        </div>

        <InviteUserDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />

        {/* Quick Action Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Geofence Alerts */}
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Geofence Alerts</p>
                    <p className="text-sm text-muted-foreground">Alert admins when employees clock in/out far from work sites</p>
                  </div>
                </div>
                <Switch
                  checked={getSetting('geofence_alerts_enabled', false)}
                  onCheckedChange={() => handleToggleSetting('geofence_alerts_enabled', getSetting('geofence_alerts_enabled', false))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Backup */}
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Database className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Data Backup</p>
                    <p className="text-sm text-muted-foreground">Export all app data to Google Drive</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="gap-2" 
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending}
                  >
                    {createBackupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {createBackupMutation.isPending ? 'Exporting...' : 'Export Now'}
                  </Button>
                  <Button className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
                    <Clock className="h-4 w-4" />
                    Schedule
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Backups */}
        <Card className="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Recent Backups</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {backupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No backups found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{backup.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(backup.created_at), 'MMM d, yyyy h:mm a')} • {getRecordCount(backup)} records
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-success text-success-foreground">completed</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold">{usersWithRoles.length || 0}</p>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="secondary" className="text-xs">{stats?.adminCount || 0} Admin</Badge>
                    <Badge variant="secondary" className="text-xs">{stats?.managerCount || 0} Manager</Badge>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-info/10">
                  <Users className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Notifications</p>
                  <p className="text-3xl font-bold">{stats?.unreadNotifications || 0}</p>
                  <Badge className="mt-2 bg-success text-success-foreground text-xs">{stats?.unreadNotifications || 0} Unread</Badge>
                </div>
                <div className="p-3 rounded-xl bg-warning/10">
                  <Bell className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Activity Today</p>
                  <p className="text-3xl font-bold">{stats?.workLogsToday || 0}</p>
                  <p className="text-xs text-muted-foreground mt-2">Work logs completed</p>
                </div>
                <div className="p-3 rounded-xl bg-shovel/10">
                  <Activity className="h-6 w-6 text-shovel" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Client Accounts</p>
                  <p className="text-3xl font-bold">{stats?.clients || 0}</p>
                  <p className="text-xs text-muted-foreground mt-2">Active clients</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="onshift" className="space-y-4">
          <TabsList className="glass flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="onshift" className="gap-2 text-xs sm:text-sm">
              <Clock className="h-4 w-4" />
              On Shift
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 text-xs sm:text-sm">
              <MessageSquare className="h-4 w-4" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 text-xs sm:text-sm">
              <Activity className="h-4 w-4" />
              Recent Activity
            </TabsTrigger>
          </TabsList>

          {/* On Shift Tab */}
          <TabsContent value="onshift" className="space-y-4">
            <Card className="glass">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Currently On Shift</CardTitle>
                  <Badge className="bg-success text-success-foreground">{onShiftEmployees.length} active</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {onShiftLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : onShiftEmployees.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No employees on shift today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {onShiftEmployees.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {entry.employees?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{entry.employees?.name || 'Unknown'}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs capitalize">
                                {entry.employees?.category || 'staff'}
                              </Badge>
                              <span>•</span>
                              <span>Clocked in {format(new Date(entry.clock_in_time), 'h:mm a')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-muted-foreground" />
                            <LiveTimer startTime={entry.clock_in_time} />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={() => clockOutMutation.mutate(entry.id)}
                            disabled={clockOutMutation.isPending}
                          >
                            {clockOutMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LogOut className="h-4 w-4" />
                            )}
                            Clock Out
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts and role assignments</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {usersWithRoles.map((userProfile) => (
                        <div
                          key={userProfile.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                              {userProfile.display_name?.charAt(0)?.toUpperCase() || userProfile.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{userProfile.display_name || userProfile.email.split('@')[0]}</p>
                              <p className="text-sm text-muted-foreground">{userProfile.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            {userProfile.roles.map((role: AppRole) => (
                              <Badge 
                                key={role} 
                                variant={role === 'admin' ? 'destructive' : role === 'manager' ? 'default' : 'secondary'}
                                className="gap-1"
                              >
                                {role}
                                {isSuperAdmin && userProfile.user_id !== user?.id && (
                                  <button
                                    onClick={() => removeRoleMutation.mutate({ userId: userProfile.user_id, role })}
                                    className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))}
                            
                            {isSuperAdmin && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7">
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Role</DialogTitle>
                                    <DialogDescription>
                                      Add a role to {userProfile.display_name || userProfile.email}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    {ROLE_OPTIONS.filter(r => !userProfile.roles.includes(r.value)).map((role) => (
                                      <Button
                                        key={role.value}
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => {
                                          addRoleMutation.mutate({ userId: userProfile.user_id, role: role.value });
                                        }}
                                      >
                                        <Shield className="h-4 w-4 mr-2" />
                                        <div className="text-left">
                                          <p className="font-medium">{role.label}</p>
                                          <p className="text-xs text-muted-foreground">{role.description}</p>
                                        </div>
                                      </Button>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Placeholder tabs */}
          <TabsContent value="requests" className="space-y-4">
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Service requests will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Invoices will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Client accounts will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Notifications will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Recent activity will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
