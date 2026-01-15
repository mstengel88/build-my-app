import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
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
import { format } from 'date-fns';

export type EditableWorkEntry = {
  id: string;
  type: 'plow' | 'shovel';
  account_id: string;
  service_type: string;
  check_in_time: string;
  check_out_time: string | null;
  snow_depth: number | null;
  salt_used: number | null;
  temperature: number | null;
  weather_description: string | null;
  notes: string | null;
};

interface EditWorkLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: EditableWorkEntry | null;
}

export const EditWorkLogDialog = ({ open, onOpenChange, entry }: EditWorkLogDialogProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Form state
  const [accountId, setAccountId] = useState('');
  const [serviceType, setServiceType] = useState('plow');
  const [entryDate, setEntryDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weatherDescription, setWeatherDescription] = useState('');
  const [notes, setNotes] = useState('');

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open || !entry) return;

    setAccountId(entry.account_id);
    setServiceType(entry.service_type);

    const checkIn = new Date(entry.check_in_time);
    setEntryDate(format(checkIn, 'yyyy-MM-dd'));
    setCheckInTime(format(checkIn, 'HH:mm'));

    if (entry.check_out_time) {
      const checkOut = new Date(entry.check_out_time);
      setCheckOutTime(format(checkOut, 'HH:mm'));
    } else {
      setCheckOutTime('');
    }

    setSnowDepth(entry.snow_depth != null ? String(entry.snow_depth) : '');
    setSaltUsed(entry.salt_used != null ? String(entry.salt_used) : '');
    setTemperature(entry.temperature != null ? String(entry.temperature) : '');
    setWeatherDescription(entry.weather_description || '');
    setNotes(entry.notes || '');
  }, [open, entry]);

  const handleSubmit = async () => {
    if (!entry) return;
    if (!accountId) {
      toast.error('Please select an account/location');
      return;
    }
    if (!entryDate || !checkInTime) {
      toast.error('Please set a date and check-in time');
      return;
    }

    const checkIn = new Date(`${entryDate}T${checkInTime}`);
    const checkOut = checkOutTime ? new Date(`${entryDate}T${checkOutTime}`) : null;
    const durationMinutes = checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000) : null;

    if (checkOut && durationMinutes != null && durationMinutes <= 0) {
      toast.error('Check out time must be after check in time');
      return;
    }

    setSaving(true);
    try {
      const table = entry.type === 'shovel' ? 'shovel_work_logs' : 'work_logs';
      const { error } = await supabase
        .from(table)
        .update({
          account_id: accountId,
          service_type: serviceType,
          check_in_time: checkIn.toISOString(),
          check_out_time: checkOut?.toISOString() || null,
          duration_minutes: durationMinutes,
          snow_depth: snowDepth ? parseFloat(snowDepth) : null,
          salt_used: saltUsed ? parseFloat(saltUsed) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          weather_description: weatherDescription || null,
          notes: notes || null,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast.success('Work entry updated successfully');
      queryClient.invalidateQueries({ queryKey: ['workLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['shovelLogsReport'] });
      onOpenChange(false);
    } catch (e: any) {
      console.error('Error updating work entry:', e);
      toast.error(e?.message || 'Failed to update work entry');
    } finally {
      setSaving(false);
    }
  };

  const serviceTypeOptions = entry?.type === 'shovel'
    ? [
        { value: 'shovel', label: 'Shovel Only' },
        { value: 'salt', label: 'Salt Only' },
        { value: 'both', label: 'Shovel & Salt' },
      ]
    : [
        { value: 'plow', label: 'Plow Only' },
        { value: 'salt', label: 'Salt Only' },
        { value: 'both', label: 'Plow & Salt' },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Work Entry</DialogTitle>
          <DialogDescription>
            Update the work entry details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Account/Location *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {serviceTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check In</Label>
              <Input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Check Out</Label>
              <Input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Snow Depth (in)</Label>
              <Input type="number" step="0.5" placeholder="0" value={snowDepth} onChange={(e) => setSnowDepth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Salt Used (lbs)</Label>
              <Input type="number" placeholder="0" value={saltUsed} onChange={(e) => setSaltUsed(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Temperature (°F)</Label>
              <Input type="number" placeholder="32" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Weather</Label>
              <Input placeholder="Snowing" value={weatherDescription} onChange={(e) => setWeatherDescription(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
