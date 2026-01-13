import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Users as UsersIcon, Shield, Loader2, Save } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AppRole } from '@/lib/supabase-types';

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

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'Manage accounts, employees, equipment' },
  { value: 'driver', label: 'Driver', description: 'Plow truck driver access' },
  { value: 'shovel_crew', label: 'Shovel Crew', description: 'Sidewalk crew access' },
  { value: 'client', label: 'Client', description: 'Customer portal access' },
];

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

const Users = () => {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editedRoles, setEditedRoles] = useState<AppRole[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all user profiles
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users-management'],
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
      // Get current roles for user
      const currentRoles = getUserRoles(userId);

      // Roles to add
      const rolesToAdd = roles.filter(r => !currentRoles.includes(r));
      // Roles to remove
      const rolesToRemove = currentRoles.filter(r => !roles.includes(r));

      // Remove roles
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .in('role', rolesToRemove);

        if (deleteError) throw deleteError;
      }

      // Add roles
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
      setIsDialogOpen(false);
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
    setIsDialogOpen(true);
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

  const isLoading = usersLoading || rolesLoading;

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <UsersIcon className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage user accounts and their system roles
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-2xl">{users.length}</CardTitle>
            </CardHeader>
          </Card>
          {AVAILABLE_ROLES.map(role => (
            <Card key={role.value}>
              <CardHeader className="pb-2">
                <CardDescription>{role.label}s</CardDescription>
                <CardTitle className="text-2xl">
                  {users.filter(u => getUserRoles(u.user_id).includes(role.value)).length}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Click on a user to edit their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => {
                    const roles = getUserRoles(user.user_id);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.display_name || 'No name'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roles.length > 0 ? (
                              roles.map(role => (
                                <Badge key={role} variant={getRoleBadgeVariant(role)}>
                                  {role.replace('_', ' ')}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">No roles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.is_super_admin && (
                            <Badge variant="destructive" className="gap-1">
                              <Shield className="h-3 w-3" />
                              Super Admin
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRoles(user)}
                          >
                            Edit Roles
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Roles Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Roles</DialogTitle>
              <DialogDescription>
                {selectedUser?.display_name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {AVAILABLE_ROLES.map(role => (
                <div key={role.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={role.value}
                    checked={editedRoles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {role.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRoles}
                disabled={updateRolesMutation.isPending}
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
      </div>
    </AppLayout>
  );
};

export default Users;
