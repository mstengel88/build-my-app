import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
import { Trash2, Archive, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, subMonths } from 'date-fns';

const RETENTION_PERIODS = [
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '6 months' },
  { value: '365', label: '1 year' },
  { value: '730', label: '2 years' },
  { value: 'never', label: 'Never (keep forever)' },
];

export const DataRetentionSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch settings
  const { data: settings = [] } = useQuery({
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

  const getSetting = (key: string, defaultValue: any = null) => {
    const setting = settings.find(s => s.key === key);
    return setting?.value ?? defaultValue;
  };

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

  // Count old records
  const { data: oldRecordCounts } = useQuery({
    queryKey: ['oldRecordCounts', getSetting('data_retention_days', 'never')],
    queryFn: async () => {
      const retentionDays = getSetting('data_retention_days', 'never');
      if (retentionDays === 'never') {
        return { workLogs: 0, shovelLogs: 0, timeClockEntries: 0 };
      }

      const cutoffDate = subDays(new Date(), parseInt(retentionDays)).toISOString();

      const [workLogs, shovelLogs, timeClock] = await Promise.all([
        supabase.from('work_logs').select('id', { count: 'exact', head: true }).lt('created_at', cutoffDate),
        supabase.from('shovel_work_logs').select('id', { count: 'exact', head: true }).lt('created_at', cutoffDate),
        supabase.from('time_clock').select('id', { count: 'exact', head: true }).lt('created_at', cutoffDate),
      ]);

      return {
        workLogs: workLogs.count || 0,
        shovelLogs: shovelLogs.count || 0,
        timeClockEntries: timeClock.count || 0,
      };
    },
    enabled: !!settings.length,
  });

  // Delete old records mutation
  const deleteOldRecordsMutation = useMutation({
    mutationFn: async () => {
      const retentionDays = getSetting('data_retention_days', 'never');
      if (retentionDays === 'never') {
        throw new Error('No retention period set');
      }

      const cutoffDate = subDays(new Date(), parseInt(retentionDays)).toISOString();

      // Delete junction table entries first
      const { data: oldWorkLogs } = await supabase
        .from('work_logs')
        .select('id')
        .lt('created_at', cutoffDate);

      const { data: oldShovelLogs } = await supabase
        .from('shovel_work_logs')
        .select('id')
        .lt('created_at', cutoffDate);

      if (oldWorkLogs?.length) {
        const ids = oldWorkLogs.map(l => l.id);
        await supabase.from('work_log_employees').delete().in('work_log_id', ids);
        await supabase.from('work_log_equipment').delete().in('work_log_id', ids);
        await supabase.from('work_logs').delete().in('id', ids);
      }

      if (oldShovelLogs?.length) {
        const ids = oldShovelLogs.map(l => l.id);
        await supabase.from('shovel_work_log_employees').delete().in('shovel_work_log_id', ids);
        await supabase.from('shovel_work_logs').delete().in('id', ids);
      }

      await supabase.from('time_clock').delete().lt('created_at', cutoffDate);

      return {
        workLogs: oldWorkLogs?.length || 0,
        shovelLogs: oldShovelLogs?.length || 0,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['oldRecordCounts'] });
      queryClient.invalidateQueries({ queryKey: ['workLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['shovelLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['timeClockReport'] });
      toast({
        title: 'Old records deleted',
        description: `Deleted ${data.workLogs} work logs and ${data.shovelLogs} shovel logs`,
      });
      setDeleteConfirmOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Error deleting records', description: String(error), variant: 'destructive' });
    },
  });

  const totalOldRecords = oldRecordCounts
    ? oldRecordCounts.workLogs + oldRecordCounts.shovelLogs + oldRecordCounts.timeClockEntries
    : 0;

  const autoDeleteEnabled = getSetting('auto_delete_old_logs', false);
  const retentionDays = getSetting('data_retention_days', 'never');

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Data Retention
        </CardTitle>
        <CardDescription>
          Configure how long work logs and time clock entries are kept
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Retention Period */}
        <div className="space-y-2">
          <Label htmlFor="retention-period">Retention Period</Label>
          <Select
            value={retentionDays}
            onValueChange={(value) => updateSettingMutation.mutate({ key: 'data_retention_days', value })}
          >
            <SelectTrigger id="retention-period" className="w-full">
              <SelectValue placeholder="Select retention period" />
            </SelectTrigger>
            <SelectContent>
              {RETENTION_PERIODS.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Records older than this will be eligible for deletion
          </p>
        </div>

        {/* Auto Delete Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-delete">Auto-delete old records</Label>
            <p className="text-xs text-muted-foreground">
              Automatically delete records older than the retention period (runs daily)
            </p>
          </div>
          <Switch
            id="auto-delete"
            checked={autoDeleteEnabled}
            onCheckedChange={(checked) => 
              updateSettingMutation.mutate({ key: 'auto_delete_old_logs', value: checked })
            }
            disabled={retentionDays === 'never'}
          />
        </div>

        {/* Old Records Summary */}
        {retentionDays !== 'never' && oldRecordCounts && (
          <div className="rounded-lg border border-border p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                Records older than {RETENTION_PERIODS.find(p => p.value === retentionDays)?.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-2xl font-bold">{oldRecordCounts.workLogs}</div>
                <div className="text-muted-foreground">Work Logs</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{oldRecordCounts.shovelLogs}</div>
                <div className="text-muted-foreground">Shovel Logs</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{oldRecordCounts.timeClockEntries}</div>
                <div className="text-muted-foreground">Shifts</div>
              </div>
            </div>

            {totalOldRecords > 0 && (
              <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full mt-4 gap-2"
                    disabled={deleteOldRecordsMutation.isPending}
                  >
                    {deleteOldRecordsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete {totalOldRecords} Old Records Now
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Delete Old Records?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {totalOldRecords} records older than{' '}
                      {RETENTION_PERIODS.find(p => p.value === retentionDays)?.label}. This action
                      cannot be undone. Make sure you have a backup before proceeding.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => deleteOldRecordsMutation.mutate()}
                    >
                      Delete Records
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
