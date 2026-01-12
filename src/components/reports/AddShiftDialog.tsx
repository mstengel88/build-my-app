import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddShiftDialog = ({ open, onOpenChange }: AddShiftDialogProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [employeeId, setEmployeeId] = useState('');
  const [shiftDate, setShiftDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [clockInTime, setClockInTime] = useState('08:00');
  const [clockOutTime, setClockOutTime] = useState('17:00');
  const [notes, setNotes] = useState('');

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setEmployeeId('');
    setShiftDate(format(new Date(), 'yyyy-MM-dd'));
    setClockInTime('08:00');
    setClockOutTime('17:00');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!employeeId) {
      toast.error('Please select an employee');
      return;
    }

    setSaving(true);
    try {
      const clockIn = new Date(`${shiftDate}T${clockInTime}`);
      const clockOut = new Date(`${shiftDate}T${clockOutTime}`);
      const durationMinutes = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);

      if (durationMinutes <= 0) {
        toast.error('Clock out time must be after clock in time');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('time_clock')
        .insert({
          employee_id: employeeId,
          clock_in_time: clockIn.toISOString(),
          clock_out_time: clockOut.toISOString(),
          duration_minutes: durationMinutes,
          notes: notes || null,
        });

      if (error) throw error;

      toast.success('Shift added successfully');
      queryClient.invalidateQueries({ queryKey: ['timeClockReport'] });
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding shift:', error);
      toast.error(error.message || 'Failed to add shift');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Shift</DialogTitle>
          <DialogDescription>
            Manually add a time clock entry for an employee.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee */}
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clock In</Label>
              <Input type="time" value={clockInTime} onChange={e => setClockInTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Clock Out</Label>
              <Input type="time" value={clockOutTime} onChange={e => setClockOutTime(e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              placeholder="Optional notes..." 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Add Shift'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
