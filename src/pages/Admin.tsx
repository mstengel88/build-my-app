import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const Admin = () => {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('driver');
  const [isAddingUser, setIsAddingUser] = useState(false);

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
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [accounts, employees, equipment, workLogs] = await Promise.all([
        supabase.from('accounts').select('id', { count: 'exact', head: true }),
        supabase.from('employees').select('id', { count: 'exact', head: true }),
        supabase.from('equipment').select('id', { count: 'exact', head: true }),
        supabase.from('work_logs').select('id', { count: 'exact', head: true }),
      ]);

      return {
        accounts: accounts.count || 0,
        employees: employees.count || 0,
        equipment: equipment.count || 0,
        workLogs: workLogs.count || 0,
      };
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

  const getSetting = (key: string, defaultValue: any = null) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value ?? defaultValue;
  };

  const handleToggleSetting = (key: string, currentValue: boolean) => {
    updateSettingMutation.mutate({ key, value: !currentValue });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">System configuration and management</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.accounts || 0}</p>
                  <p className="text-xs text-muted-foreground">Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.employees || 0}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Database className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.equipment || 0}</p>
                  <p className="text-xs text-muted-foreground">Equipment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Snowflake className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.workLogs || 0}</p>
                  <p className="text-xs text-muted-foreground">Work Logs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="backups" className="gap-2">
              <Database className="h-4 w-4" />
              Backups
            </TabsTrigger>
          </TabsList>

          {/* Users & Roles Tab */}
          <TabsContent value="users" className="space-y-6">
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
                  <ScrollArea className="h-[500px]">
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

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Geofence Settings */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Geofence Settings
                  </CardTitle>
                  <CardDescription>Configure location-based check-in/out</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Geofencing</Label>
                      <p className="text-sm text-muted-foreground">Require GPS verification for check-ins</p>
                    </div>
                    <Switch
                      checked={getSetting('geofence_enabled', true)}
                      onCheckedChange={() => handleToggleSetting('geofence_enabled', getSetting('geofence_enabled', true))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Geofence Radius (meters)</Label>
                    <Input
                      type="number"
                      value={getSetting('geofence_radius', 100)}
                      onChange={(e) => updateSettingMutation.mutate({ key: 'geofence_radius', value: parseInt(e.target.value) })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>Configure system notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weather Alerts</Label>
                      <p className="text-sm text-muted-foreground">Notify when snow is forecasted</p>
                    </div>
                    <Switch
                      checked={getSetting('weather_alerts_enabled', true)}
                      onCheckedChange={() => handleToggleSetting('weather_alerts_enabled', getSetting('weather_alerts_enabled', true))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Reminders</Label>
                      <p className="text-sm text-muted-foreground">Alert before equipment service is due</p>
                    </div>
                    <Switch
                      checked={getSetting('maintenance_reminders_enabled', true)}
                      onCheckedChange={() => handleToggleSetting('maintenance_reminders_enabled', getSetting('maintenance_reminders_enabled', true))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Time Clock Settings */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time Clock Settings
                  </CardTitle>
                  <CardDescription>Configure time tracking options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require GPS on Clock-In</Label>
                      <p className="text-sm text-muted-foreground">Capture location when employees clock in</p>
                    </div>
                    <Switch
                      checked={getSetting('require_gps_clock_in', true)}
                      onCheckedChange={() => handleToggleSetting('require_gps_clock_in', getSetting('require_gps_clock_in', true))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Auto Clock-Out After (hours)</Label>
                    <Input
                      type="number"
                      value={getSetting('auto_clock_out_hours', 12)}
                      onChange={(e) => updateSettingMutation.mutate({ key: 'auto_clock_out_hours', value: parseInt(e.target.value) })}
                    />
                    <p className="text-sm text-muted-foreground">Automatically clock out employees after this duration</p>
                  </div>
                </CardContent>
              </Card>

              {/* Service Settings */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Snowflake className="h-5 w-5" />
                    Service Settings
                  </CardTitle>
                  <CardDescription>Configure service logging options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Photos</Label>
                      <p className="text-sm text-muted-foreground">Require photo documentation for services</p>
                    </div>
                    <Switch
                      checked={getSetting('require_photos', false)}
                      onCheckedChange={() => handleToggleSetting('require_photos', getSetting('require_photos', false))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Calculate Salt</Label>
                      <p className="text-sm text-muted-foreground">Suggest salt amounts based on area</p>
                    </div>
                    <Switch
                      checked={getSetting('auto_calculate_salt', true)}
                      onCheckedChange={() => handleToggleSetting('auto_calculate_salt', getSetting('auto_calculate_salt', true))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Backups Tab */}
          <TabsContent value="backups" className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Data Backups</CardTitle>
                    <CardDescription>Manage system backups and data exports</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Import
                    </Button>
                    <Button className="gap-2">
                      <Download className="h-4 w-4" />
                      Create Backup
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {backupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No backups found</p>
                    <p className="text-sm">Create your first backup to protect your data</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {backups.map((backup) => (
                        <div
                          key={backup.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Database className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{backup.filename}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(backup.created_at), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {backup.file_size_bytes && (
                              <Badge variant="secondary">
                                {(backup.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                              </Badge>
                            )}
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. The backup file will be permanently deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="glass border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible and destructive actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30">
                  <div>
                    <p className="font-medium">Clear All Work Logs</p>
                    <p className="text-sm text-muted-foreground">Delete all work log entries. This cannot be undone.</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Clear Logs
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete ALL work logs from the system. This action cannot be undone. 
                          Please create a backup first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, Delete All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
