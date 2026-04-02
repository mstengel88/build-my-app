import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataTable, StatusBadge, Column } from '@/components/management/DataTable';
import { CSVImport } from '@/components/management/CSVImport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Mail, 
  Phone, 
  Shovel, 
  Truck, 
  Upload, 
  UserCheck, 
  Shield, 
  Loader2, 
  Save,
  UserCog
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { EmployeeRole, EmployeeCategory, EmployeeStatus, AppRole } from '@/lib/supabase-types';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  is_super_admin: boolean;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  category: string;
  status: string;
  hire_date: string | null;
  user_id: string | null;
}

const employeeRoles: { value: EmployeeRole; label: string }[] = [
  { value: 'driver', label: 'Driver' },
  { value: 'operator', label: 'Operator' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'other', label: 'Other' },
];

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'Manage accounts, employees, equipment' },
  { value: 'driver', label: 'Driver', description: 'Plow truck driver access' },
  { value: 'shovel_crew', label: 'Shovel Crew', description: 'Sidewalk crew access' },
  { value: 'client', label: 'Client', description: 'Customer portal access' },
];

const defaultFormData = {
  name: '',
  email: '',
  phone: '',
  role: 'driver' as EmployeeRole,
  category: 'plow' as EmployeeCategory,
  status: 'active' as EmployeeStatus,
  hire_date: '',
  user_id: '' as string,
};

const getRoleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'manager':
      return 'default';
    case 'driver':
      return 'secondary';
    case 'shovel_crew':
      return 'outline';
    case 'client':
      return 'secondary';
    default:
      return 'outline';
  }
};

