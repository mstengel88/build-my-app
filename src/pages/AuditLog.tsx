import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Database,
  Search,
  Filter,
  Eye,
  CheckCircle,
  AlertTriangle,
  Info,
  Shield,
  User,
  Clock,
  Loader2,
  RefreshCw,
  X,
  Activity,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  Settings,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

interface AuditLog {
  id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  user_id: string | null;
  metadata: Json;
  severity: string;
  ip_address: string | null;
  user_agent: string | null;
  is_read: boolean;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  create: <Plus className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  settings_change: <Settings className="h-4 w-4" />,
  role_change: <Shield className="h-4 w-4" />,
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  info: { label: 'Info', color: 'bg-info/10 text-info border-info/20', icon: <Info className="h-4 w-4" /> },
  warning: { label: 'Warning', color: 'bg-warning/10 text-warning border-warning/20', icon: <AlertTriangle className="h-4 w-4" /> },
  error: { label: 'Error', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: <AlertTriangle className="h-4 w-4" /> },
  critical: { label: 'Critical', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: <Shield className="h-4 w-4" /> },
};

const AuditLogPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch audit logs
  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['auditLogs', severityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }
      
      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Fetch user profiles for display
  const { data: profiles = [] } = useQuery({
    queryKey: ['auditProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email');
      
      if (error) throw error;
      return data;
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from('audit_logs')
        .update({ is_read: true })
        .eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('audit_logs')
        .update({ is_read: true })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return 'System';
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.display_name || profile?.email?.split('@')[0] || 'Unknown User';
  };

  const getActionIcon = (actionType: string) => {
    return ACTION_ICONS[actionType] || <Activity className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
    return (
      <Badge variant="outline" className={cn('gap-1', config.color)}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // Filter logs by search
  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action_type.toLowerCase().includes(query) ||
      log.entity_type?.toLowerCase().includes(query) ||
      getUserName(log.user_id).toLowerCase().includes(query)
    );
  });

  // Get unique action types for filter
  const actionTypes = [...new Set(auditLogs.map(log => log.action_type))];

  // Stats
  const stats = {
    total: auditLogs.length,
    unread: auditLogs.filter(log => !log.is_read).length,
    warnings: auditLogs.filter(log => log.severity === 'warning').length,
    errors: auditLogs.filter(log => log.severity === 'error' || log.severity === 'critical').length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit Log</h1>
            <p className="text-muted-foreground">System activity and security events</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={stats.unread === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Eye className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                  <p className="text-xs text-muted-foreground">Unread</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.warnings}</p>
                  <p className="text-xs text-muted-foreground">Warnings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Shield className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.errors}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log List */}
        <Card className="glass">
          <CardHeader>
            <CardTitle>Event Log</CardTitle>
            <CardDescription>
              {filteredLogs.length} events {searchQuery && `matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
                <p className="text-sm">Events will appear here when system activity occurs</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-lg transition-colors cursor-pointer',
                        log.is_read ? 'bg-muted/30' : 'bg-muted/50 border-l-4 border-primary',
                        'hover:bg-muted'
                      )}
                      onClick={() => {
                        setSelectedLog(log);
                        if (!log.is_read) {
                          markAsReadMutation.mutate(log.id);
                        }
                      }}
                    >
                      <div className={cn(
                        'p-2 rounded-lg',
                        log.severity === 'error' || log.severity === 'critical' 
                          ? 'bg-destructive/10' 
                          : log.severity === 'warning'
                            ? 'bg-warning/10'
                            : 'bg-muted'
                      )}>
                        {getActionIcon(log.action_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium capitalize">
                              {log.action_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {log.entity_type && (
                                <span className="capitalize">{log.entity_type} • </span>
                              )}
                              {getUserName(log.user_id)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {getSeverityBadge(log.severity)}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Log Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 capitalize">
                {selectedLog && getActionIcon(selectedLog.action_type)}
                {selectedLog?.action_type.replace(/_/g, ' ')}
              </DialogTitle>
              <DialogDescription>
                Event details and metadata
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Severity</Label>
                    <div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Timestamp</Label>
                    <p className="mt-1 text-sm">
                      {format(new Date(selectedLog.created_at), 'MMM d, yyyy h:mm:ss a')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">User</Label>
                    <p className="mt-1 text-sm font-medium">{getUserName(selectedLog.user_id)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Entity Type</Label>
                    <p className="mt-1 text-sm capitalize">{selectedLog.entity_type || 'N/A'}</p>
                  </div>
                </div>

                {selectedLog.entity_id && (
                  <div>
                    <Label className="text-muted-foreground">Entity ID</Label>
                    <p className="mt-1 text-sm font-mono text-xs bg-muted p-2 rounded">
                      {selectedLog.entity_id}
                    </p>
                  </div>
                )}

                {selectedLog.ip_address && (
                  <div>
                    <Label className="text-muted-foreground">IP Address</Label>
                    <p className="mt-1 text-sm font-mono">{selectedLog.ip_address}</p>
                  </div>
                )}

                {selectedLog.metadata && Object.keys(selectedLog.metadata as object).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Metadata</Label>
                    <pre className="mt-1 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <Label className="text-muted-foreground">User Agent</Label>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AuditLogPage;
