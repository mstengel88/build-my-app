import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCheckInState } from '@/hooks/useCheckInState';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  Play,
  Square,
  MapPin,
  Snowflake,
  ThermometerSnowflake,
  Timer,
  AlertCircle,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AccountWithDistance } from '@/lib/supabase-types';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user, employeeId } = useAuth();
  const checkInState = useCheckInState('plow');
  const { position, loading: gpsLoading, getPosition } = useGeolocation();
  const { toast } = useToast();
  
  const [elapsedTime, setElapsedTime] = useState('0:00:00');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [serviceType, setServiceType] = useState<'plow' | 'salt' | 'both'>('plow');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weatherDescription, setWeatherDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Update elapsed time every second when checked in
  useEffect(() => {
    if (checkInState.isCheckedIn) {
      const interval = setInterval(() => {
        setElapsedTime(checkInState.formatElapsedTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [checkInState.isCheckedIn, checkInState.formatElapsedTime]);

  // Fetch accounts
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, address, latitude, longitude, service_type')
        .eq('status', 'active')
        .in('service_type', ['plowing', 'both']);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's stats
  const { data: todayStats } = useQuery({
    queryKey: ['todayStats', user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('work_logs')
        .select('duration_minutes, snow_depth, salt_used')
        .gte('check_in_time', today.toISOString());
      
      if (error) throw error;
      
      return {
        services: data?.length || 0,
        snowDepth: data?.reduce((sum, log) => sum + (Number(log.snow_depth) || 0), 0) || 0,
        saltUsed: data?.reduce((sum, log) => sum + (Number(log.salt_used) || 0), 0) || 0,
        hoursWorked: (data?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0) / 60,
      };
    },
    refetchInterval: 30000,
  });

  // Fetch active time clock
  const { data: activeShift } = useQuery({
    queryKey: ['activeShift', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      const { data, error } = await supabase
        .from('time_clock')
        .select('*')
        .eq('employee_id', employeeId)
        .is('clock_out_time', null)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
    refetchInterval: 5000,
  });

  // Sort accounts by distance
  const sortedAccounts: AccountWithDistance[] = accounts.map((account) => {
    let distance: number | null = null;
    if (position && account.latitude && account.longitude) {
      distance = calculateDistance(
        position.latitude,
        position.longitude,
        account.latitude,
        account.longitude
      );
    }
    return { ...account, distance };
  }).sort((a, b) => {
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  });

  const handleCheckIn = async () => {
    if (!selectedAccount) {
      toast({
        title: 'Select an account',
        description: 'Please select an account to check in.',
        variant: 'destructive',
      });
      return;
    }

    if (!activeShift) {
      toast({
        title: 'Clock in required',
        description: 'Please clock in to your shift first.',
        variant: 'destructive',
      });
      return;
    }

    const account = accounts.find(a => a.id === selectedAccount);
    if (account) {
      checkInState.checkIn(account.id, account.name, serviceType);
      toast({
        title: 'Checked in!',
        description: `Service started at ${account.name}`,
      });
    }
  };

  const handleLogService = async () => {
    if (!checkInState.isCheckedIn || !checkInState.accountId) {
      return;
    }

    try {
      const checkOutTime = new Date();
      const checkInTime = new Date(checkInState.checkInTime!);
      const durationMinutes = Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000);

      const { data: workLog, error: workLogError } = await supabase
        .from('work_logs')
        .insert({
          account_id: checkInState.accountId,
          service_type: serviceType,
          check_in_time: checkInState.checkInTime,
          check_out_time: checkOutTime.toISOString(),
          duration_minutes: durationMinutes,
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

      // Link current employee to work log
      if (employeeId && workLog) {
        await supabase
          .from('work_log_employees')
          .insert({
            work_log_id: workLog.id,
            employee_id: employeeId,
          });
      }

      toast({
        title: 'Service logged!',
        description: `Service completed in ${durationMinutes} minutes.`,
      });

      // Reset form
      checkInState.checkOut();
      setSelectedAccount('');
      setServiceType('plow');
      setSnowDepth('');
      setSaltUsed('');
      setTemperature('');
      setWeatherDescription('');
      setNotes('');
    } catch (error) {
      console.error('Error logging service:', error);
      toast({
        title: 'Error',
        description: 'Failed to log service. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Plow & Salt Operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayStats?.services || 0}</p>
                  <p className="text-xs text-muted-foreground">Services Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Snowflake className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayStats?.snowDepth.toFixed(1) || 0}"</p>
                  <p className="text-xs text-muted-foreground">Snow Depth</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <ThermometerSnowflake className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayStats?.saltUsed.toFixed(0) || 0} lbs</p>
                  <p className="text-xs text-muted-foreground">Salt Used</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Clock className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayStats?.hoursWorked.toFixed(1) || 0}h</p>
                  <p className="text-xs text-muted-foreground">Hours Worked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Time Clock Widget */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Clock
              </CardTitle>
              <CardDescription>
                {activeShift
                  ? `Clocked in at ${format(new Date(activeShift.clock_in_time), 'h:mm a')}`
                  : 'You must clock in to start logging services'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeShift ? (
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="bg-success">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
                    Shift Active
                  </Badge>
                  <Button variant="destructive" size="sm">
                    <Square className="h-4 w-4 mr-2" />
                    Clock Out
                  </Button>
                </div>
              ) : (
                <Button className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              )}
            </CardContent>
          </Card>

          {/* GPS Status */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                GPS Location
              </CardTitle>
              <CardDescription>
                {position
                  ? `Accuracy: ±${Math.round(position.accuracy)}m`
                  : 'Waiting for location...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {position ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Nearest: <span className="text-foreground font-medium">{sortedAccounts[0]?.name || 'No accounts nearby'}</span>
                  </p>
                  {sortedAccounts[0]?.distance && (
                    <p className="text-sm text-muted-foreground">
                      Distance: <span className="text-foreground">{formatDistance(sortedAccounts[0].distance)}</span>
                    </p>
                  )}
                </div>
              ) : (
                <Button onClick={() => getPosition()} disabled={gpsLoading}>
                  <MapPin className="h-4 w-4 mr-2" />
                  {gpsLoading ? 'Getting Location...' : 'Get Location'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Log Form */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {checkInState.isCheckedIn ? (
                <>
                  <Timer className="h-5 w-5 text-success animate-pulse" />
                  Service in Progress
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Quick Log
                </>
              )}
            </CardTitle>
            {checkInState.isCheckedIn && (
              <CardDescription className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-success">{elapsedTime}</span>
                <span>at {checkInState.accountName}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!activeShift && (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-warning/10 border border-warning/20 mb-4">
                <AlertCircle className="h-5 w-5 text-warning" />
                <p className="text-sm text-warning">Clock in to your shift before logging services.</p>
              </div>
            )}

            {!checkInState.isCheckedIn ? (
              <div className="space-y-4">
                {/* Account Selection */}
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-64">
                        {sortedAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{account.name}</span>
                              {account.distance !== null && (
                                <Badge variant="outline" className="ml-2">
                                  {formatDistance(account.distance)}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Type */}
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['plow', 'salt', 'both'] as const).map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={serviceType === type ? 'default' : 'outline'}
                        onClick={() => setServiceType(type)}
                        className="h-12 capitalize"
                      >
                        {type === 'both' ? 'Plow & Salt' : type}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCheckIn}
                  className="w-full h-14 text-lg"
                  disabled={!selectedAccount || !activeShift}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Check In
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Snow Depth (inches)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="0.0"
                      value={snowDepth}
                      onChange={(e) => setSnowDepth(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salt Used (lbs)</Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={saltUsed}
                      onChange={(e) => setSaltUsed(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Temperature (°F)</Label>
                    <Input
                      type="number"
                      placeholder="32"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weather</Label>
                    <Input
                      type="text"
                      placeholder="Light snow"
                      value={weatherDescription}
                      onChange={(e) => setWeatherDescription(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Any additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleLogService}
                  className="w-full h-14 text-lg bg-success hover:bg-success/90"
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Log Service
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
