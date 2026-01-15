import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface AddWorkEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddWorkEntryDialog = ({ open, onOpenChange }: AddWorkEntryDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [entryType, setEntryType] = useState<'plow' | 'shovel'>('plow');
  const [accountId, setAccountId] = useState('');
  const [serviceType, setServiceType] = useState('plow');
  const [checkInDate, setCheckInDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkInTime, setCheckInTime] = useState('08:00');
  const [checkOutTime, setCheckOutTime] = useState('09:00');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weatherDescription, setWeatherDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // Fetch accounts
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, name, category').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch equipment
  const { data: equipment } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipment').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setEntryType('plow');
    setAccountId('');
    setServiceType('plow');
    setCheckInDate(format(new Date(), 'yyyy-MM-dd'));
    setCheckInTime('08:00');
    setCheckOutTime('09:00');
    setSnowDepth('');
    setSaltUsed('');
    setTemperature('');
    setWeatherDescription('');
    setNotes('');
    setSelectedEmployees([]);
    setSelectedEquipment([]);
  };

  const handleSubmit = async () => {
    if (!accountId) {
      toast.error('Please select an account/location');
      return;
    }

    setSaving(true);
    try {
      const checkIn = new Date(`${checkInDate}T${checkInTime}`);
      const checkOut = new Date(`${checkInDate}T${checkOutTime}`);
      const durationMinutes = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);

      if (entryType === 'plow') {
        // Insert work log
        const { data: workLog, error: workLogError } = await supabase
          .from('work_logs')
          .insert({
            account_id: accountId,
            service_type: serviceType,
            check_in_time: checkIn.toISOString(),
            check_out_time: checkOut.toISOString(),
            duration_minutes: durationMinutes > 0 ? durationMinutes : null,
            snow_depth: snowDepth ? parseFloat(snowDepth) : null,
            salt_used: saltUsed ? parseFloat(saltUsed) : null,
            temperature: temperature ? parseFloat(temperature) : null,
            weather_description: weatherDescription || null,
            notes: notes || null,
            created_by: user?.id,
          })
          .select()
          .single();

        if (workLogError) throw workLogError;

        // Insert employee assignments
        if (selectedEmployees.length > 0 && workLog) {
          const employeeAssignments = selectedEmployees.map(empId => ({
            work_log_id: workLog.id,
            employee_id: empId,
          }));
          await supabase.from('work_log_employees').insert(employeeAssignments);
        }

        // Insert equipment assignments
        if (selectedEquipment.length > 0 && workLog) {
          const equipmentAssignments = selectedEquipment.map(eqId => ({
            work_log_id: workLog.id,
            equipment_id: eqId,
          }));
          await supabase.from('work_log_equipment').insert(equipmentAssignments);
        }
      } else {
        // Insert shovel work log
        const { data: shovelLog, error: shovelLogError } = await supabase
          .from('shovel_work_logs')
          .insert({
            account_id: accountId,
            service_type: serviceType,
            check_in_time: checkIn.toISOString(),
            check_out_time: checkOut.toISOString(),
            duration_minutes: durationMinutes > 0 ? durationMinutes : null,
            snow_depth: snowDepth ? parseFloat(snowDepth) : null,
            salt_used: saltUsed ? parseFloat(saltUsed) : null,
            temperature: temperature ? parseFloat(temperature) : null,
            weather_description: weatherDescription || null,
            notes: notes || null,
            created_by: user?.id,
          })
          .select()
          .single();

        if (shovelLogError) throw shovelLogError;

        // Insert employee assignments
        if (selectedEmployees.length > 0 && shovelLog) {
          const employeeAssignments = selectedEmployees.map(empId => ({
            shovel_work_log_id: shovelLog.id,
            employee_id: empId,
          }));
          await supabase.from('shovel_work_log_employees').insert(employeeAssignments);
        }
      }

      toast.success('Work entry added successfully');
      queryClient.invalidateQueries({ queryKey: ['workLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['shovelLogsReport'] });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding work entry:', error);
      toast.error(error.message || 'Failed to add work entry');
    } finally {
      setSaving(false);
    }
  };

  // Show all employees - don't filter by category as many employees may not have it set
  const filteredEmployees = employees || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Work Entry</DialogTitle>
          <DialogDescription>
            Manually add a plow or shovel work log entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entry Type */}
          <div className="space-y-2">
            <Label>Entry Type</Label>
            <Select value={entryType} onValueChange={(v: 'plow' | 'shovel') => setEntryType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plow">Plow/Salt</SelectItem>
                <SelectItem value="shovel">Shovel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <Label>Account/Location *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entryType === 'plow' ? (
                  <>
                    <SelectItem value="plow">Plow Only</SelectItem>
                    <SelectItem value="salt">Salt Only</SelectItem>
                    <SelectItem value="both">Plow & Salt</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="shovel">Shovel Only</SelectItem>
                    <SelectItem value="salt">Salt Only</SelectItem>
                    <SelectItem value="both">Shovel & Salt</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Times */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={checkInDate} onChange={e => setCheckInDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check In</Label>
              <Input type="time" value={checkInTime} onChange={e => setCheckInTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check Out</Label>
              <Input type="time" value={checkOutTime} onChange={e => setCheckOutTime(e.target.value)} />
            </div>
          </div>

          {/* Snow and Salt */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Snow Depth (in)</Label>
              <Input type="number" placeholder="0" value={snowDepth} onChange={e => setSnowDepth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Salt Used (lbs)</Label>
              <Input type="number" placeholder="0" value={saltUsed} onChange={e => setSaltUsed(e.target.value)} />
            </div>
          </div>

          {/* Weather */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Temperature (°F)</Label>
              <Input type="number" placeholder="32" value={temperature} onChange={e => setTemperature(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Weather</Label>
              <Input placeholder="Snowing" value={weatherDescription} onChange={e => setWeatherDescription(e.target.value)} />
            </div>
          </div>

          {/* Employees - Multi-select with checkboxes */}
          <div className="space-y-2">
            <Label>Crew Members</Label>
            <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
              {filteredEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees found</p>
              ) : (
                filteredEmployees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployees([...selectedEmployees, emp.id]);
                        } else {
                          setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                        }
                      }}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{emp.name}</span>
                  </label>
                ))
              )}
            </div>
            {selectedEmployees.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedEmployees.length} selected</p>
            )}
          </div>

          {/* Equipment (only for plow) */}
          {entryType === 'plow' && (
            <div className="space-y-2">
              <Label>Equipment</Label>
              <Select 
                value={selectedEquipment[0] || ''} 
                onValueChange={(v) => setSelectedEquipment(v ? [v] : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipment?.map(eq => (
                    <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              placeholder="Additional notes..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Add Entry'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
