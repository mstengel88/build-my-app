import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import type { AppRole } from '@/lib/supabase-types';

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'manager', label: 'Manager', description: 'Manage operations and staff' },
  { value: 'driver', label: 'Driver', description: 'Plow truck operations' },
  { value: 'shovel_crew', label: 'Shovel Crew', description: 'Sidewalk services' },
  { value: 'client', label: 'Client', description: 'Customer access only' },
];

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<AppRole>('driver');
  const [createEmployee, setCreateEmployee] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({ title: 'Email is required', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get the current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to invite users');
      }

      // Call the edge function to send the invite email
      const response = await supabase.functions.invoke('send-invite-email', {
        body: {
          email,
          displayName: displayName || undefined,
          role,
          createEmployee: createEmployee && role !== 'client',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send invitation');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Invitation sent!',
        description: `An invite email has been sent to ${email}. They can click the link to set up their account.`,
      });

      // Reset form
      setEmail('');
      setDisplayName('');
      setRole('driver');
      setCreateEmployee(true);
      onOpenChange(false);
      
      // Refresh the users list
      queryClient.invalidateQueries({ queryKey: ['usersWithRoles'] });
      
    } catch (error: any) {
      console.error('Invite user error:', error);
      toast({
        title: 'Failed to invite user',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Create a new user account and assign them a role.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <span className="font-medium">{option.label}</span>
                        <span className="text-muted-foreground ml-2 text-sm">
                          - {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role !== 'client' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createEmployee"
                  checked={createEmployee}
                  onCheckedChange={(checked) => setCreateEmployee(checked as boolean)}
                />
                <Label htmlFor="createEmployee" className="text-sm font-normal">
                  Also create an employee record
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-success hover:bg-success/90 text-success-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
