import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar as CalendarIcon,
  Download,
  Printer,
  Filter,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  FileText,
  Image,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

type DateRange = {
  from: Date;
  to: Date;
};

type WorkLogWithDetails = {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
  service_type: string;
  snow_depth: number | null;
  salt_used: number | null;
  temperature: number | null;
  weather_description: string | null;
  wind_speed: string | null;
  photo_url: string | null;
  notes: string | null;
  accounts: { name: string } | null;
  work_log_employees: { employees: { name: string } | null }[];
  work_log_equipment: { equipment: { name: string } | null }[];
};

type ShovelLogWithDetails = {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
  service_type: string;
  snow_depth: number | null;
  salt_used: number | null;
  temperature: number | null;
  weather_description: string | null;
  wind_speed: string | null;
  photo_url: string | null;
  notes: string | null;
  accounts: { name: string } | null;
  shovel_work_log_employees: { employees: { name: string } | null }[];
};

const Reports = () => {
  const { isAdminOrManager } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  // Filter states
  const [logType, setLogType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [minSnowDepth, setMinSnowDepth] = useState<string>('');
  const [minSaltUsed, setMinSaltUsed] = useState<string>('');

  // Fetch accounts for filter
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees for filter
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employees').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch equipment for filter
  const { data: equipment } = useQuery({
    queryKey: ['equipment'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipment').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch work logs with details
  const { data: workLogs } = useQuery({
    queryKey: ['workLogsReport', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_logs')
        .select(`
          *,
          accounts(name),
          work_log_employees(employees(name)),
          work_log_equipment(equipment(name))
        `)
        .gte('check_in_time', dateRange.from.toISOString())
        .lte('check_in_time', dateRange.to.toISOString())
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data as WorkLogWithDetails[];
    },
  });

  // Fetch shovel logs with details
  const { data: shovelLogs } = useQuery({
    queryKey: ['shovelLogsReport', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shovel_work_logs')
        .select(`
          *,
          accounts(name),
          shovel_work_log_employees(employees(name))
        `)
        .gte('check_in_time', dateRange.from.toISOString())
        .lte('check_in_time', dateRange.to.toISOString())
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      return data as ShovelLogWithDetails[];
    },
  });

  // Fetch time clock entries (daily shifts)
  const { data: timeClockEntries } = useQuery({
    queryKey: ['timeClockReport', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_clock')
        .select('*, employees(name)')
        .gte('clock_in_time', dateRange.from.toISOString())
        .lte('clock_in_time', dateRange.to.toISOString())
        .not('clock_out_time', 'is', null)
        .order('clock_in_time', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Apply filters to work logs
  const filteredWorkLogs = useMemo(() => {
    if (!workLogs) return [];
    
    return workLogs.filter(log => {
      if (logType === 'shovel') return false;
      if (selectedAccount !== 'all' && log.accounts?.name !== selectedAccount) return false;
      if (selectedServiceType !== 'all' && log.service_type !== selectedServiceType) return false;
      if (minSnowDepth && (log.snow_depth || 0) < parseFloat(minSnowDepth)) return false;
      if (minSaltUsed && (log.salt_used || 0) < parseFloat(minSaltUsed)) return false;
      if (selectedEmployee !== 'all') {
        const hasEmployee = log.work_log_employees?.some(e => e.employees?.name === selectedEmployee);
        if (!hasEmployee) return false;
      }
      if (selectedEquipment !== 'all') {
        const hasEquipment = log.work_log_equipment?.some(e => e.equipment?.name === selectedEquipment);
        if (!hasEquipment) return false;
      }
      return true;
    });
  }, [workLogs, logType, selectedAccount, selectedServiceType, minSnowDepth, minSaltUsed, selectedEmployee, selectedEquipment]);

  // Apply filters to shovel logs
  const filteredShovelLogs = useMemo(() => {
    if (!shovelLogs) return [];
    
    return shovelLogs.filter(log => {
      if (logType === 'plow') return false;
      if (selectedLocation !== 'all' && log.accounts?.name !== selectedLocation) return false;
      if (selectedServiceType !== 'all' && log.service_type !== selectedServiceType) return false;
      if (minSnowDepth && (log.snow_depth || 0) < parseFloat(minSnowDepth)) return false;
      if (minSaltUsed && (log.salt_used || 0) < parseFloat(minSaltUsed)) return false;
      if (selectedEmployee !== 'all') {
        const hasEmployee = log.shovel_work_log_employees?.some(e => e.employees?.name === selectedEmployee);
        if (!hasEmployee) return false;
      }
      return true;
    });
  }, [shovelLogs, logType, selectedLocation, selectedServiceType, minSnowDepth, minSaltUsed, selectedEmployee]);

  // Combine all work entries for display
  const allWorkEntries = useMemo(() => {
    const plow = (logType === 'all' || logType === 'plow') ? filteredWorkLogs.map(log => ({
      ...log,
      type: 'plow' as const,
      crew: log.work_log_employees?.map(e => e.employees?.name).filter(Boolean).join(', ') || '-',
      equipmentName: log.work_log_equipment?.map(e => e.equipment?.name).filter(Boolean).join(', ') || '-',
    })) : [];

    const shovel = (logType === 'all' || logType === 'shovel') ? filteredShovelLogs.map(log => ({
      ...log,
      type: 'shovel' as const,
      crew: log.shovel_work_log_employees?.map(e => e.employees?.name).filter(Boolean).join(', ') || '-',
      equipmentName: '-',
    })) : [];

    return [...plow, ...shovel].sort((a, b) => 
      new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime()
    );
  }, [filteredWorkLogs, filteredShovelLogs, logType]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const plowCount = filteredWorkLogs.length;
    const shovelCount = filteredShovelLogs.length;
    const saltLogs = filteredWorkLogs.filter(log => log.service_type === 'salt' || log.service_type === 'both');
    const uniqueLocations = new Set([
      ...filteredWorkLogs.map(log => log.accounts?.name),
      ...filteredShovelLogs.map(log => log.accounts?.name),
    ].filter(Boolean));

    return {
      total: plowCount + shovelCount,
      plow: plowCount,
      shovel: shovelCount,
      salt: saltLogs.length,
      locations: uniqueLocations.size,
    };
  }, [filteredWorkLogs, filteredShovelLogs]);

  const clearFilters = () => {
    setLogType('all');
    setSelectedAccount('all');
    setSelectedLocation('all');
    setSelectedEmployee('all');
    setSelectedServiceType('all');
    setSelectedEquipment('all');
    setMinSnowDepth('');
    setMinSaltUsed('');
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'HH:mm');
  };

  const getServiceBadgeClass = (serviceType: string) => {
    switch (serviceType) {
      case 'salt': return 'bg-success text-success-foreground';
      case 'plow': 
      case 'both':
      case 'shovel':
      default: return 'bg-primary text-primary-foreground';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Service Reports</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">View, edit, and export work logs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2 flex-1 sm:flex-none">
              <Download className="h-4 w-4" />
              <span className="hidden xs:inline">Export</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
              <Printer className="h-4 w-4" />
              <span className="hidden xs:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Report Filters */}
        <Card className="glass">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Filter className="h-4 w-4" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {/* Date Range Row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {format(dateRange.from, 'MM/dd/yy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal text-xs sm:text-sm">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {format(dateRange.to, 'MM/dd/yy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Log Type */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Log Type</Label>
              <Select value={logType} onValueChange={setLogType}>
                <SelectTrigger className="h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="plow">Plow Only</SelectItem>
                  <SelectItem value="shovel">Shovel Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Account, Location, Employee Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Account (Plow)</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts?.map(account => (
                      <SelectItem key={account.id} value={account.name}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Location (Shovel)</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {accounts?.map(account => (
                      <SelectItem key={account.id} value={account.name}>{account.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees?.map(emp => (
                      <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Service Type, Equipment Row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Service Type</Label>
                <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="plow">Plow</SelectItem>
                    <SelectItem value="salt">Salt</SelectItem>
                    <SelectItem value="both">Plow & Salt</SelectItem>
                    <SelectItem value="shovel">Shovel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Equipment</Label>
                <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                  <SelectTrigger className="h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="All Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    {equipment?.map(eq => (
                      <SelectItem key={eq.id} value={eq.name}>{eq.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Min Snow Depth, Min Salt Used Row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Min Snow (in)</Label>
                <Input 
                  type="number" 
                  placeholder="Any"
                  className="h-9 text-xs sm:text-sm"
                  value={minSnowDepth}
                  onChange={(e) => setMinSnowDepth(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Min Salt (lbs)</Label>
                <Input 
                  type="number" 
                  placeholder="Any"
                  className="h-9 text-xs sm:text-sm"
                  value={minSaltUsed}
                  onChange={(e) => setMinSaltUsed(e.target.value)}
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </CardContent>
        </Card>

        {/* Daily Shifts */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between py-3 sm:py-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Clock className="h-4 w-4" />
              Daily Shifts ({timeClockEntries?.length || 0} shifts)
            </CardTitle>
            <Button variant="outline" size="sm" className="text-xs">Add Shift</Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Start</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">End</TableHead>
                    <TableHead className="text-xs">Hours</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Location</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeClockEntries?.slice(0, 10).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {(entry.employees as any)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-xs">{format(new Date(entry.clock_in_time), 'MM/dd')}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{formatTime(entry.clock_in_time)}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{formatTime(entry.clock_out_time)}</TableCell>
                      <TableCell>
                        <span className="text-primary font-medium text-xs sm:text-sm">
                          {entry.duration_minutes ? (entry.duration_minutes / 60).toFixed(1) + 'h' : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Button variant="link" size="sm" className="p-0 h-auto text-primary text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!timeClockEntries || timeClockEntries.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-xs sm:text-sm">
                        No shifts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
          <Card className="glass">
            <CardContent className="p-2 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Total</p>
              <p className="text-xl sm:text-3xl font-bold">{summaryStats.total}</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-2 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Plow</p>
              <p className="text-xl sm:text-3xl font-bold text-primary">{summaryStats.plow}</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="p-2 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Shovel</p>
              <p className="text-xl sm:text-3xl font-bold text-info">{summaryStats.shovel}</p>
            </CardContent>
          </Card>
          <Card className="glass hidden sm:block">
            <CardContent className="p-2 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Salt</p>
              <p className="text-xl sm:text-3xl font-bold text-warning">{summaryStats.salt}</p>
            </CardContent>
          </Card>
          <Card className="glass hidden sm:block">
            <CardContent className="p-2 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Locations</p>
              <p className="text-xl sm:text-3xl font-bold text-success">{summaryStats.locations}</p>
            </CardContent>
          </Card>
        </div>

        {/* Work Log Entries */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between py-3 sm:py-4">
            <CardTitle className="text-sm sm:text-base">Work Log Entries ({allWorkEntries.length})</CardTitle>
            <Button variant="outline" size="sm" className="text-xs">Add Entry</Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">In</TableHead>
                    <TableHead className="text-xs">Out</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Dur.</TableHead>
                    <TableHead className="text-xs">Location</TableHead>
                    <TableHead className="text-xs hidden sm:table-cell">Service</TableHead>
                    <TableHead className="text-xs hidden md:table-cell">Snow/Salt</TableHead>
                    <TableHead className="text-xs">Weather</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Equipment</TableHead>
                    <TableHead className="text-xs">Crew</TableHead>
                    <TableHead className="text-xs hidden lg:table-cell">Photo</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allWorkEntries.slice(0, 20).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant={entry.type === 'plow' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0.5">
                          {entry.type === 'plow' ? 'Plow' : 'Shov'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(entry.check_in_time), 'MM/dd')}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatTime(entry.check_in_time)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatTime(entry.check_out_time)}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{formatDuration(entry.duration_minutes)}</TableCell>
                      <TableCell className="max-w-[80px] sm:max-w-[120px] truncate text-xs">
                        {entry.accounts?.name || '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge className={`text-[10px] px-1.5 py-0.5 ${getServiceBadgeClass(entry.service_type)}`}>
                          {entry.service_type === 'both' ? 'Both' : entry.service_type === 'salt' ? 'Salt' : entry.service_type === 'shovel' ? 'Shov' : 'Plow'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs hidden md:table-cell">
                        {entry.snow_depth ? `${entry.snow_depth}"` : '-'} / {entry.salt_used ? `${entry.salt_used}lb` : '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span>{entry.temperature ? `${entry.temperature}°F` : '-'}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                            {entry.weather_description || ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[80px] truncate text-xs hidden lg:table-cell">
                        {entry.equipmentName}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-xs">
                        {entry.crew}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {entry.photo_url ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Image className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {allWorkEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center text-muted-foreground py-6 text-xs sm:text-sm">
                        No entries found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Reports;
