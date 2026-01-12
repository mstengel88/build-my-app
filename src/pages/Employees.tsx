import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataTable, StatusBadge, Column } from '@/components/management/DataTable';
import { CSVImport } from '@/components/management/CSVImport';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Phone, Shovel, Truck, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { EmployeeRole, EmployeeCategory, EmployeeStatus } from '@/lib/supabase-types';

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

const defaultFormData = {
  name: '',
  email: '',
  phone: '',
  role: 'driver' as EmployeeRole,
  category: 'plow' as EmployeeCategory,
  status: 'active' as EmployeeStatus,
  hire_date: '',
};

const Employees = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

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
      toast({
        title: selectedEmployee ? 'Employee updated' : 'Employee created',
        description: `${formData.name} has been ${selectedEmployee ? 'updated' : 'added'}.`,
      });
    },
    onError: (error) => {
      toast({
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
      toast({
        title: 'Employee deleted',
        description: 'The employee has been removed.',
      });
    },
    onError: (error) => {
      toast({
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
    // Apply defaults for required fields
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
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{employee.name}</span>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (employee) => (
        <div className="text-sm space-y-0.5">
          {employee.email && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Mail className="h-3 w-3" />
              {employee.email}
            </div>
          )}
          {employee.phone && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {employee.phone}
            </div>
          )}
          {!employee.email && !employee.phone && <span className="text-muted-foreground">-</span>}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (employee) => {
        const roleLabel = employeeRoles.find((r) => r.value === employee.role)?.label || employee.role;
        return (
          <Badge variant="outline" className="capitalize">
            {roleLabel}
          </Badge>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (employee) => {
        const isPlow = employee.category === 'plow';
        return (
          <div className="flex items-center gap-1">
            {isPlow ? (
              <Truck className="h-4 w-4 text-primary" />
            ) : (
              <Shovel className="h-4 w-4 text-shovel" />
            )}
            <Badge variant={isPlow ? 'default' : 'secondary'} className={isPlow ? '' : 'bg-shovel text-shovel-foreground'}>
              {isPlow ? 'Plow' : 'Shovel'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'hire_date',
      header: 'Hire Date',
      render: (employee) => (
        <span className="text-sm">
          {employee.hire_date ? format(new Date(employee.hire_date), 'MMM d, yyyy') : '-'}
        </span>
      ),
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">Manage staff and crew members</p>
          </div>
          <CSVImport
            tableName="Employees"
            columns={csvColumns}
            onImport={handleCSVImport}
            trigger={
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            }
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{employees.length}</div>
              <div className="text-xs text-muted-foreground">Total Employees</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-success">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{plowCount}</div>
              <div className="text-xs text-muted-foreground">Plow Crew</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-shovel">{shovelCount}</div>
              <div className="text-xs text-muted-foreground">Shovel Crew</div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="glass">
          <CardContent className="p-6">
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
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as EmployeeRole })}
                >
                  <SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plow">Plow</SelectItem>
                    <SelectItem value="shovel">Shovel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as EmployeeStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : selectedEmployee ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEmployee?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEmployee && deleteMutation.mutate(selectedEmployee.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Employees;
