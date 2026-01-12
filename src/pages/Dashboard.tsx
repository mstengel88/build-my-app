import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCheckInState } from '@/hooks/useCheckInState';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
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
  Snowflake,
  MapPin,
  Navigation,
  LogIn,
  Truck,
  CheckCircle,
  Camera,
  Image,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AccountWithDistance } from '@/lib/supabase-types';
import { format, startOfWeek, endOfWeek } from 'date-fns';

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
  const [windSpeed, setWindSpeed] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string>('');

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
  const { data: accounts = [] } = useQuery({
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
        .select('duration_minutes, snow_depth, salt_used, service_type')
        .gte('check_in_time', today.toISOString());
      
      if (error) throw error;
      
      const plowed = data?.filter(log => log.service_type === 'plow' || log.service_type === 'both').length || 0;
      const salted = data?.filter(log => log.service_type === 'salt' || log.service_type === 'both').length || 0;
      
      return {
        services: data?.length || 0,
        plowed,
        salted,
        properties: new Set(data?.map(log => log.snow_depth) || []).size || 0,
      };
    },
    refetchInterval: 30000,
  });

  // Fetch weekly hours
  const { data: weeklyHours } = useQuery({
    queryKey: ['weeklyHours', employeeId],
    queryFn: async () => {
      if (!employeeId) return 0;
      
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
      
      const { data, error } = await supabase
        .from('time_clock')
        .select('duration_minutes')
        .eq('employee_id', employeeId)
        .gte('clock_in_time', weekStart.toISOString())
        .lte('clock_in_time', weekEnd.toISOString());
      
      if (error) throw error;
      
      const totalMinutes = data?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0;
      return totalMinutes / 60;
    },
    enabled: !!employeeId,
    refetchInterval: 60000,
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

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          id,
          service_type,
          check_in_time,
          notes,
          accounts:account_id (name),
          work_log_employees (
            employees:employee_id (name)
          )
        `)
        .order('check_in_time', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  // Fetch equipment
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('status', 'active')
        .eq('category', 'plow');
      
      if (error) throw error;
      return data;
    },
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

  const nearestAccount = sortedAccounts[0];

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
        description: 'Please start your daily shift first via Time Clock.',
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
          wind_speed: windSpeed || null,
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
      setWindSpeed('');
      setNotes('');
      setSelectedEquipment('');
      setSelectedEmployees('');
    } catch (error) {
      console.error('Error logging service:', error);
      toast({
        title: 'Error',
        description: 'Failed to log service. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getServiceBadge = (serviceType: string) => {
    if (serviceType === 'plow' || serviceType === 'both') {
      return <Badge className="bg-primary text-primary-foreground text-xs">Plowed</Badge>;
    }
    return <Badge className="bg-success text-success-foreground text-xs">Salted</Badge>;
  };

  const getServiceIcon = (serviceType: string) => {
    if (serviceType === 'plow' || serviceType === 'both') {
      return <Truck className="h-5 w-5 text-primary" />;
    }
    return <Snowflake className="h-5 w-5 text-success" />;
  };

  const userName = user?.email?.split('@')[0] || 'User';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <Snowflake className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Snow Tracker</h1>
                <span className="text-muted-foreground">28°F</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Welcome back, {userName}! Track your plowing and salting services.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">This Week</p>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold text-foreground">{(weeklyHours || 0).toFixed(1)}h</span>
            </div>
          </div>
        </div>

        {/* Daily Shift Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Daily Shift</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeShift ? `Started at ${format(new Date(activeShift.clock_in_time), 'h:mm a')}` : 'Shift not started'}
                  </p>
                </div>
              </div>
              <Button className="bg-success hover:bg-success/90 text-success-foreground">
                <LogIn className="h-4 w-4 mr-2" />
                Start Shift
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Overview */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            TODAY'S OVERVIEW
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{todayStats?.services || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Services</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{todayStats?.plowed || 0}</p>
                    <p className="text-xs text-muted-foreground">Plowed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Snowflake className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{todayStats?.salted || 0}</p>
                    <p className="text-xs text-muted-foreground">Salted</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                    <MapPin className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{accounts.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Properties</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Log Entry */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Quick Log Entry</h2>
            
            {/* Nearest Location Banner */}
            {nearestAccount && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/20 border border-primary/30">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Nearest: {nearestAccount.name}{' '}
                      <span className="text-muted-foreground">
                        {nearestAccount.distance !== null ? formatDistance(nearestAccount.distance) : ''}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      GPS accuracy: ±{position?.accuracy ? Math.round(position.accuracy) : '--'} meters
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => getPosition()}>
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Account Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Select Account (verify or change)</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="Choose a property..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-64">
                    {sortedAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{account.name}</span>
                          {account.distance !== null && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatDistance(account.distance)}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {/* Check In Button */}
            <Button
              onClick={handleCheckIn}
              variant="outline"
              className="w-full h-12 border-border bg-card"
              disabled={!selectedAccount || !activeShift}
            >
              <Play className="h-4 w-4 mr-2" />
              Check In & Start Timer
            </Button>

            {!activeShift && (
              <p className="text-sm text-warning text-center">
                Start your daily shift first via Time Clock
              </p>
            )}

            {/* Service Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Service Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={serviceType === 'plow' ? 'default' : 'outline'}
                  onClick={() => setServiceType('plow')}
                  className={`h-16 flex-col gap-1 ${serviceType !== 'plow' ? 'bg-card border-border' : ''}`}
                >
                  <Truck className="h-5 w-5" />
                  <span className="text-xs">Plow Only</span>
                </Button>
                <Button
                  type="button"
                  variant={serviceType === 'salt' ? 'default' : 'outline'}
                  onClick={() => setServiceType('salt')}
                  className={`h-16 flex-col gap-1 ${serviceType !== 'salt' ? 'bg-card border-border' : ''}`}
                >
                  <Snowflake className="h-5 w-5" />
                  <span className="text-xs">Salt Only</span>
                </Button>
                <Button
                  type="button"
                  variant={serviceType === 'both' ? 'default' : 'outline'}
                  onClick={() => setServiceType('both')}
                  className={`h-16 flex-col gap-1 ${serviceType !== 'both' ? 'bg-card border-border' : ''}`}
                >
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-xs">Plow & Salt</span>
                </Button>
              </div>
            </div>

            {/* Equipment & Employees */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Equipment</Label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Employees</Label>
                <Select value={selectedEmployees} onValueChange={setSelectedEmployees}>
                  <SelectTrigger className="bg-card border-border">
                    <SelectValue placeholder="Select employees..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Snow Depth & Salt Used */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Snow Depth (inches)</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="e.g., 3.5"
                  value={snowDepth}
                  onChange={(e) => setSnowDepth(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Salt Used (lbs)</Label>
                <Input
                  type="number"
                  step="1"
                  placeholder="e.g., 150"
                  value={saltUsed}
                  onChange={(e) => setSaltUsed(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
            </div>

            {/* Weather Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Temp (°F)</Label>
                <Input
                  type="text"
                  placeholder="Auto"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Weather</Label>
                <Input
                  type="text"
                  placeholder="Auto"
                  value={weatherDescription}
                  onChange={(e) => setWeatherDescription(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Wind (mph)</Label>
                <Input
                  type="text"
                  placeholder="Auto"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(e.target.value)}
                  className="bg-card border-border"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-card border-border"
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Photo (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-12 bg-card border-border border-dashed">
                  <Image className="h-4 w-4 mr-2" />
                  Choose from gallery
                </Button>
                <Button variant="outline" className="h-12 bg-card border-border border-dashed">
                  <Camera className="h-4 w-4 mr-2" />
                  Take photo
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={checkInState.isCheckedIn ? handleLogService : handleCheckIn}
              className="w-full h-14 text-lg bg-success hover:bg-success/90 text-success-foreground"
              disabled={!selectedAccount}
            >
              {checkInState.isCheckedIn ? 'Log Service' : 'Check In First'}
            </Button>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y divide-border">
                    {recentActivity.map((activity: any) => {
                      const accountName = activity.accounts?.name || 'Unknown';
                      const employeeName = activity.work_log_employees?.[0]?.employees?.name || 'Unknown';
                      const date = format(new Date(activity.check_in_time), 'MMM d, h:mm a');
                      
                      return (
                        <div key={activity.id} className="p-4 flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted flex-shrink-0">
                            {getServiceIcon(activity.service_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">{accountName}</span>
                              {getServiceBadge(activity.service_type)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {date} • {employeeName}
                            </p>
                            {activity.notes && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {activity.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {recentActivity.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        No recent activity
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
