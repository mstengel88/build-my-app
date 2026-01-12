import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { DataTable, StatusBadge, Column } from '@/components/management/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { MapPin, Building2, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AccountPriority, AccountStatus, ServiceType } from '@/lib/supabase-types';

interface Account {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  service_type: string | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
}

const defaultFormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  service_type: 'both' as ServiceType,
  priority: 'normal' as AccountPriority,
  status: 'active' as AccountStatus,
  notes: '',
};

const Accounts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  // Fetch accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Account[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (selectedAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(data)
          .eq('id', selectedAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: selectedAccount ? 'Account updated' : 'Account created',
        description: `${formData.name} has been ${selectedAccount ? 'updated' : 'added'}.`,
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
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setDeleteDialogOpen(false);
      setSelectedAccount(null);
      toast({
        title: 'Account deleted',
        description: 'The account has been removed.',
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
    setSelectedAccount(null);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setFormData({
      name: account.name,
      address: account.address,
      city: account.city || '',
      state: account.state || '',
      zip: account.zip || '',
      contact_name: account.contact_name || '',
      contact_phone: account.contact_phone || '',
      contact_email: account.contact_email || '',
      service_type: (account.service_type as ServiceType) || 'both',
      priority: (account.priority as AccountPriority) || 'normal',
      status: (account.status as AccountStatus) || 'active',
      notes: account.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (account: Account) => {
    setSelectedAccount(account);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const columns: Column<Account>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (account) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{account.name}</span>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (account) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {account.address}
          </div>
          {account.city && (
            <div className="text-muted-foreground">
              {account.city}, {account.state} {account.zip}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contact_name',
      header: 'Contact',
      render: (account) => (
        <div className="text-sm">
          {account.contact_name || '-'}
          {account.contact_phone && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3 w-3" />
              {account.contact_phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'service_type',
      header: 'Service',
      render: (account) => (
        <Badge variant="outline" className="capitalize">
          {account.service_type || 'both'}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (account) => {
        const colors: Record<string, string> = {
          urgent: 'bg-destructive text-destructive-foreground',
          high: 'bg-warning text-warning-foreground',
          normal: 'bg-secondary text-secondary-foreground',
          low: 'bg-muted text-muted-foreground',
        };
        return (
          <Badge className={colors[account.priority || 'normal']}>
            {account.priority || 'normal'}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (account) => <StatusBadge status={account.status || 'active'} />,
    },
  ];

  // Stats
  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const plowCount = accounts.filter((a) => a.service_type === 'plowing' || a.service_type === 'both').length;
  const shovelCount = accounts.filter((a) => a.service_type === 'shovel' || a.service_type === 'both').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground">Manage customer accounts and service locations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{accounts.length}</div>
              <div className="text-xs text-muted-foreground">Total Accounts</div>
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
              <div className="text-xs text-muted-foreground">Plow Service</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-shovel">{shovelCount}</div>
              <div className="text-xs text-muted-foreground">Shovel Service</div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="glass">
          <CardContent className="p-6">
            <DataTable
              title="Account"
              data={accounts}
              columns={columns}
              isLoading={isLoading}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchPlaceholder="Search accounts..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
            <DialogDescription>
              {selectedAccount ? 'Update account details' : 'Add a new customer account'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Account Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_type">Service Type</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => setFormData({ ...formData, service_type: value as ServiceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plowing">Plowing Only</SelectItem>
                    <SelectItem value="shovel">Shovel Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as AccountPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as AccountStatus })}
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : selectedAccount ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAccount?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAccount && deleteMutation.mutate(selectedAccount.id)}
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

export default Accounts;
