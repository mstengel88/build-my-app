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
import { Truck, Wrench, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { EquipmentType, EquipmentCategory, EquipmentStatus, EquipmentServiceCapability } from '@/lib/supabase-types';

interface Equipment {
  id: string;
  name: string;
  type: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  license_plate: string | null;
  category: string;
  service_capability: string;
  status: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_interval_days: number | null;
  notes: string | null;
}

const equipmentTypes: { value: EquipmentType; label: string }[] = [
  { value: 'plow_truck', label: 'Plow Truck' },
  { value: 'salt_truck', label: 'Salt Truck' },
  { value: 'skid_steer', label: 'Skid Steer' },
  { value: 'atv', label: 'ATV' },
  { value: 'semi', label: 'Semi' },
  { value: 'box_truck', label: 'Box Truck' },
  { value: 'loader', label: 'Loader' },
  { value: 'trailer', label: 'Trailer' },
];

const defaultFormData = {
  name: '',
  type: 'plow_truck' as EquipmentType,
  make: '',
  model: '',
  year: '',
  vin: '',
  license_plate: '',
  category: 'operational' as EquipmentCategory,
  service_capability: 'both' as EquipmentServiceCapability,
  status: 'active' as EquipmentStatus,
  notes: '',
};

const Equipment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState(defaultFormData);

  // Fetch equipment
  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Equipment[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        year: data.year ? parseInt(data.year) : null,
      };

      if (selectedEquipment) {
        const { error } = await supabase
          .from('equipment')
          .update(payload)
          .eq('id', selectedEquipment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('equipment').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: selectedEquipment ? 'Equipment updated' : 'Equipment created',
        description: `${formData.name} has been ${selectedEquipment ? 'updated' : 'added'}.`,
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
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setDeleteDialogOpen(false);
      setSelectedEquipment(null);
      toast({
        title: 'Equipment deleted',
        description: 'The equipment has been removed.',
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
    setSelectedEquipment(null);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: Equipment) => {
    setSelectedEquipment(item);
    setFormData({
      name: item.name,
      type: item.type as EquipmentType,
      make: item.make || '',
      model: item.model || '',
      year: item.year?.toString() || '',
      vin: item.vin || '',
      license_plate: item.license_plate || '',
      category: item.category as EquipmentCategory,
      service_capability: item.service_capability as EquipmentServiceCapability,
      status: item.status as EquipmentStatus,
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (item: Equipment) => {
    setSelectedEquipment(item);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleCSVImport = async (data: Record<string, any>[]) => {
    const { error } = await supabase.from('equipment').insert(data as any);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['equipment'] });
  };

  const csvColumns = [
    { key: 'name', label: 'Name', required: true },
    { key: 'type', label: 'Type', required: true },
    { key: 'make', label: 'Make' },
    { key: 'model', label: 'Model' },
    { key: 'year', label: 'Year' },
    { key: 'vin', label: 'VIN' },
    { key: 'license_plate', label: 'License Plate' },
    { key: 'category', label: 'Category' },
    { key: 'service_capability', label: 'Service Capability' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
  ];

  const columns: Column<Equipment>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item) => {
        const typeLabel = equipmentTypes.find((t) => t.value === item.type)?.label || item.type;
        return (
          <Badge variant="outline" className="capitalize">
            {typeLabel}
          </Badge>
        );
      },
    },
    {
      key: 'details',
      header: 'Details',
      render: (item) => (
        <div className="text-sm">
          {item.make && item.model && (
            <div>
              {item.year} {item.make} {item.model}
            </div>
          )}
          {item.license_plate && (
            <div className="text-muted-foreground">{item.license_plate}</div>
          )}
        </div>
      ),
    },
    {
      key: 'service_capability',
      header: 'Service',
      render: (item) => (
        <Badge variant="secondary" className="capitalize">
          {item.service_capability}
        </Badge>
      ),
    },
    {
      key: 'next_maintenance_date',
      header: 'Maintenance',
      render: (item) => {
        if (!item.next_maintenance_date) return <span className="text-muted-foreground">-</span>;
        const dueDate = new Date(item.next_maintenance_date);
        const isOverdue = dueDate < new Date();
        return (
          <div className="flex items-center gap-1">
            <Wrench className={`h-3 w-3 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className={isOverdue ? 'text-destructive' : ''}>
              {format(dueDate, 'MMM d, yyyy')}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  // Stats
  const activeCount = equipment.filter((e) => e.status === 'active').length;
  const maintenanceCount = equipment.filter((e) => e.status === 'maintenance').length;
  const overdueCount = equipment.filter((e) => {
    if (!e.next_maintenance_date) return false;
    return new Date(e.next_maintenance_date) < new Date();
  }).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipment</h1>
            <p className="text-muted-foreground">Manage vehicles and equipment inventory</p>
          </div>
          <CSVImport
            tableName="Equipment"
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
              <div className="text-2xl font-bold">{equipment.length}</div>
              <div className="text-xs text-muted-foreground">Total Equipment</div>
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
              <div className="text-2xl font-bold text-warning">{maintenanceCount}</div>
              <div className="text-xs text-muted-foreground">In Maintenance</div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
              <div className="text-xs text-muted-foreground">Overdue Service</div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card className="glass">
          <CardContent className="p-6">
            <DataTable
              title="Equipment"
              data={equipment}
              columns={columns}
              isLoading={isLoading}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              searchPlaceholder="Search equipment..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEquipment ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
            <DialogDescription>
              {selectedEquipment ? 'Update equipment details' : 'Add new equipment to inventory'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Equipment Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Truck 1, Bobcat A"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as EquipmentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as EquipmentCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance_only">Maintenance Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  placeholder="e.g., Ford, Caterpillar"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., F-350, 262D"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="e.g., 2023"
                  min="1990"
                  max="2030"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_plate">License Plate</Label>
                <Input
                  id="license_plate"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={formData.vin}
                  onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_capability">Service Capability</Label>
                <Select
                  value={formData.service_capability}
                  onValueChange={(value) => setFormData({ ...formData, service_capability: value as EquipmentServiceCapability })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plow">Plow Only</SelectItem>
                    <SelectItem value="salter">Salter Only</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as EquipmentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
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
                {saveMutation.isPending ? 'Saving...' : selectedEquipment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Equipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEquipment?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEquipment && deleteMutation.mutate(selectedEquipment.id)}
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

export default Equipment;
