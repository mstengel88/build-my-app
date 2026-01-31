import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import winterwatchLogo from '@/assets/winterwatch-pro-logo.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Check for recovery event or existing session with recovery type
      if (session) {
        setIsValidSession(true);
      } else {
        // Listen for the PASSWORD_RECOVERY event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsValidSession(true);
          }
        });

        // Give it a moment to process the URL hash
        setTimeout(() => {
          if (isValidSession === null) {
            setIsValidSession(false);
          }
        }, 2000);

        return () => subscription.unsubscribe();
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        toast({
          title: 'Password reset failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setIsSuccess(true);
        toast({
          title: 'Password updated!',
          description: 'Your password has been successfully reset.',
        });
        
        // Sign out and redirect to login after a delay
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Invalid or Expired Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate('/')}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass border-border">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Password Reset Successful!</CardTitle>
            <CardDescription>
              Your password has been updated. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={winterwatchLogo} 
              alt="WinterWatch-Pro Logo" 
              className="h-24 w-24 rounded-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">WinterWatch-Pro</h1>
        </div>

        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-12"
                />
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          &copy; {new Date().getFullYear()} WinterWatch-Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
