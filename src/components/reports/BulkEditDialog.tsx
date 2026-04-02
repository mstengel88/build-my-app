import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  type: 'work_logs' | 'time_clock' | 'shovel_work_logs';
  onSuccess: () => void;
}

export function BulkEditDialog({ 
  open, 
  onOpenChange, 
  selectedIds, 
  type,
  onSuccess 
}: BulkEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Field toggles
  const [updateServiceType, setUpdateServiceType] = useState(false);
  const [updateNotes, setUpdateNotes] = useState(false);
  const [updateSnowDepth, setUpdateSnowDepth] = useState(false);
  const [updateSaltUsed, setUpdateSaltUsed] = useState(false);
  
  // Field values
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');

  const resetForm = () => {
    setUpdateServiceType(false);
    setUpdateNotes(false);
    setUpdateSnowDepth(false);
    setUpdateSaltUsed(false);
    setServiceType('');
    setNotes('');
    setSnowDepth('');
    setSaltUsed('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;

    const updates: Record<string, any> = {};
    
    if (type === 'work_logs' || type === 'shovel_work_logs') {
      if (updateServiceType && serviceType) updates.service_type = serviceType;
      if (updateNotes) updates.notes = notes || null;
      if (updateSnowDepth) updates.snow_depth = snowDepth ? parseFloat(snowDepth) : null;
      if (updateSaltUsed) updates.salt_used = saltUsed ? parseFloat(saltUsed) : null;
    } else if (type === 'time_clock') {
      if (updateNotes) updates.notes = notes || null;
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: 'No fields selected',
        description: 'Please select at least one field to update.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from(type)
        .update(updates)
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated ${selectedIds.length} ${type === 'time_clock' ? 'shifts' : 'entries'}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['workLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['shovelLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['timeClockReport'] });
      
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update entries.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from(type)
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: `Deleted ${selectedIds.length} ${type === 'time_clock' ? 'shifts' : 'entries'}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['workLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['shovelLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['timeClockReport'] });
      
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete entries. You may not have permission.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isWorkLog = type === 'work_logs' || type === 'shovel_work_logs';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit ({selectedIds.length} selected)</DialogTitle>
          <DialogDescription>
            Select fields to update across all selected {type === 'time_clock' ? 'shifts' : 'entries'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isWorkLog && (
            <>
              {/* Service Type */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="updateServiceType"
                  checked={updateServiceType}
                  onCheckedChange={(checked) => setUpdateServiceType(!!checked)}
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="updateServiceType" className="text-sm font-medium">
                    Service Type
                  </Label>
                  {updateServiceType && (
                    <Select value={serviceType} onValueChange={setServiceType}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plow">Plow</SelectItem>
                        <SelectItem value="salt">Salt</SelectItem>
                        <SelectItem value="both">Plow & Salt</SelectItem>
                        <SelectItem value="shovel">Shovel</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Snow Depth */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="updateSnowDepth"
                  checked={updateSnowDepth}
                  onCheckedChange={(checked) => setUpdateSnowDepth(!!checked)}
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="updateSnowDepth" className="text-sm font-medium">
                    Snow Depth (inches)
                  </Label>
                  {updateSnowDepth && (
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="Enter snow depth..."
                      value={snowDepth}
                      onChange={(e) => setSnowDepth(e.target.value)}
                      className="h-9"
                    />
                  )}
                </div>
              </div>

              {/* Salt Used */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="updateSaltUsed"
                  checked={updateSaltUsed}
                  onCheckedChange={(checked) => setUpdateSaltUsed(!!checked)}
                />
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="updateSaltUsed" className="text-sm font-medium">
                    Salt Used (lbs)
                  </Label>
                  {updateSaltUsed && (
                    <Input
                      type="number"
                      placeholder="Enter salt amount..."
                      value={saltUsed}
                      onChange={(e) => setSaltUsed(e.target.value)}
                      className="h-9"
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes - available for all types */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="updateNotes"
              checked={updateNotes}
              onCheckedChange={(checked) => setUpdateNotes(!!checked)}
            />
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="updateNotes" className="text-sm font-medium">
                Notes
              </Label>
              {updateNotes && (
                <Textarea
                  placeholder="Enter notes (leave blank to clear)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isDeleting || isLoading}
            className="w-full sm:w-auto"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete All
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={isLoading || isDeleting} className="flex-1 sm:flex-none">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
