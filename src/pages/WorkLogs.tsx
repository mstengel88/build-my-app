import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList,
  Search,
  Calendar,
  Clock,
  Snowflake,
  ThermometerSnowflake,
  MapPin,
  User,
  Truck,
  Shovel,
  Filter,
  Eye,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';

interface WorkLog {
  id: string;
  account_id: string;
  service_type: string;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
  snow_depth: number | null;
  salt_used: number | null;
  temperature: number | null;
  weather_description: string | null;
  notes: string | null;
  photo_url: string | null;
  created_by: string | null;
  accounts?: { name: string; address: string };
  work_log_employees?: { employees: { name: string } }[];
}

interface ShovelWorkLog {
  id: string;
  account_id: string;
  service_type: string;
  check_in_time: string;
  check_out_time: string | null;
  duration_minutes: number | null;
  snow_depth: number | null;
  salt_used: number | null;
  temperature: number | null;
  weather_description: string | null;
  notes: string | null;
  photo_url: string | null;
  created_by: string | null;
  accounts?: { name: string; address: string };
  shovel_work_log_employees?: { employees: { name: string } }[];
}

const WorkLogs = () => {
  const { isAdminOrManager } = useAuth();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('this-month');
  const [accountFilter, setAccountFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<WorkLog | ShovelWorkLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return { start: today, end: now };
      case 'this-week':
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return { start: weekStart, end: now };
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  // Fetch plow work logs
  const { data: plowLogs = [], isLoading: plowLoading } = useQuery({
    queryKey: ['workLogs', 'plow', dateFilter, accountFilter],
    queryFn: async () => {
      let query = supabase
        .from('work_logs')
        .select(`
          *,
          accounts!inner(name, address),
          work_log_employees(employees(name))
        `)
        .gte('check_in_time', start.toISOString())
        .lte('check_in_time', end.toISOString())
        .order('check_in_time', { ascending: false });

      if (accountFilter !== 'all') {
        query = query.eq('account_id', accountFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WorkLog[];
    },
  });

  // Fetch shovel work logs
  const { data: shovelLogs = [], isLoading: shovelLoading } = useQuery({
    queryKey: ['workLogs', 'shovel', dateFilter, accountFilter],
    queryFn: async () => {
      let query = supabase
        .from('shovel_work_logs')
        .select(`
          *,
          accounts!inner(name, address),
          shovel_work_log_employees(employees(name))
        `)
        .gte('check_in_time', start.toISOString())
        .lte('check_in_time', end.toISOString())
        .order('check_in_time', { ascending: false });

      if (accountFilter !== 'all') {
        query = query.eq('account_id', accountFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ShovelWorkLog[];
    },
  });

  // Fetch accounts for filter
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Filter logs by search
  const filterLogs = <T extends { accounts?: { name: string } }>(logs: T[]): T[] => {
    if (!search) return logs;
    return logs.filter((log) =>
      log.accounts?.name.toLowerCase().includes(search.toLowerCase())
    );
  };

  const filteredPlowLogs = filterLogs(plowLogs);
  const filteredShovelLogs = filterLogs(shovelLogs);

  // Stats
  const plowStats = {
    count: filteredPlowLogs.length,
    totalHours: filteredPlowLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / 60,
    totalSalt: filteredPlowLogs.reduce((sum, log) => sum + (log.salt_used || 0), 0),
  };

  const shovelStats = {
    count: filteredShovelLogs.length,
    totalHours: filteredShovelLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / 60,
    totalSalt: filteredShovelLogs.reduce((sum, log) => sum + (log.salt_used || 0), 0),
  };

  const viewDetails = (log: WorkLog | ShovelWorkLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const getEmployeeNames = (log: WorkLog | ShovelWorkLog): string => {
    if ('work_log_employees' in log && log.work_log_employees) {
      return log.work_log_employees.map((e) => e.employees?.name).filter(Boolean).join(', ') || '-';
    }
    if ('shovel_work_log_employees' in log && log.shovel_work_log_employees) {
      return log.shovel_work_log_employees.map((e) => e.employees?.name).filter(Boolean).join(', ') || '-';
    }
    return '-';
  };

  const renderLogTable = (logs: (WorkLog | ShovelWorkLog)[], loading: boolean, type: 'plow' | 'shovel') => (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Date</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Snow</TableHead>
            <TableHead>Salt</TableHead>
            <TableHead>Crew</TableHead>
            <TableHead className="w-[70px]">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading...
                </div>
              </TableCell>
            </TableRow>
          ) : logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No work logs found for this period
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="text-sm">
                    <div>{format(parseISO(log.check_in_time), 'MMM d, yyyy')}</div>
                    <div className="text-muted-foreground">
                      {format(parseISO(log.check_in_time), 'h:mm a')}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{log.accounts?.name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {log.accounts?.address}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {log.service_type === 'both' ? 'Plow & Salt' : log.service_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.duration_minutes ? (
                    <span className="font-mono">
                      {Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m
                    </span>
                  ) : (
                    <Badge variant="secondary">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {log.snow_depth ? `${log.snow_depth}"` : '-'}
                </TableCell>
                <TableCell>
                  {log.salt_used ? `${log.salt_used} lbs` : '-'}
                </TableCell>
                <TableCell className="max-w-[120px] truncate">
                  {getEmployeeNames(log)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => viewDetails(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Work Logs</h1>
          <p className="text-muted-foreground">View and manage service history</p>
        </div>

        {/* Filters */}
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Plow and Shovel */}
        <Tabs defaultValue="plow" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="plow" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Plow ({filteredPlowLogs.length})
            </TabsTrigger>
            <TabsTrigger value="shovel" className="flex items-center gap-2">
              <Shovel className="h-4 w-4" />
              Shovel ({filteredShovelLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plow" className="space-y-4">
            {/* Plow Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">{plowStats.count}</div>
                      <div className="text-xs text-muted-foreground">Services</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-info" />
                    <div>
                      <div className="text-2xl font-bold">{plowStats.totalHours.toFixed(1)}h</div>
                      <div className="text-xs text-muted-foreground">Total Hours</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ThermometerSnowflake className="h-5 w-5 text-warning" />
                    <div>
                      <div className="text-2xl font-bold">{plowStats.totalSalt.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">lbs Salt</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Plow Table */}
            <Card className="glass">
              <CardContent className="p-6">
                {renderLogTable(filteredPlowLogs, plowLoading, 'plow')}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shovel" className="space-y-4">
            {/* Shovel Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-shovel" />
                    <div>
                      <div className="text-2xl font-bold">{shovelStats.count}</div>
                      <div className="text-xs text-muted-foreground">Services</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-info" />
                    <div>
                      <div className="text-2xl font-bold">{shovelStats.totalHours.toFixed(1)}h</div>
                      <div className="text-xs text-muted-foreground">Total Hours</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <ThermometerSnowflake className="h-5 w-5 text-warning" />
                    <div>
                      <div className="text-2xl font-bold">{shovelStats.totalSalt.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">lbs Salt</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Shovel Table */}
            <Card className="glass">
              <CardContent className="p-6">
                {renderLogTable(filteredShovelLogs, shovelLoading, 'shovel')}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Work Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog?.accounts?.name} - {selectedLog && format(parseISO(selectedLog.check_in_time), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Check In</div>
                  <div className="font-medium">
                    {format(parseISO(selectedLog.check_in_time), 'h:mm a')}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Check Out</div>
                  <div className="font-medium">
                    {selectedLog.check_out_time
                      ? format(parseISO(selectedLog.check_out_time), 'h:mm a')
                      : 'Active'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Duration</div>
                  <div className="font-medium">
                    {selectedLog.duration_minutes
                      ? `${Math.floor(selectedLog.duration_minutes / 60)}h ${selectedLog.duration_minutes % 60}m`
                      : '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Service Type</div>
                  <Badge variant="outline" className="capitalize">
                    {selectedLog.service_type === 'both' ? 'Plow & Salt' : selectedLog.service_type}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <Snowflake className="h-4 w-4 mx-auto mb-1 text-info" />
                  <div className="text-lg font-bold">
                    {selectedLog.snow_depth ? `${selectedLog.snow_depth}"` : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">Snow Depth</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <ThermometerSnowflake className="h-4 w-4 mx-auto mb-1 text-warning" />
                  <div className="text-lg font-bold">
                    {selectedLog.salt_used ? `${selectedLog.salt_used}` : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">lbs Salt</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <ThermometerSnowflake className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold">
                    {selectedLog.temperature ? `${selectedLog.temperature}°` : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">Temp</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Address
                </div>
                <div className="text-sm">{selectedLog.accounts?.address}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Crew
                </div>
                <div className="text-sm">{getEmployeeNames(selectedLog)}</div>
              </div>

              {selectedLog.notes && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Notes</div>
                  <div className="text-sm p-3 rounded-lg bg-muted/50">{selectedLog.notes}</div>
                </div>
              )}

              {selectedLog.weather_description && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Weather</div>
                  <div className="text-sm">{selectedLog.weather_description}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default WorkLogs;
