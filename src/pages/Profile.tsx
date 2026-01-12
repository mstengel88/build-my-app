import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Phone, Shield, Calendar, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ProfileData {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const Profile = () => {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setPhone(data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updates = {
        user_id: user.id,
        email: user.email || '',
        display_name: displayName || null,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });

      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getRoleBadgeVariant = (role: string) => {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                {getInitials(displayName, user?.email || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {displayName || user?.email?.split('@')[0] || 'User'}
              </CardTitle>
              <CardDescription>{user?.email}</CardDescription>
              <div className="flex gap-2 mt-2">
                {roles.map((role) => (
                  <Badge key={role} variant={getRoleBadgeVariant(role)}>
                    {role.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact an administrator if needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Separator className="my-4" />

          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Details about your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm">User ID</Label>
              <p className="font-mono text-sm truncate">{user?.id}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Member Since
              </Label>
              <p className="text-sm">
                {profile?.created_at
                  ? format(new Date(profile.created_at), 'MMMM d, yyyy')
                  : user?.created_at
                  ? format(new Date(user.created_at), 'MMMM d, yyyy')
                  : 'Unknown'}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-muted-foreground text-sm">Roles & Permissions</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <Badge key={role} variant={getRoleBadgeVariant(role)}>
                    {role.replace('_', ' ')}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No roles assigned</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
