import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  Calendar as CalendarIcon,
  Download,
  TrendingUp,
  Snowflake,
  Clock,
  Users,
  Truck,
  MapPin,
  ThermometerSnowflake,
  Activity,
  BarChart3,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

type DateRange = {
  from: Date;
  to: Date;
};

const Reports = () => {
  const { isAdminOrManager } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this-month');

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    switch (period) {
      case 'this-week':
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'last-week':
        setDateRange({ from: startOfWeek(subWeeks(now, 1)), to: endOfWeek(subWeeks(now, 1)) });
        break;
      case 'this-month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'last-month':
        setDateRange({ from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) });
        break;
      case 'last-3-months':
        setDateRange({ from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) });
        break;
    }
  };

  // Fetch work logs summary
  const { data: workLogsSummary } = useQuery({
    queryKey: ['workLogsSummary', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_logs')
        .select('*, accounts(name)')
        .gte('check_in_time', dateRange.from.toISOString())
        .lte('check_in_time', dateRange.to.toISOString());

      if (error) throw error;
      return data;
    },
  });

  // Fetch shovel logs summary
  const { data: shovelLogsSummary } = useQuery({
    queryKey: ['shovelLogsSummary', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shovel_work_logs')
        .select('*, accounts(name)')
        .gte('check_in_time', dateRange.from.toISOString())
        .lte('check_in_time', dateRange.to.toISOString());

      if (error) throw error;
      return data;
    },
  });

  // Fetch employee stats
  const { data: employeeStats } = useQuery({
    queryKey: ['employeeStats', dateRange],
    queryFn: async () => {
      const { data: timeClock, error } = await supabase
        .from('time_clock')
        .select('*, employees(name, category)')
        .gte('clock_in_time', dateRange.from.toISOString())
        .lte('clock_in_time', dateRange.to.toISOString())
        .not('clock_out_time', 'is', null);

      if (error) throw error;
      return timeClock;
    },
  });

  // Fetch equipment usage
  const { data: equipmentUsage } = useQuery({
    queryKey: ['equipmentUsage', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_log_equipment')
        .select('*, equipment(name, type), work_logs!inner(check_in_time)')
        .gte('work_logs.check_in_time', dateRange.from.toISOString())
        .lte('work_logs.check_in_time', dateRange.to.toISOString());

      if (error) throw error;
      return data;
    },
  });

  // Calculate summary stats
  const summaryStats = {
    totalPlowServices: workLogsSummary?.length || 0,
    totalShovelServices: shovelLogsSummary?.length || 0,
    totalSaltUsed: workLogsSummary?.reduce((sum, log) => sum + (log.salt_used || 0), 0) || 0,
    totalHours: ((workLogsSummary?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0) + 
                 (shovelLogsSummary?.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) || 0)) / 60,
    avgSnowDepth: workLogsSummary?.length 
      ? (workLogsSummary.reduce((sum, log) => sum + (log.snow_depth || 0), 0) / workLogsSummary.length).toFixed(1)
      : '0',
  };

  // Prepare daily activity data
  const dailyActivity = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(day => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    
    const plowLogs = workLogsSummary?.filter(log => {
      const logDate = new Date(log.check_in_time);
      return logDate >= dayStart && logDate <= dayEnd;
    }) || [];
    
    const shovelLogs = shovelLogsSummary?.filter(log => {
      const logDate = new Date(log.check_in_time);
      return logDate >= dayStart && logDate <= dayEnd;
    }) || [];

    return {
      date: format(day, 'MMM d'),
      plow: plowLogs.length,
      shovel: shovelLogs.length,
      salt: plowLogs.reduce((sum, log) => sum + (log.salt_used || 0), 0),
    };
  });

  // Prepare service type breakdown
  const serviceTypeData = [
    { name: 'Plow Only', value: workLogsSummary?.filter(log => log.service_type === 'plow').length || 0 },
    { name: 'Salt Only', value: workLogsSummary?.filter(log => log.service_type === 'salt').length || 0 },
    { name: 'Plow & Salt', value: workLogsSummary?.filter(log => log.service_type === 'both').length || 0 },
    { name: 'Shovel', value: shovelLogsSummary?.length || 0 },
  ].filter(d => d.value > 0);

  // Prepare account activity data
  const accountActivity = [...(workLogsSummary || []), ...(shovelLogsSummary || [])]
    .reduce((acc, log) => {
      const accountName = (log.accounts as any)?.name || 'Unknown';
      if (!acc[accountName]) {
        acc[accountName] = { services: 0, minutes: 0 };
      }
      acc[accountName].services += 1;
      acc[accountName].minutes += log.duration_minutes || 0;
      return acc;
    }, {} as Record<string, { services: number; minutes: number }>);

  const topAccounts = Object.entries(accountActivity)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.services - a.services)
    .slice(0, 10);

  // Prepare employee hours data
  const employeeHours = employeeStats?.reduce((acc, entry) => {
    const name = (entry.employees as any)?.name || 'Unknown';
    if (!acc[name]) {
      acc[name] = { hours: 0, shifts: 0 };
    }
    acc[name].hours += (entry.duration_minutes || 0) / 60;
    acc[name].shifts += 1;
    return acc;
  }, {} as Record<string, { hours: number; shifts: number }>);

  const employeeHoursData = Object.entries(employeeHours || {})
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">Analytics & Performance Metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setSelectedPeriod('custom');
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summaryStats.totalPlowServices}</p>
                  <p className="text-xs text-muted-foreground">Plow Services</p>
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
                  <p className="text-2xl font-bold">{summaryStats.totalShovelServices}</p>
                  <p className="text-xs text-muted-foreground">Shovel Services</p>
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
                  <p className="text-2xl font-bold">{summaryStats.totalSaltUsed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Salt (lbs)</p>
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
                  <p className="text-2xl font-bold">{summaryStats.totalHours.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <TrendingUp className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summaryStats.avgSnowDepth}"</p>
                  <p className="text-xs text-muted-foreground">Avg Snow Depth</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="glass">
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2">
              <MapPin className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Breakdown
            </TabsTrigger>
          </TabsList>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Daily Services Chart */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Daily Services</CardTitle>
                  <CardDescription>Plow and shovel services by day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                        <YAxis className="text-xs fill-muted-foreground" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }} 
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="plow" 
                          name="Plow" 
                          stackId="1"
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary))" 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="shovel" 
                          name="Shovel" 
                          stackId="1"
                          stroke="hsl(var(--info))" 
                          fill="hsl(var(--info))" 
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Salt Usage Chart */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Salt Usage</CardTitle>
                  <CardDescription>Daily salt consumption in pounds</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                        <YAxis className="text-xs fill-muted-foreground" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }} 
                        />
                        <Bar 
                          dataKey="salt" 
                          name="Salt (lbs)" 
                          fill="hsl(var(--warning))" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Top Accounts by Service Count</CardTitle>
                <CardDescription>Most serviced accounts in the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topAccounts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={150} className="text-xs fill-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }} 
                      />
                      <Bar 
                        dataKey="services" 
                        name="Services" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Account List */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Service details by account</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {topAccounts.map((account, index) => (
                      <div 
                        key={account.name} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round(account.minutes / 60)}h {account.minutes % 60}m total time
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{account.services} services</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Employee Hours</CardTitle>
                <CardDescription>Hours worked by employee</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={employeeHoursData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={120} className="text-xs fill-muted-foreground" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}h`, 'Hours']}
                      />
                      <Bar 
                        dataKey="hours" 
                        name="Hours" 
                        fill="hsl(var(--success))" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Employee List */}
            <Card className="glass">
              <CardHeader>
                <CardTitle>Employee Details</CardTitle>
                <CardDescription>Shift details by employee</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {employeeHoursData.map((employee, index) => (
                      <div 
                        key={employee.name} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-sm font-semibold text-success">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {employee.shifts} shifts
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{employee.hours.toFixed(1)}h</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Service Type Pie Chart */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Service Type Distribution</CardTitle>
                  <CardDescription>Breakdown of service types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceTypeData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {serviceTypeData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Total Services</span>
                      <span className="text-2xl font-bold">
                        {summaryStats.totalPlowServices + summaryStats.totalShovelServices}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Avg Services/Day</span>
                      <span className="text-2xl font-bold">
                        {dailyActivity.length > 0 
                          ? ((summaryStats.totalPlowServices + summaryStats.totalShovelServices) / dailyActivity.length).toFixed(1)
                          : '0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Avg Service Duration</span>
                      <span className="text-2xl font-bold">
                        {(summaryStats.totalPlowServices + summaryStats.totalShovelServices) > 0
                          ? Math.round((summaryStats.totalHours * 60) / (summaryStats.totalPlowServices + summaryStats.totalShovelServices))
                          : 0} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">Unique Accounts Serviced</span>
                      <span className="text-2xl font-bold">{Object.keys(accountActivity).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
