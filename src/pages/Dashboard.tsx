import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCheckInState } from '@/hooks/useCheckInState';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  LogOut,
  Truck,
  CheckCircle,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AccountWithDistance } from '@/lib/supabase-types';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, employeeId } = useAuth();
  const queryClient = useQueryClient();
  const checkInState = useCheckInState('plow');
  const { position, loading: gpsLoading, getPosition } = useGeolocation();
  const { toast } = useToast();
  const gpsInitialized = useRef(false);

  // Auto-activate GPS on page load
  useEffect(() => {
    if (!gpsInitialized.current) {
      gpsInitialized.current = true;
      getPosition();
    }
  }, [getPosition]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [elapsedTime, setElapsedTime] = useState('0:00:00');
  const [shiftElapsedTime, setShiftElapsedTime] = useState('0:00:00');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [serviceType, setServiceType] = useState<'plow' | 'salt' | 'both'>('plow');
  const [snowDepth, setSnowDepth] = useState('');
  const [saltUsed, setSaltUsed] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weatherDescription, setWeatherDescription] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Update elapsed time every second when checked in to a job
  useEffect(() => {
    if (checkInState.isCheckedIn) {
      const interval = setInterval(() => {
        setElapsedTime(checkInState.formatElapsedTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [checkInState.isCheckedIn, checkInState.formatElapsedTime]);


  // Fetch weather data when position changes
  useEffect(() => {
    const fetchWeather = async () => {
      if (!position) return;
      
      setWeatherLoading(true);
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${position.latitude}&longitude=${position.longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
        );
        
        if (!response.ok) throw new Error('Weather fetch failed');
        
        const data = await response.json();
        const current = data.current;
        
        setCurrentTemp(Math.round(current.temperature_2m));
        setTemperature(Math.round(current.temperature_2m).toString());
        setWindSpeed(Math.round(current.wind_speed_10m).toString());
        
        const weatherCode = current.weather_code;
        const weatherDescriptions: Record<number, string> = {
          0: 'Clear', 1: 'Mostly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
          45: 'Foggy', 48: 'Freezing Fog',
          51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
          56: 'Freezing Drizzle', 57: 'Heavy Freezing Drizzle',
          61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
          66: 'Freezing Rain', 67: 'Heavy Freezing Rain',
          71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
          80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
          85: 'Light Snow Showers', 86: 'Heavy Snow Showers',
          95: 'Thunderstorm', 96: 'Thunderstorm with Hail', 99: 'Heavy Thunderstorm',
        };
        setWeatherDescription(weatherDescriptions[weatherCode] || 'Unknown');
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setWeatherLoading(false);
      }
    };
    
    fetchWeather();
  }, [position]);

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

  // Update shift elapsed time every second when shift is active
  useEffect(() => {
    if (activeShift) {
      const updateShiftTime = () => {
        const start = new Date(activeShift.clock_in_time).getTime();
        const now = Date.now();
        const diff = now - start;
        
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        setShiftElapsedTime(
          `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };
      
      updateShiftTime();
      const interval = setInterval(updateShiftTime, 1000);
      return () => clearInterval(interval);
    } else {
      setShiftElapsedTime('0:00:00');
    }
  }, [activeShift]);

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

  // Fetch equipment - filter by service capability based on selected service type
  const { data: equipment = [] } = useQuery({
    queryKey: ['equipment', serviceType],
    queryFn: async () => {
      let query = supabase
        .from('equipment')
        .select('id, name, service_capability')
        .eq('status', 'active');
      
      // For salt or both service types, only show equipment that can salt
      if (serviceType === 'salt' || serviceType === 'both') {
        query = query.in('service_capability', ['salter', 'both']);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Clear selected equipment when service type changes and equipment no longer valid
  useEffect(() => {
    if (serviceType === 'salt' || serviceType === 'both') {
      // Filter out equipment that doesn't have salting capability
      const validEquipment = selectedEquipment.filter(eqId => 
        equipment.some(eq => eq.id === eqId && (eq.service_capability === 'salter' || eq.service_capability === 'both'))
      );
      if (validEquipment.length !== selectedEquipment.length) {
        setSelectedEquipment(validEquipment);
      }
    }
  }, [serviceType, equipment, selectedEquipment]);

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

  // Auto-select nearest account when GPS position updates
  useEffect(() => {
    if (nearestAccount && !selectedAccount && position) {
      setSelectedAccount(nearestAccount.id);
    }
  }, [nearestAccount, selectedAccount, position]);

  // Auto-select the current employee when they have an active shift
  useEffect(() => {
    if (activeShift && employeeId && employees.length > 0 && selectedEmployees.length === 0) {
      const currentEmployee = employees.find(emp => emp.id === employeeId);
      if (currentEmployee) {
        setSelectedEmployees([employeeId]);
      }
    }
  }, [activeShift, employeeId, employees, selectedEmployees.length]);

  // Form validation - all fields required except notes and photo
  // Salt Used is optional for "plow" only, Snow Depth is optional for "salt" only
  const isFormValid = 
    selectedAccount &&
    serviceType &&
    selectedEquipment.length > 0 &&
    selectedEmployees.length > 0 &&
    (serviceType === 'salt' || snowDepth.trim() !== '') &&
    (serviceType === 'plow' || saltUsed.trim() !== '') &&
    temperature.trim() !== '' &&
    weatherDescription.trim() !== '' &&
    windSpeed.trim() !== '';

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
        const fileName = `plow/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('work-photos')
          .upload(fileName, photoFile);
        
        if (!uploadError) {
          photoUrl = fileName;
        }
      }

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
            .from('work_log_employees')
            .insert({
              work_log_id: workLog.id,
              employee_id: empId,
            });
        }
      }

      // Link selected equipment to work log
      if (selectedEquipment.length > 0 && workLog) {
        for (const eqId of selectedEquipment) {
          await supabase
            .from('work_log_equipment')
            .insert({
              work_log_id: workLog.id,
              equipment_id: eqId,
            });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      checkInState.checkOut();
      setSelectedAccount('');
      setServiceType('plow');
      setSnowDepth('');
      setSaltUsed('');
      setTemperature('');
      setWeatherDescription('');
      setWindSpeed('');
      setNotes('');
      setSelectedEquipment([]);
      setSelectedEmployees([]);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error('Error logging service:', error);
      toast({
        title: 'Error',
        description: 'Failed to log service. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStartShift = async () => {
    if (!employeeId) {
      toast({
        title: 'Employee not found',
        description: 'Please contact an administrator to link your account.',
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

      toast({
        title: 'Shift started!',
        description: 'You are now clocked in.',
      });
    } catch (error) {
      console.error('Error starting shift:', error);
      toast({
        title: 'Error',
        description: 'Failed to start shift. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;

    try {
      const clockOutTime = new Date();
      const clockInTime = new Date(activeShift.clock_in_time);
      const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000);

      const { error } = await supabase
        .from('time_clock')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          clock_out_latitude: position?.latitude || null,
          clock_out_longitude: position?.longitude || null,
          duration_minutes: durationMinutes,
        })
        .eq('id', activeShift.id);

      if (error) throw error;

      toast({
        title: 'Shift ended!',
        description: `Total time: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      });
    } catch (error) {
      console.error('Error ending shift:', error);
      toast({
        title: 'Error',
        description: 'Failed to end shift. Please try again.',
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
                <h1 className="text-2xl font-bold text-foreground">WinterWatch-Pro</h1>
                <span className="text-muted-foreground">
                  {currentTemp !== null ? `${currentTemp}°F` : weatherLoading ? '...' : '--°F'}
                </span>
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
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">Daily Shift</h3>
                    {activeShift && (
                      <span className="text-lg font-mono font-bold text-success">{shiftElapsedTime}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activeShift ? `Started at ${format(new Date(activeShift.clock_in_time), 'h:mm a')}` : 'Shift not started'}
                  </p>
                </div>
              </div>
              {activeShift ? (
                <Button 
                  onClick={handleEndShift}
                  variant="destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  End Shift
                </Button>
              ) : (
                <Button 
                  onClick={handleStartShift}
                  className="bg-success hover:bg-success/90 text-success-foreground"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Start Shift
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Overview */}
        <div>
          <h2 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-3">
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
            <h2 className="text-xl font-semibold text-foreground">Quick Log Entry</h2>
            
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
              <Label className="text-sm text-foreground/70">Select Account (verify or change)</Label>
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

            {/* Check In Button / Timer Display */}
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
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Timer running at</p>
                    <p className="font-medium">{checkInState.accountName}</p>
                  </div>
                  <p className="text-2xl font-mono font-bold text-primary">{elapsedTime}</p>
                </div>
              </div>
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

            {/* Equipment & Employees Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Equipment</Label>
                <Select 
                  value={selectedEquipment[0] || ''} 
                  onValueChange={(value) => {
                    if (value && !selectedEquipment.includes(value)) {
                      setSelectedEquipment([...selectedEquipment, value]);
                    }
                  }}
                >
                  <SelectTrigger className="bg-card border-border h-11">
                    <SelectValue placeholder="Select equipment..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        <div className="flex items-center gap-2">
                          {selectedEquipment.includes(eq.id) && (
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                          )}
                          <span>{eq.name}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 h-4 ${
                              eq.service_capability === 'both' 
                                ? 'border-primary text-primary' 
                                : eq.service_capability === 'salter'
                                ? 'border-green-500 text-green-600'
                                : 'border-blue-500 text-blue-600'
                            }`}
                          >
                            {eq.service_capability === 'both' ? 'Plow+Salt' : eq.service_capability === 'salter' ? 'Salter' : 'Plow'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEquipment.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedEquipment.map((eqId) => {
                      const eq = equipment.find(e => e.id === eqId);
                      return (
                        <Badge 
                          key={eqId} 
                          variant="secondary" 
                          className={`text-xs cursor-pointer ${
                            eq?.service_capability === 'both' 
                              ? 'bg-primary/10 text-primary border-primary/20' 
                              : eq?.service_capability === 'salter'
                              ? 'bg-green-500/10 text-green-600 border-green-500/20'
                              : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}
                          onClick={() => setSelectedEquipment(selectedEquipment.filter(id => id !== eqId))}
                        >
                          {eq?.name} ×
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Employees</Label>
                <Select 
                  value={selectedEmployees[0] || ''} 
                  onValueChange={(value) => {
                    if (value && !selectedEmployees.includes(value)) {
                      setSelectedEmployees([...selectedEmployees, value]);
                    }
                  }}
                >
                  <SelectTrigger className="bg-card border-border h-11">
                    <SelectValue placeholder="Select employees..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          {selectedEmployees.includes(emp.id) && (
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                          )}
                          {emp.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEmployees.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedEmployees.map((empId) => {
                      const emp = employees.find(e => e.id === empId);
                      return (
                        <Badge 
                          key={empId} 
                          variant="secondary" 
                          className="text-xs cursor-pointer"
                          onClick={() => setSelectedEmployees(selectedEmployees.filter(id => id !== empId))}
                        >
                          {emp?.name} ×
                        </Badge>
                      );
                    })}
                  </div>
                )}
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
                  ? isFormValid 
                    ? 'bg-success hover:bg-success/90' 
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-destructive/80 hover:bg-destructive'
              }`}
              disabled={
                checkInState.isCheckedIn 
                  ? !isFormValid 
                  : (!selectedAccount || !activeShift)
              }
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
            {checkInState.isCheckedIn && !isFormValid && (
              <p className="text-xs text-center text-destructive">
                Please fill in all required fields (Equipment, Employees, Snow Depth, Salt Used, Weather info)
              </p>
            )}
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
