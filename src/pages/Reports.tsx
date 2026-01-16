import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calendar as CalendarIcon,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Filter,
  Clock,
  MapPin,
  Pencil,
  Trash2,
  FileText,
  Image,
  Plus,
  Zap,
  Settings,
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckSquare,
  StickyNote,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { AddWorkEntryDialog } from '@/components/reports/AddWorkEntryDialog';
import { AddShiftDialog } from '@/components/reports/AddShiftDialog';
import { EditShiftDialog } from '@/components/reports/EditShiftDialog';
import { EditWorkLogDialog, type EditableWorkEntry } from '@/components/reports/EditWorkLogDialog';
import { ZapierSettingsDialog } from '@/components/reports/ZapierSettingsDialog';
import { BulkEditDialog } from '@/components/reports/BulkEditDialog';
import { downloadReportPDF, printReportPDF, generateFullReportPDF, generateWorkLogsPDF, generateTimeClockPDF } from '@/lib/generateReportPDF';
import { useToast } from '@/hooks/use-toast';
import { CSVImport } from '@/components/management/CSVImport';

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
  const { isAdminOrManager, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  // Dialog states
  const [showAddEntryDialog, setShowAddEntryDialog] = useState(false);
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [showEditShiftDialog, setShowEditShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<{
    id: string;
    employee_id: string;
    clock_in_time: string;
    clock_out_time: string | null;
    notes: string | null;
  } | null>(null);

  const [showEditWorkLogDialog, setShowEditWorkLogDialog] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<EditableWorkEntry | null>(null);

  const [showZapierSettings, setShowZapierSettings] = useState(false);
  const [isSendingToZapier, setIsSendingToZapier] = useState(false);
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false);
  const [bulkEditType, setBulkEditType] = useState<'work_logs' | 'time_clock' | 'shovel_work_logs'>('work_logs');
  const [shiftsExpanded, setShiftsExpanded] = useState(true);
  
  // Photo viewing state
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  
  // Selection states
  const [selectedWorkLogs, setSelectedWorkLogs] = useState<Set<string>>(new Set());
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  
  // Filter states
  const [logType, setLogType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all');
  const [minSnowDepth, setMinSnowDepth] = useState<string>('');
  const [minSaltUsed, setMinSaltUsed] = useState<string>('');

  // Fetch Zapier webhook URL from settings
  const { data: zapierWebhookUrl = '' } = useQuery({
    queryKey: ['zapierWebhookUrl'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'zapier_webhook_url')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return (data?.value as string) || '';
    },
  });

  // Save Zapier webhook URL mutation
  const saveZapierWebhookMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'zapier_webhook_url')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: url, updated_by: user?.id, updated_at: new Date().toISOString() })
          .eq('key', 'zapier_webhook_url');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'zapier_webhook_url', value: url, updated_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zapierWebhookUrl'] });
    },
  });
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
        .order('check_in_time', { ascending: false })
        .limit(200);

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
        .order('check_in_time', { ascending: false })
        .limit(200);

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
        .order('clock_in_time', { ascending: false })
        .limit(200);

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

  const getReportData = () => ({
    workEntries: allWorkEntries,
    timeClockEntries: timeClockEntries || [],
    filters: {
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      logType,
      selectedAccount,
      selectedEmployee,
      selectedServiceType,
      selectedEquipment,
    },
    summaryStats,
  });

  const handleDownload = () => {
    downloadReportPDF(getReportData());
  };

  const handlePrint = () => {
    printReportPDF(getReportData());
  };

  const sendToZapier = async (type: 'full' | 'worklogs' | 'timeclock') => {
    if (!zapierWebhookUrl) {
      toast({
        title: 'Webhook not configured',
        description: 'Please set up your Zapier webhook URL first.',
        variant: 'destructive',
      });
      setShowZapierSettings(true);
      return;
    }

    setIsSendingToZapier(true);
    
    try {
      const data = getReportData();
      const reportName = type === 'full' ? 'Full Report' : type === 'worklogs' ? 'Work Logs' : 'Time Clock';
      
      // Prepare report data for Zapier
      const reportPayload = {
        report_type: type,
        report_name: `${reportName} - ${format(data.filters.dateFrom, 'MMM d, yyyy')} to ${format(data.filters.dateTo, 'MMM d, yyyy')}`,
        generated_at: new Date().toISOString(),
        date_range: {
          from: data.filters.dateFrom.toISOString(),
          to: data.filters.dateTo.toISOString(),
        },
        summary: data.summaryStats,
        filters: {
          log_type: data.filters.logType,
          account: data.filters.selectedAccount,
          employee: data.filters.selectedEmployee,
          service_type: data.filters.selectedServiceType,
          equipment: data.filters.selectedEquipment,
        },
        work_entries_count: data.workEntries.length,
        time_clock_entries_count: data.timeClockEntries.length,
        work_entries: type !== 'timeclock' ? data.workEntries.slice(0, 100).map(entry => ({
          type: entry.type,
          date: format(new Date(entry.check_in_time), 'yyyy-MM-dd'),
          check_in: entry.check_in_time,
          check_out: entry.check_out_time,
          duration_minutes: entry.duration_minutes,
          location: entry.accounts?.name || '',
          service_type: entry.service_type,
          snow_depth: entry.snow_depth,
          salt_used: entry.salt_used,
          crew: entry.crew,
        })) : [],
        time_clock_entries: type !== 'worklogs' ? data.timeClockEntries.slice(0, 100).map(entry => ({
          employee: (entry.employees as any)?.name || '',
          date: format(new Date(entry.clock_in_time), 'yyyy-MM-dd'),
          clock_in: entry.clock_in_time,
          clock_out: entry.clock_out_time,
          duration_minutes: entry.duration_minutes,
        })) : [],
      };

      await fetch(zapierWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(reportPayload),
      });

      toast({
        title: 'Report sent to Zapier',
        description: 'Check your Zap history to confirm it was triggered.',
      });
    } catch (error) {
      console.error('Error sending to Zapier:', error);
      toast({
        title: 'Error',
        description: 'Failed to send report to Zapier.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingToZapier(false);
    }
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

  const getServiceBadgeClass = (serviceType: string, entryType?: string) => {
    // If it's a shovel log type, use shovel color
    if (entryType === 'shovel') return 'bg-shovel text-shovel-foreground';
    switch (serviceType) {
      case 'salt': return 'bg-success text-success-foreground';
      case 'plow': 
      case 'both':
      default: return 'bg-primary text-primary-foreground';
    }
  };

  // CSV Export functions
  const exportWorkLogsCSV = () => {
    const headers = ['Date', 'Check In', 'Check Out', 'Duration (min)', 'Type', 'Account', 'Service Type', 'Snow Depth', 'Salt Used', 'Temperature', 'Weather', 'Crew', 'Equipment', 'Notes'];
    const rows = allWorkEntries.map(entry => [
      format(new Date(entry.check_in_time), 'yyyy-MM-dd'),
      format(new Date(entry.check_in_time), 'HH:mm'),
      entry.check_out_time ? format(new Date(entry.check_out_time), 'HH:mm') : '',
      entry.duration_minutes || '',
      entry.type,
      entry.accounts?.name || '',
      entry.service_type,
      entry.snow_depth || '',
      entry.salt_used || '',
      entry.temperature || '',
      entry.weather_description || '',
      entry.crew,
      entry.equipmentName,
      entry.notes || '',
    ]);
    
    downloadCSV(headers, rows, `work-logs-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`);
  };

  const exportShiftsCSV = () => {
    if (!timeClockEntries) return;
    const headers = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Duration (min)', 'Clock In Location', 'Clock Out Location', 'Notes'];
    const rows = timeClockEntries.map(entry => [
      format(new Date(entry.clock_in_time), 'yyyy-MM-dd'),
      (entry.employees as any)?.name || '',
      format(new Date(entry.clock_in_time), 'HH:mm'),
      entry.clock_out_time ? format(new Date(entry.clock_out_time), 'HH:mm') : '',
      entry.duration_minutes || '',
      entry.clock_in_latitude && entry.clock_in_longitude ? `${entry.clock_in_latitude},${entry.clock_in_longitude}` : '',
      entry.clock_out_latitude && entry.clock_out_longitude ? `${entry.clock_out_latitude},${entry.clock_out_longitude}` : '',
      entry.notes || '',
    ]);
    
    downloadCSV(headers, rows, `daily-shifts-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.csv`);
  };

  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const escapeCSV = (value: any) => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // CSV Import handlers
  const workLogColumns = [
    { key: 'entry_type', label: 'Type (plow/shovel)' },
    { key: 'date', label: 'Date' },
    { key: 'account_id', label: 'Account (Name or ID)', required: true },
    { key: 'check_in_time', label: 'Check In Time', required: true },
    { key: 'check_out_time', label: 'Check Out Time' },
    { key: 'service_type', label: 'Service Type', required: true },
    { key: 'duration_minutes', label: 'Duration (min)' },
    { key: 'snow_depth', label: 'Snow Depth (in)' },
    { key: 'salt_used', label: 'Salt Used (lbs)' },
    { key: 'temperature', label: 'Temperature (°F)' },
    { key: 'weather_description', label: 'Weather Description' },
    { key: 'wind_speed', label: 'Wind Speed' },
    { key: 'photo_url', label: 'Photo URL' },
    { key: 'notes', label: 'Notes' },
    { key: 'employee_ids', label: 'Crew (Names or IDs, comma-separated)' },
    { key: 'equipment_ids', label: 'Equipment (Names or IDs, comma-separated)' },
  ];

  const shiftColumns = [
    { key: 'employee_id', label: 'Employee (Name or ID)', required: true },
    { key: 'clock_in_time', label: 'Clock In Time', required: true },
    { key: 'clock_out_time', label: 'Clock Out Time' },
    { key: 'duration_minutes', label: 'Duration (min)' },
    { key: 'clock_in_latitude', label: 'Clock In Latitude' },
    { key: 'clock_in_longitude', label: 'Clock In Longitude' },
    { key: 'clock_out_latitude', label: 'Clock Out Latitude' },
    { key: 'clock_out_longitude', label: 'Clock Out Longitude' },
    { key: 'notes', label: 'Notes' },
  ];

  const handleWorkLogImport = async (data: Record<string, any>[]) => {
    // Fetch all accounts, employees, and equipment for name-to-ID resolution
    const [accountsRes, employeesRes, equipmentRes] = await Promise.all([
      supabase.from('accounts').select('id, name'),
      supabase.from('employees').select('id, name'),
      supabase.from('equipment').select('id, name'),
    ]);

    const accountMap = new Map<string, string>();
    const employeeMap = new Map<string, string>();
    const equipmentMap = new Map<string, string>();

    // Build lookup maps (lowercase name -> id, also keep id -> id)
    accountsRes.data?.forEach(a => {
      accountMap.set(a.name.toLowerCase(), a.id);
      accountMap.set(a.id.toLowerCase(), a.id);
    });
    employeesRes.data?.forEach(e => {
      employeeMap.set(e.name.toLowerCase(), e.id);
      employeeMap.set(e.id.toLowerCase(), e.id);
    });
    equipmentRes.data?.forEach(eq => {
      equipmentMap.set(eq.name.toLowerCase(), eq.id);
      equipmentMap.set(eq.id.toLowerCase(), eq.id);
    });

    // Helper to resolve name or ID to UUID
    const resolveAccount = (value: string): string => {
      const resolved = accountMap.get(value.toLowerCase());
      if (!resolved) throw new Error(`Account not found: "${value}"`);
      return resolved;
    };
    const resolveEmployee = (value: string): string => {
      const resolved = employeeMap.get(value.toLowerCase());
      if (!resolved) throw new Error(`Employee not found: "${value}"`);
      return resolved;
    };
    const resolveEquipment = (value: string): string => {
      const resolved = equipmentMap.get(value.toLowerCase());
      if (!resolved) throw new Error(`Equipment not found: "${value}"`);
      return resolved;
    };

    // Process each row and insert with junction table entries
    for (const row of data) {
      const { entry_type, date, employee_ids, equipment_ids, account_id, ...rest } = row;
      const isShovel = entry_type?.toLowerCase() === 'shovel';

      // Resolve account name/ID to UUID
      const resolvedAccountId = resolveAccount(String(account_id));

      // Helper to normalize time to HH:MM:SS format (24-hour)
      const normalizeTime = (time: string): string => {
        if (!time) return '';
        // If already has seconds, return as-is
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(time)) return time.padStart(8, '0');
        // If HH:MM format, add seconds
        if (/^\d{1,2}:\d{2}$/.test(time)) {
          const [h, m] = time.split(':');
          return `${h.padStart(2, '0')}:${m}:00`;
        }
        return time;
      };

      // If date is provided separately, combine with time fields
      let checkInTime = rest.check_in_time;
      let checkOutTime = rest.check_out_time;

      if (date && checkInTime && !checkInTime.includes('T') && !checkInTime.includes('-')) {
        checkInTime = `${date}T${normalizeTime(checkInTime)}`;
      }
      if (date && checkOutTime && !checkOutTime.includes('T') && !checkOutTime.includes('-')) {
        checkOutTime = `${date}T${normalizeTime(checkOutTime)}`;
      }

      const processedRow = {
        ...rest,
        account_id: resolvedAccountId,
        check_in_time: checkInTime,
        check_out_time: checkOutTime || null,
        created_by: user?.id,
        service_type: rest.service_type || (isShovel ? 'sidewalk' : 'plow'),
      };

      // Parse and resolve employee names/IDs (comma-separated)
      const employeeIdList = employee_ids 
        ? String(employee_ids).split(',').map(v => v.trim()).filter(Boolean).map(resolveEmployee)
        : [];
      // Parse and resolve equipment names/IDs (comma-separated)
      const equipmentIdList = equipment_ids 
        ? String(equipment_ids).split(',').map(v => v.trim()).filter(Boolean).map(resolveEquipment)
        : [];

      if (isShovel) {
        // Insert shovel work log
        const { data: insertedLog, error } = await supabase
          .from('shovel_work_logs')
          .insert(processedRow as any)
          .select('id')
          .single();
        if (error) throw error;

        // Insert employee associations
        if (employeeIdList.length > 0 && insertedLog) {
          const employeeAssociations = employeeIdList.map(empId => ({
            shovel_work_log_id: insertedLog.id,
            employee_id: empId,
          }));
          const { error: empError } = await supabase
            .from('shovel_work_log_employees')
            .insert(employeeAssociations);
          if (empError) throw empError;
        }
      } else {
        // Insert plow work log
        const { data: insertedLog, error } = await supabase
          .from('work_logs')
          .insert(processedRow as any)
          .select('id')
          .single();
        if (error) throw error;

        // Insert employee associations
        if (employeeIdList.length > 0 && insertedLog) {
          const employeeAssociations = employeeIdList.map(empId => ({
            work_log_id: insertedLog.id,
            employee_id: empId,
          }));
          const { error: empError } = await supabase
            .from('work_log_employees')
            .insert(employeeAssociations);
          if (empError) throw empError;
        }

        // Insert equipment associations (only for plow entries)
        if (equipmentIdList.length > 0 && insertedLog) {
          const equipmentAssociations = equipmentIdList.map(eqId => ({
            work_log_id: insertedLog.id,
            equipment_id: eqId,
          }));
          const { error: eqError } = await supabase
            .from('work_log_equipment')
            .insert(equipmentAssociations);
          if (eqError) throw eqError;
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['workLogsReport'] });
    queryClient.invalidateQueries({ queryKey: ['shovelLogsReport'] });
  };

  const handleShiftImport = async (data: Record<string, any>[]) => {
    // Fetch employees for name-to-ID resolution
    const { data: employees } = await supabase.from('employees').select('id, name');
    const employeeMap = new Map<string, string>();
    employees?.forEach(e => {
      employeeMap.set(e.name.toLowerCase(), e.id);
      employeeMap.set(e.id.toLowerCase(), e.id);
    });

    const resolvedData = data.map(row => {
      const empValue = String(row.employee_id).toLowerCase();
      const resolvedId = employeeMap.get(empValue);
      if (!resolvedId) throw new Error(`Employee not found: "${row.employee_id}"`);
      return { ...row, employee_id: resolvedId };
    });

    const { error } = await supabase.from('time_clock').insert(resolvedData as any);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['timeClockReport'] });
  };

  // Selection handlers
  const toggleWorkLogSelection = (id: string) => {
    setSelectedWorkLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleShiftSelection = (id: string) => {
    setSelectedShifts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllWorkLogs = () => {
    if (selectedWorkLogs.size === allWorkEntries.length) {
      setSelectedWorkLogs(new Set());
    } else {
      setSelectedWorkLogs(new Set(allWorkEntries.map(e => e.id)));
    }
  };

  const toggleAllShifts = () => {
    if (timeClockEntries && selectedShifts.size === timeClockEntries.length) {
      setSelectedShifts(new Set());
    } else {
      setSelectedShifts(new Set(timeClockEntries?.map(e => e.id) || []));
    }
  };

  const openBulkEditWorkLogs = () => {
    // Determine if selected entries are plow or shovel
    const selectedEntries = allWorkEntries.filter(e => selectedWorkLogs.has(e.id));
    const hasPlow = selectedEntries.some(e => e.type === 'plow');
    const hasShovel = selectedEntries.some(e => e.type === 'shovel');
    
    // If mixed, default to work_logs (plow takes precedence)
    setBulkEditType(hasPlow ? 'work_logs' : 'shovel_work_logs');
    setShowBulkEditDialog(true);
  };

  const openBulkEditShifts = () => {
    setBulkEditType('time_clock');
    setShowBulkEditDialog(true);
  };

  const handleBulkEditSuccess = () => {
    setSelectedWorkLogs(new Set());
    setSelectedShifts(new Set());
  };

  // Individual shift handlers
  const handleEditShift = (entry: any) => {
    setEditingShift({
      id: entry.id,
      employee_id: entry.employee_id,
      clock_in_time: entry.clock_in_time,
      clock_out_time: entry.clock_out_time,
      notes: entry.notes,
    });
    setShowEditShiftDialog(true);
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const { error } = await supabase
        .from('time_clock')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Shift deleted',
        description: 'The shift has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['timeClockReport'] });
    } catch (error: any) {
      console.error('Error deleting shift:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete shift. You may not have permission.',
        variant: 'destructive',
      });
    }
  };

  // Individual work log handlers
  const handleEditWorkLog = (entry: any) => {
    setEditingWorkLog({
      id: entry.id,
      type: entry.type,
      account_id: entry.account_id,
      service_type: entry.service_type,
      check_in_time: entry.check_in_time,
      check_out_time: entry.check_out_time,
      snow_depth: entry.snow_depth,
      salt_used: entry.salt_used,
      temperature: entry.temperature,
      weather_description: entry.weather_description,
      notes: entry.notes,
    });
    setShowEditWorkLogDialog(true);
  };

  const handleDeleteWorkLog = async (entry: any) => {
    const label = entry.type === 'shovel' ? 'shovel entry' : 'work log entry';
    if (!confirm(`Are you sure you want to delete this ${label}?`)) return;

    try {
      const table = entry.type === 'shovel' ? 'shovel_work_logs' : 'work_logs';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: 'Entry deleted',
        description: 'The entry has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['workLogsReport'] });
      queryClient.invalidateQueries({ queryKey: ['shovelLogsReport'] });
    } catch (error: any) {
      console.error('Error deleting work log:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete entry. You may not have permission.',
        variant: 'destructive',
      });
    }
  };

  const handleViewPhoto = async (photoPath: string) => {
    setIsLoadingPhoto(true);
    try {
      const { data, error } = await supabase.storage
        .from('work-photos')
        .createSignedUrl(photoPath, 60 * 60); // 1 hour expiry
      
      if (error) throw error;
      if (data?.signedUrl) {
        setViewingPhotoUrl(data.signedUrl);
      }
    } catch (error: any) {
      console.error('Error loading photo:', error);
      toast({
        title: 'Error loading photo',
        description: error.message || 'Failed to load the photo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPhoto(false);
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
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2 flex-1 sm:flex-none">
                  <Download className="h-4 w-4" />
                  <span className="hidden xs:inline">Export</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => downloadReportPDF(getReportData(), 'full')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Full Report (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadReportPDF(getReportData(), 'worklogs')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Work Logs (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadReportPDF(getReportData(), 'timeclock')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Time Clock (PDF)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportWorkLogsCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Work Logs (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportShiftsCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Daily Shifts (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
                  <Printer className="h-4 w-4" />
                  <span className="hidden xs:inline">Print</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => printReportPDF(getReportData(), 'full')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Full Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => printReportPDF(getReportData(), 'worklogs')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Work Logs Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => printReportPDF(getReportData(), 'timeclock')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Time Clock Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 flex-1 sm:flex-none bg-warning/10 border-warning/30 hover:bg-warning/20"
                  disabled={isSendingToZapier}
                >
                  {isSendingToZapier ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 text-warning" />
                  )}
                  <span className="hidden xs:inline">Zapier</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => sendToZapier('full')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Send Full Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sendToZapier('worklogs')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Send Work Logs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sendToZapier('timeclock')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Send Time Clock
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowZapierSettings(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Webhook
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Import dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
                  <Upload className="h-4 w-4" />
                  <span className="hidden xs:inline">Import</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <CSVImport
                  tableName="Work Logs"
                  columns={workLogColumns}
                  onImport={handleWorkLogImport}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <MapPin className="h-4 w-4 mr-2" />
                      Import Work Logs
                    </DropdownMenuItem>
                  }
                />
                <CSVImport
                  tableName="Daily Shifts"
                  columns={shiftColumns}
                  onImport={handleShiftImport}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Clock className="h-4 w-4 mr-2" />
                      Import Daily Shifts
                    </DropdownMenuItem>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
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
        <Collapsible open={shiftsExpanded} onOpenChange={setShiftsExpanded}>
          <Card className="glass">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between py-3 sm:py-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Clock className="h-4 w-4" />
                  Daily Shifts ({timeClockEntries?.length || 0} shifts)
                  {shiftsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardTitle>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {selectedShifts.size > 0 && isAdminOrManager && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="text-xs gap-1"
                      onClick={openBulkEditShifts}
                    >
                      <CheckSquare className="h-3 w-3" />
                      Edit {selectedShifts.size}
                    </Button>
                  )}
                  {isAdminOrManager && (
                    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowAddShiftDialog(true)}>
                      <Plus className="h-3 w-3" />
                      Add Shift
                    </Button>
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="p-0 sm:p-6 pt-0">
                <div className="overflow-x-auto">
                  <TooltipProvider>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isAdminOrManager && (
                            <TableHead className="w-8">
                              <Checkbox
                                checked={timeClockEntries && timeClockEntries.length > 0 && selectedShifts.size === timeClockEntries.length}
                                onCheckedChange={toggleAllShifts}
                                aria-label="Select all shifts"
                              />
                            </TableHead>
                          )}
                          <TableHead className="text-xs">Employee</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">Start</TableHead>
                          <TableHead className="text-xs hidden sm:table-cell">End</TableHead>
                          <TableHead className="text-xs">Hours</TableHead>
                          <TableHead className="text-xs hidden md:table-cell">Notes</TableHead>
                          <TableHead className="text-xs hidden lg:table-cell">Location</TableHead>
                          <TableHead className="text-xs">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeClockEntries?.slice(0, 100).map((entry) => (
                          <TableRow key={entry.id} className={selectedShifts.has(entry.id) ? 'bg-muted/50' : ''}>
                            {isAdminOrManager && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedShifts.has(entry.id)}
                                  onCheckedChange={() => toggleShiftSelection(entry.id)}
                                  aria-label={`Select shift for ${(entry.employees as any)?.name}`}
                                />
                              </TableCell>
                            )}
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
                              {entry.notes ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 cursor-help max-w-[120px]">
                                      <StickyNote className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="text-xs truncate">{entry.notes}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[300px] bg-popover text-popover-foreground border">
                                    <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {entry.clock_in_latitude && entry.clock_in_longitude ? (
                                <Button variant="link" size="sm" className="p-0 h-auto text-primary text-xs">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => handleEditShift(entry)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => handleDeleteShift(entry.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!timeClockEntries || timeClockEntries.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={isAdminOrManager ? 9 : 8} className="text-center text-muted-foreground py-6 text-xs sm:text-sm">
                              No shifts found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TooltipProvider>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

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
              <p className="text-xl sm:text-3xl font-bold text-shovel">{summaryStats.shovel}</p>
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
            <div className="flex items-center gap-2">
              {selectedWorkLogs.size > 0 && isAdminOrManager && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="text-xs gap-1"
                  onClick={openBulkEditWorkLogs}
                >
                  <CheckSquare className="h-3 w-3" />
                  Edit {selectedWorkLogs.size}
                </Button>
              )}
              {isAdminOrManager && (
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setShowAddEntryDialog(true)}>
                  <Plus className="h-3 w-3" />
                  Add Entry
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdminOrManager && (
                        <TableHead className="w-8">
                          <Checkbox
                            checked={allWorkEntries.length > 0 && selectedWorkLogs.size === allWorkEntries.length}
                            onCheckedChange={toggleAllWorkLogs}
                            aria-label="Select all work logs"
                          />
                        </TableHead>
                      )}
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
                      <TableHead className="text-xs hidden md:table-cell">Notes</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Photo</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allWorkEntries.slice(0, 100).map((entry) => (
                      <TableRow key={entry.id} className={selectedWorkLogs.has(entry.id) ? 'bg-muted/50' : ''}>
                        {isAdminOrManager && (
                          <TableCell>
                            <Checkbox
                              checked={selectedWorkLogs.has(entry.id)}
                              onCheckedChange={() => toggleWorkLogSelection(entry.id)}
                              aria-label={`Select work log at ${entry.accounts?.name}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${entry.type === 'plow' ? 'bg-primary text-primary-foreground' : 'bg-shovel text-shovel-foreground'}`}>
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
                          <Badge className={`text-[10px] px-1.5 py-0.5 ${getServiceBadgeClass(entry.service_type, entry.type)}`}>
                            {entry.service_type === 'both' ? (entry.type === 'shovel' ? 'Shov+Salt' : 'Plow+Salt') : entry.service_type === 'salt' ? 'Salt' : entry.type === 'shovel' ? 'Shovel' : 'Plow'}
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
                        <TableCell className="hidden md:table-cell">
                          {entry.notes ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help max-w-[100px]">
                                  <StickyNote className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-xs truncate">{entry.notes}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px] bg-popover text-popover-foreground border">
                                <p className="text-sm whitespace-pre-wrap">{entry.notes}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {entry.photo_url ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => handleViewPhoto(entry.photo_url!)}
                              disabled={isLoadingPhoto}
                            >
                              {isLoadingPhoto ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Image className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditWorkLog(entry)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteWorkLog(entry)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {allWorkEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={isAdminOrManager ? 15 : 14} className="text-center text-muted-foreground py-6 text-xs sm:text-sm">
                          No entries found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddWorkEntryDialog open={showAddEntryDialog} onOpenChange={setShowAddEntryDialog} />
      <AddShiftDialog open={showAddShiftDialog} onOpenChange={setShowAddShiftDialog} />
      <EditShiftDialog 
        open={showEditShiftDialog} 
        onOpenChange={setShowEditShiftDialog} 
        shift={editingShift} 
      />
      <EditWorkLogDialog
        open={showEditWorkLogDialog}
        onOpenChange={(open) => {
          setShowEditWorkLogDialog(open);
          if (!open) setEditingWorkLog(null);
        }}
        entry={editingWorkLog}
      />
      <ZapierSettingsDialog
        open={showZapierSettings}
        onOpenChange={setShowZapierSettings}
        webhookUrl={zapierWebhookUrl}
        onSave={(url) => saveZapierWebhookMutation.mutate(url)}
      />
      <BulkEditDialog
        open={showBulkEditDialog}
        onOpenChange={setShowBulkEditDialog}
        selectedIds={bulkEditType === 'time_clock' ? Array.from(selectedShifts) : Array.from(selectedWorkLogs)}
        type={bulkEditType}
        onSuccess={handleBulkEditSuccess}
      />

      {/* Photo Viewing Dialog */}
      <Dialog open={!!viewingPhotoUrl} onOpenChange={(open) => !open && setViewingPhotoUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Work Log Photo</DialogTitle>
          </DialogHeader>
          {viewingPhotoUrl && (
            <div className="flex justify-center">
              <img 
                src={viewingPhotoUrl} 
                alt="Work log photo" 
                className="max-h-[70vh] rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Reports;
