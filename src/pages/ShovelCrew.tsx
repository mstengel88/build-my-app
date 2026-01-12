import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCheckInState } from '@/hooks/useCheckInState';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  Play,
  LogIn,
  MapPin,
  Snowflake,
  Users,
  Image as ImageIcon,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AccountWithDistance } from '@/lib/supabase-types';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const ShovelCrewDashboard = () => {
  const { user, employeeId } = useAuth();
  const queryClient = useQueryClient();
  const checkInState = useCheckInState('shovel');
  const { position } = useGeolocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [elapsedTime, setElapsedTime] = useState('0:00:00');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<'shovel' | 'salt' | 'both'>('shovel');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weatherDescription, setWeatherDescription] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch current weather
  useEffect(() => {
    if (position) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${position.latitude}&longitude=${position.longitude}&current=temperature_2m,weather_code,wind_speed_10m`)
        .then(res => res.json())
        .then(data => {
          if (data.current) {
            const tempF = Math.round(data.current.temperature_2m * 9/5 + 32);
            setTemperature(tempF.toString());
            setWindSpeed(Math.round(data.current.wind_speed_10m).toString());
            // Map weather code to description
            const code = data.current.weather_code;
            let desc = 'Clear';
            if (code >= 1 && code <= 3) desc = 'Cloudy';
            else if (code >= 51 && code <= 67) desc = 'Rain';
            else if (code >= 71 && code <= 77) desc = 'Snow';
            else if (code >= 80 && code <= 82) desc = 'Showers';
            else if (code >= 85 && code <= 86) desc = 'Snow Showers';
            setWeatherDescription(desc);
          }
        })
        .catch(console.error);
    }
  }, [position]);

  // Update elapsed time every second when checked in
  useEffect(() => {
    if (checkInState.isCheckedIn) {
      const interval = setInterval(() => {
        setElapsedTime(checkInState.formatElapsedTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [checkInState.isCheckedIn, checkInState.formatElapsedTime]);

  // Fetch user profile for display name
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch shovel accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['shovelAccounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, address, latitude, longitude, service_type')
        .eq('status', 'active')
        .in('service_type', ['shovel', 'both']);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees for selection
  const { data: employees = [] } = useQuery({
    queryKey: ['shovelEmployees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('status', 'active')
        .in('category', ['shovel', 'both']);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's shovel stats
  const { data: todayStats } = useQuery({
    queryKey: ['todayShovelStats', user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('shovel_work_logs')
        .select('id, service_type, account_id')
        .gte('check_in_time', today.toISOString());
      
      if (error) throw error;
      
      const uniqueLocations = new Set(data?.map(log => log.account_id));
      const shoveled = data?.filter(log => log.service_type === 'shovel' || log.service_type === 'both').length || 0;
      const salted = data?.filter(log => log.service_type === 'salt' || log.service_type === 'both').length || 0;
      
      return {
        total: data?.length || 0,
        shoveled,
        salted,
        locations: uniqueLocations.size,
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

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['recentShovelActivity'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('shovel_work_logs')
        .select('*, accounts(name)')
        .gte('check_in_time', today.toISOString())
        .order('check_in_time', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
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

  const handleStartShift = async () => {
    if (!employeeId) {
      toast({
        title: 'Error',
        description: 'Employee profile not found.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('time_clock')
        .insert({
          employee_id: employeeId,
          clock_in_time: new Date().toISOString(),
          clock_in_latitude: position?.latitude || null,
          clock_in_longitude: position?.longitude || null,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      toast({
        title: 'Shift started!',
        description: 'Your daily shift has begun.',
      });
    } catch (error) {
      console.error('Error starting shift:', error);
      toast({
        title: 'Error',
        description: 'Failed to start shift.',
        variant: 'destructive',
      });
    }
  };

  const handleCheckIn = async () => {
    if (!selectedAccount) {
      toast({
        title: 'Select a location',
        description: 'Please select a location to check in.',
        variant: 'destructive',
      });
      return;
    }

    if (!activeShift) {
      toast({
        title: 'Start shift first',
        description: 'Please start your daily shift before checking in.',
        variant: 'destructive',
      });
      return;
    }

    const account = accounts.find(a => a.id === selectedAccount);
    if (account) {
      checkInState.checkIn(account.id, account.name, serviceType);
      toast({
        title: 'Checked in!',
        description: `Timer started at ${account.name}`,
      });
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
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

      let photoUrl: string | null = null;
      if (photoFile) {
        const fileName = `shovel/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('work-photos')
          .upload(fileName, photoFile);
        
        if (!uploadError) {
          // Store the file path, not a URL - signed URLs are generated when viewing
          photoUrl = fileName;
        }
      }

      const { data: workLog, error: workLogError } = await supabase
        .from('shovel_work_logs')
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
          photo_url: photoUrl,
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (workLogError) throw workLogError;

      // Link employees to work log
      if (workLog) {
        const employeesToLink = selectedEmployees.length > 0 ? selectedEmployees : (employeeId ? [employeeId] : []);
        for (const empId of employeesToLink) {
          await supabase
            .from('shovel_work_log_employees')
            .insert({
              shovel_work_log_id: workLog.id,
              employee_id: empId,
            });
        }
      }

      toast({
        title: 'Service logged!',
        description: `Completed in ${durationMinutes} minutes.`,
      });

      // Reset form
      queryClient.invalidateQueries({ queryKey: ['todayShovelStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentShovelActivity'] });
      checkInState.checkOut();
      setSelectedAccount('');
      setSelectedEmployees([]);
      setServiceType('shovel');
      setSnowDepth('');
      setSaltUsed('');
      setNotes('');
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error('Error logging service:', error);
      toast({
        title: 'Error',
        description: 'Failed to log service.',
        variant: 'destructive',
      });
    }
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-shovel/10">
                <Users className="h-6 w-6 text-shovel" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Shovel Crew</h1>
              {temperature && (
                <span className="text-lg text-muted-foreground">{temperature}°F</span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Welcome back, {displayName}! Track your shovel crew services.
            </p>
          </div>
        </div>

        {/* Daily Shift Card */}
        <Card className="glass">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Daily Shift</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeShift 
                      ? `Started at ${format(new Date(activeShift.clock_in_time), 'h:mm a')}`
                      : 'Shift not started'
                    }
                  </p>
                </div>
              </div>
              {!activeShift && (
                <Button onClick={handleStartShift} className="bg-success hover:bg-success/90 gap-2">
                  <LogIn className="h-4 w-4" />
                  Start Shift
                </Button>
              )}
              {activeShift && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-sm text-success font-medium">Active</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Overview */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Today's Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="glass">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{todayStats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Services</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-shovel/10">
                  <Users className="h-4 w-4 text-shovel" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{todayStats?.shoveled || 0}</p>
                  <p className="text-xs text-muted-foreground">Shoveled</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Snowflake className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{todayStats?.salted || 0}</p>
                  <p className="text-xs text-muted-foreground">Salted</p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <MapPin className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{todayStats?.locations || 0}</p>
                  <p className="text-xs text-muted-foreground">Locations</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Log Entry */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Log Entry</h2>
            <div className="space-y-4">
              {/* Location Selection */}
              <div className="space-y-2">
                <Label className="text-sm">Select Location</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choose a location..." />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-64">
                      {sortedAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                          {account.distance !== null && ` (${formatDistance(account.distance)})`}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              {/* Check In Button */}
              {!checkInState.isCheckedIn ? (
                <>
                  <Button
                    onClick={handleCheckIn}
                    className="w-full h-12 bg-muted/50 hover:bg-muted text-muted-foreground"
                    disabled={!selectedAccount || !activeShift}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Check In & Start Timer
                  </Button>
                  {!activeShift && (
                    <p className="text-center text-sm">
                      <span className="text-warning">Start your </span>
                      <Link to="/time-clock" className="text-primary hover:underline">daily shift</Link>
                      <span className="text-warning"> first via Time Clock</span>
                    </p>
                  )}
                </>
              ) : (
                <div className="p-4 rounded-lg bg-shovel/10 border border-shovel/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Timer running at</p>
                      <p className="font-medium">{checkInState.accountName}</p>
                    </div>
                    <p className="text-2xl font-mono font-bold text-shovel">{elapsedTime}</p>
                  </div>
                </div>
              )}

              {/* Service Type */}
              <div className="space-y-2">
                <Label className="text-sm">Service Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={serviceType === 'shovel' ? 'default' : 'outline'}
                    onClick={() => setServiceType('shovel')}
                    className={`h-16 flex-col gap-1 ${serviceType === 'shovel' ? 'bg-shovel hover:bg-shovel/90' : 'bg-muted/30'}`}
                  >
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Shovel Walks</span>
                  </Button>
                  <Button
                    type="button"
                    variant={serviceType === 'salt' ? 'default' : 'outline'}
                    onClick={() => setServiceType('salt')}
                    className={`h-16 flex-col gap-1 ${serviceType === 'salt' ? 'bg-shovel hover:bg-shovel/90' : 'bg-muted/30'}`}
                  >
                    <Snowflake className="h-4 w-4" />
                    <span className="text-xs">Salt Walks</span>
                  </Button>
                  <Button
                    type="button"
                    variant={serviceType === 'both' ? 'default' : 'outline'}
                    onClick={() => setServiceType('both')}
                    className={`h-16 flex-col gap-1 ${serviceType === 'both' ? 'bg-shovel hover:bg-shovel/90' : 'bg-muted/30'}`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs">Shovel/Salt Walks</span>
                  </Button>
                </div>
              </div>

              {/* Team Members */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                </Label>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <ScrollArea className="max-h-32">
                    <div className="space-y-2">
                      {employees.map((emp) => {
                        const isSelected = selectedEmployees.includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                              isSelected ? 'bg-shovel/20 border border-shovel/30' : 'hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEmployees([...selectedEmployees, emp.id]);
                                } else {
                                  setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                }
                              }}
                              className="data-[state=checked]:bg-shovel data-[state=checked]:border-shovel"
                            />
                            <span className="text-sm">{emp.name}</span>
                          </label>
                        );
                      })}
                      {employees.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No shovel crew employees found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                {selectedEmployees.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedEmployees.length} team member{selectedEmployees.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Snow Depth & Salt */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Snow Depth (inches)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="e.g., 3.5"
                    value={snowDepth}
                    onChange={(e) => setSnowDepth(e.target.value)}
                    className="h-11 bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Salt Used (lbs)</Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="e.g., 50"
                    value={saltUsed}
                    onChange={(e) => setSaltUsed(e.target.value)}
                    className="h-11 bg-muted/30"
                  />
                </div>
              </div>

              {/* Weather Info */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Temp (°F)</Label>
                  <Input
                    type="number"
                    placeholder="Auto"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="h-11 bg-muted/30"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Weather</Label>
                  <Input
                    type="text"
                    placeholder="Auto"
                    value={weatherDescription}
                    onChange={(e) => setWeatherDescription(e.target.value)}
                    className="h-11 bg-muted/30"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Wind (mph)</Label>
                  <Input
                    type="text"
                    placeholder="Auto"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(e.target.value)}
                    className="h-11 bg-muted/30"
                    readOnly
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm">Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="bg-muted/30 resize-none"
                />
              </div>

              {/* Photo */}
              <div className="space-y-2">
                <Label className="text-sm">Photo (Optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-11 bg-muted/30"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Choose from gallery
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 bg-muted/30"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take photo
                    </Button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={checkInState.isCheckedIn ? handleLogService : handleCheckIn}
                className={`w-full h-12 text-base ${
                  checkInState.isCheckedIn 
                    ? 'bg-success hover:bg-success/90' 
                    : 'bg-destructive/80 hover:bg-destructive'
                }`}
                disabled={!checkInState.isCheckedIn && (!selectedAccount || !activeShift)}
              >
                {checkInState.isCheckedIn ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Log Service & Check Out
                  </>
                ) : (
                  'Check In First'
                )}
              </Button>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <Card className="glass">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                  <div className="p-4 rounded-full bg-muted/30 mb-4">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-muted-foreground">No activity yet</p>
                  <p className="text-sm text-muted-foreground">Start logging your work!</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {recentActivity.map((activity) => (
                    <Card key={activity.id} className="glass">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{(activity.accounts as any)?.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {activity.service_type} • {activity.duration_minutes}min
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.check_in_time), 'h:mm a')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ShovelCrewDashboard;