const Employees = () => {
  const { toast: toastHook } = useToast();
  const { roles: userRolesAuth } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [activeTab, setActiveTab] = useState('employees');

  // User roles management state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editedRoles, setEditedRoles] = useState<AppRole[]>([]);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  const isAdmin = userRolesAuth.includes('admin');

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Employee[];
    },
  });

  // Fetch users for assignment and user management
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['profiles-for-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, is_super_admin')
        .order('email');
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Fetch all user roles
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['user-roles-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role');
      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Get roles for a specific user
  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles
      .filter(ur => ur.user_id === userId)
      .map(ur => ur.role);
  };

  // Update roles mutation
  const updateRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: AppRole[] }) => {
      const currentRoles = getUserRoles(userId);
      const rolesToAdd = roles.filter(r => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter(r => !roles.includes(r));

      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .in('role', rolesToRemove);
        if (deleteError) throw deleteError;
      }

      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToAdd.map(role => ({ user_id: userId, role })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-management'] });
      toast.success('Roles updated successfully');
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      console.error('Error updating roles:', error);
      toast.error('Failed to update roles');
    },
  });

  const handleEditRoles = (user: UserProfile) => {
    setSelectedUser(user);
    setEditedRoles(getUserRoles(user.user_id));
    setIsRoleDialogOpen(true);
  };

  const handleRoleToggle = (role: AppRole) => {
    setEditedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveRoles = () => {
    if (!selectedUser) return;
    updateRolesMutation.mutate({
      userId: selectedUser.user_id,
      roles: editedRoles,
    });
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role,
        category: data.category,
        status: data.status,
        hire_date: data.hire_date || null,
        user_id: data.user_id || null,
      };

      if (selectedEmployee) {
        const { error } = await supabase
          .from('employees')
          .update(payload)
          .eq('id', selectedEmployee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employees').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDialogOpen(false);
      resetForm();
      toastHook({
        title: selectedEmployee ? 'Employee updated' : 'Employee created',
        description: `${formData.name} has been ${selectedEmployee ? 'updated' : 'added'}.`,
      });
    },
    onError: (error) => {
      toastHook({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
      toastHook({
        title: 'Employee deleted',
        description: 'The employee has been removed.',
      });
    },
    onError: (error) => {
      toastHook({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData(defaultFormData);
    setSelectedEmployee(null);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role as EmployeeRole,
      category: employee.category as EmployeeCategory,
      status: employee.status as EmployeeStatus,
      hire_date: employee.hire_date || '',
      user_id: employee.user_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleCSVImport = async (data: Record<string, any>[]) => {
    const dataWithDefaults = data.map(row => ({
      ...row,
      role: row.role || 'driver',
      category: row.category || 'plow',
      status: row.status || 'active',
    }));
    const { error } = await supabase.from('employees').insert(dataWithDefaults as any);
    if (error) throw new Error(error.message || error.details || 'Failed to import employees');
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const csvColumns = [
    { key: 'name', label: 'Name', required: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'hire_date', label: 'Hire Date' },
  ];

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (employee) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium truncate">{employee.name}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Type',
      render: (employee) => {
        const isPlow = employee.category === 'plow';
        return (
          <div className="flex items-center gap-1">
            {isPlow ? (
              <Truck className="h-4 w-4 text-primary" />
            ) : (
              <Shovel className="h-4 w-4 text-shovel" />
            )}
            <Badge variant={isPlow ? 'default' : 'secondary'} className={`text-xs ${!isPlow ? 'bg-shovel text-shovel-foreground' : ''}`}>
              {isPlow ? 'Plow' : 'Shovel'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (employee) => <StatusBadge status={employee.status} />,
    },
  ];

  // Stats
  const activeCount = employees.filter((e) => e.status === 'active').length;
  const plowCount = employees.filter((e) => e.category === 'plow' && e.status === 'active').length;
  const shovelCount = employees.filter((e) => e.category === 'shovel' && e.status === 'active').length;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Team Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage employees and user accounts
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12">
            <TabsTrigger value="employees" className="text-sm h-10">
              <Users className="h-4 w-4 mr-2" />
              Employees
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="text-sm h-10">
                <UserCog className="h-4 w-4 mr-2" />
                Users & Roles
              </TabsTrigger>
            )}
          </TabsList>

          {/* Employees Tab */}
          <TabsContent value="employees" className="mt-4 space-y-4">
            {/* Stats - Horizontal scroll on mobile */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
              <Card className="glass shrink-0 w-[140px] sm:w-auto">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">{employees.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </CardContent>
              </Card>
              <Card className="glass shrink-0 w-[140px] sm:w-auto">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-success">{activeCount}</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </CardContent>
              </Card>
              <Card className="glass shrink-0 w-[140px] sm:w-auto">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-primary">{plowCount}</div>
                  <div className="text-xs text-muted-foreground">Plow</div>
                </CardContent>
              </Card>
              <Card className="glass shrink-0 w-[140px] sm:w-auto">
                <CardContent className="p-3 sm:p-4">
                  <div className="text-xl sm:text-2xl font-bold text-shovel">{shovelCount}</div>
                  <div className="text-xs text-muted-foreground">Shovel</div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <CSVImport
                tableName="Employees"
                columns={csvColumns}
                onImport={handleCSVImport}
                trigger={
                  <Button variant="outline" size="sm" className="h-10">
                    <Upload className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                }
              />
            </div>

            {/* Data Table */}
            <Card className="glass">
              <CardContent className="p-3 sm:p-6">
                <DataTable
                  title="Employee"
                  data={employees}
                  columns={columns}
                  isLoading={isLoading}
                  onAdd={handleAdd}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  searchPlaceholder="Search employees..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          {isAdmin && (
            <TabsContent value="users" className="mt-4 space-y-4">
              {/* User Stats */}
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
                <Card className="glass shrink-0 w-[140px] sm:w-auto">
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{users.length}</div>
                    <div className="text-xs text-muted-foreground">Total Users</div>
                  </CardContent>
                </Card>
                <Card className="glass shrink-0 w-[140px] sm:w-auto">
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-destructive">
                      {users.filter(u => getUserRoles(u.user_id).includes('admin')).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Admins</div>
                  </CardContent>
                </Card>
                <Card className="glass shrink-0 w-[140px] sm:w-auto">
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      {users.filter(u => getUserRoles(u.user_id).includes('manager')).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Managers</div>
                  </CardContent>
                </Card>
              </div>

              {/* Users List - Mobile optimized */}
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground">System Users</CardTitle>
                  <CardDescription className="text-xs">
                    Tap a user to edit their roles
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {usersLoading || rolesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[60vh]">
                      <div className="divide-y divide-border">
                        {users.map(user => {
                          const roles = getUserRoles(user.user_id);
                          return (
                            <button
                              key={user.id}
                              onClick={() => handleEditRoles(user)}
                              className="w-full p-4 text-left hover:bg-muted/50 transition-colors active:bg-muted"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground truncate">
                                    {user.display_name || 'No name'}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                  </p>
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {user.is_super_admin && (
                                      <Badge variant="destructive" className="text-xs gap-1">
                                        <Shield className="h-3 w-3" />
                                        Super
                                      </Badge>
                                    )}
                                    {roles.length > 0 ? (
                                      roles.map(role => (
                                        <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                                          {role.replace('_', ' ')}
                                        </Badge>
                                      ))
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No roles</span>
                                    )}
                                  </div>
                                </div>
                                <UserCog className="h-5 w-5 text-muted-foreground shrink-0" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
            <DialogDescription>
              {selectedEmployee ? 'Update employee details' : 'Add a new team member'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as EmployeeRole })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as EmployeeCategory })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plow">Plow</SelectItem>
                    <SelectItem value="shovel">Shovel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as EmployeeStatus })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_id">Assign to User</Label>
              <Select
                value={formData.user_id || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, user_id: value === '__none__' ? '' : value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.display_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link this employee to a user account
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-12 w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending} className="h-12 w-full sm:w-auto">
                {saveMutation.isPending ? 'Saving...' : selectedEmployee ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEmployee?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="h-12 w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEmployee && deleteMutation.mutate(selectedEmployee.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 w-full sm:w-auto"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Roles Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit User Roles</DialogTitle>
            <DialogDescription>
              {selectedUser?.display_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {AVAILABLE_ROLES.map(role => (
              <label
                key={role.value}
                className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  editedRoles.includes(role.value) ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  id={role.value}
                  checked={editedRoles.includes(role.value)}
                  onCheckedChange={() => handleRoleToggle(role.value)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    {role.label}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
              className="h-12 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRoles}
              disabled={updateRolesMutation.isPending}
              className="h-12 w-full sm:w-auto"
            >
              {updateRolesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Employees;
