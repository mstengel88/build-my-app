import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  Play,
  Square,
  MapPin,
  Calendar,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, differenceInMinutes } from 'date-fns';

interface TimeClockEntry {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  duration_minutes: number | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  notes: string | null;
}

const TimeClock = () => {
  const { user, employeeId } = useAuth();
  const { position, getPosition, loading: gpsLoading } = useGeolocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState('0:00:00');

  // Get current week dates
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch active shift
  const { data: activeShift, isLoading: activeShiftLoading } = useQuery({
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
      return data as TimeClockEntry | null;
    },
    enabled: !!employeeId,
    refetchInterval: 5000,
  });

  // Fetch weekly entries
  const { data: weeklyEntries = [] } = useQuery({
    queryKey: ['weeklyTimeClock', employeeId, weekStart.toISOString()],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('time_clock')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('clock_in_time', weekStart.toISOString())
        .lte('clock_in_time', weekEnd.toISOString())
        .order('clock_in_time', { ascending: false });
      if (error) throw error;
      return data as TimeClockEntry[];
    },
    enabled: !!employeeId,
  });

  // Update elapsed time
  useEffect(() => {
    if (!activeShift) {
      setElapsedTime('0:00:00');
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeShift.clock_in_time);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;
      setElapsedTime(`${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error('Employee not found');
      
      const { error } = await supabase.from('time_clock').insert({
        employee_id: employeeId,
        clock_in_time: new Date().toISOString(),
        clock_in_latitude: position?.latitude || null,
        clock_in_longitude: position?.longitude || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyTimeClock'] });
      toast({
        title: 'Clocked In',
        description: `Shift started at ${format(new Date(), 'h:mm a')}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeShift) throw new Error('No active shift');
      
      const clockOutTime = new Date();
      const clockInTime = new Date(activeShift.clock_in_time);
      const durationMinutes = differenceInMinutes(clockOutTime, clockInTime);

      const { error } = await supabase
        .from('time_clock')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          clock_out_latitude: position?.latitude || null,
          clock_out_longitude: position?.longitude || null,
          duration_minutes: durationMinutes,
          notes: notes || null,
        })
        .eq('id', activeShift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeShift'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyTimeClock'] });
      setClockOutDialogOpen(false);
      setNotes('');
      toast({
        title: 'Clocked Out',
        description: `Shift ended at ${format(new Date(), 'h:mm a')}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClockIn = async () => {
    await getPosition();
    clockInMutation.mutate();
  };

  const handleClockOut = () => {
    getPosition();
    setClockOutDialogOpen(true);
  };

  const confirmClockOut = () => {
    clockOutMutation.mutate();
  };

  // Calculate daily hours
  const getDayHours = (day: Date): number => {
    return weeklyEntries
      .filter((entry) => isSameDay(new Date(entry.clock_in_time), day))
      .reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
  };

  // Calculate weekly total
  const weeklyTotalMinutes = weeklyEntries.reduce(
    (sum, entry) => sum + (entry.duration_minutes || 0),
    0
  );

  const formatHours = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Time Clock</h1>
          <p className="text-muted-foreground">Track your work hours</p>
        </div>

        {/* Clock In/Out Card */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Current Shift
            </CardTitle>
            <CardDescription>
              {activeShift
                ? `Started at ${format(new Date(activeShift.clock_in_time), 'h:mm a')}`
                : 'You are not currently clocked in'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeShift ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="default" className="bg-success mb-2">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
                      On Shift
                    </Badge>
                    <div className="text-4xl font-mono font-bold text-success">
                      {elapsedTime}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleClockOut}
                    disabled={clockOutMutation.isPending}
                    className="h-16 px-8"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Clock Out
                  </Button>
                </div>
                {activeShift.clock_in_latitude && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    Location recorded at clock in
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Button
                  size="lg"
                  onClick={handleClockIn}
                  disabled={clockInMutation.isPending || gpsLoading || !employeeId}
                  className="w-full h-16 text-lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  {clockInMutation.isPending ? 'Clocking In...' : 'Clock In'}
                </Button>
                {position && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    GPS location will be recorded
                  </div>
                )}
                {!employeeId && (
                  <p className="text-sm text-warning">
                    Your account is not linked to an employee record. Contact your manager.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Stats */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Summary
              </CardTitle>
              <CardDescription>
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold text-primary">
                    {formatHours(weeklyTotalMinutes)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Hours</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold">
                    {weeklyEntries.filter((e) => e.duration_minutes).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Shifts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Breakdown */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weekDays.map((day) => {
                  const dayMinutes = getDayHours(day);
                  const isToday = isSameDay(day, today);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        isToday ? 'bg-primary/10 border border-primary/20' : ''
                      }`}
                    >
                      <span className={`text-sm ${isToday ? 'font-medium' : 'text-muted-foreground'}`}>
                        {format(day, 'EEE, MMM d')}
                      </span>
                      <span className={`font-mono ${dayMinutes > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {dayMinutes > 0 ? formatHours(dayMinutes) : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Entries */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Recent Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No entries this week
                      </TableCell>
                    </TableRow>
                  ) : (
                    weeklyEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(new Date(entry.clock_in_time), 'EEE, MMM d')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {format(new Date(entry.clock_in_time), 'h:mm a')}
                            {entry.clock_in_latitude && (
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.clock_out_time ? (
                            <div className="flex items-center gap-1">
                              {format(new Date(entry.clock_out_time), 'h:mm a')}
                              {entry.clock_out_latitude && (
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.duration_minutes ? (
                            <span className="font-mono">{formatHours(entry.duration_minutes)}</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clock Out Dialog */}
      <Dialog open={clockOutDialogOpen} onOpenChange={setClockOutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock Out</DialogTitle>
            <DialogDescription>
              Add any notes about your shift before clocking out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <div className="text-sm text-muted-foreground mb-1">Shift Duration</div>
              <div className="text-3xl font-mono font-bold">{elapsedTime}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about your shift..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockOutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClockOut}
              disabled={clockOutMutation.isPending}
            >
              {clockOutMutation.isPending ? 'Clocking Out...' : 'Confirm Clock Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TimeClock;
