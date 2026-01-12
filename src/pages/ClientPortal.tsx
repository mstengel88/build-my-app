import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CloudSnow,
  Clock,
  FileText,
  MessageSquare,
  CheckCircle2,
  Loader2,
  LogOut,
  Bell,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const ClientPortal = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Fetch client's account
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['clientAccount', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('client_user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch service history
  const { data: workLogs = [] } = useQuery({
    queryKey: ['clientWorkLogs', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      
      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('account_id', account.id)
        .order('check_in_time', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!account?.id,
  });

  // Fetch shovel logs
  const { data: shovelLogs = [] } = useQuery({
    queryKey: ['clientShovelLogs', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      
      const { data, error } = await supabase
        .from('shovel_work_logs')
        .select('*')
        .eq('account_id', account.id)
        .order('check_in_time', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!account?.id,
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['clientInvoices', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!account?.id,
  });

  // Fetch service requests
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ['clientServiceRequests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('requested_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const allServices = [...workLogs, ...shovelLogs].sort(
    (a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime()
  );

  if (accountLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="glass max-w-md w-full">
          <CardHeader className="text-center">
            <CloudSnow className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Account Not Found</CardTitle>
            <CardDescription>
              Your account is not linked to a property yet. Please contact your service provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <CloudSnow className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-bold text-foreground">Client Portal</h1>
              <p className="text-xs text-muted-foreground">{account.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4 max-w-4xl">
        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{allServices.length}</p>
                  <p className="text-xs text-muted-foreground">Total Services</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-info" />
                <div>
                  <p className="text-2xl font-bold">
                    {allServices[0] ? format(new Date(allServices[0].check_in_time), 'M/d') : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Service</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                  <p className="text-xs text-muted-foreground">Invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{serviceRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="services" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Service History</CardTitle>
                <CardDescription>
                  Recent snow removal services at your property
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {allServices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No services recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {allServices.map((service: any) => (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-accent/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {format(new Date(service.check_in_time), 'MMM d, yyyy')}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(service.check_in_time), 'h:mm a')} - 
                                {service.check_out_time && format(new Date(service.check_out_time), ' h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="capitalize">
                              {service.service_type}
                            </Badge>
                            {service.duration_minutes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.duration_minutes} min
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>View and download your invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {invoices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No invoices yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((invoice: any) => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-accent/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning/10">
                              <DollarSign className="h-4 w-4 text-warning" />
                            </div>
                            <div>
                              <p className="font-medium">{invoice.invoice_number}</p>
                              <p className="text-sm text-muted-foreground">
                                Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${Number(invoice.amount).toFixed(2)}</p>
                            <Badge
                              variant={
                                invoice.status === 'paid' ? 'default' :
                                invoice.status === 'overdue' ? 'destructive' : 'outline'
                              }
                              className="capitalize"
                            >
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Service Requests</CardTitle>
                  <CardDescription>Submit and track service requests</CardDescription>
                </div>
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {serviceRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No requests submitted yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {serviceRequests.map((request: any) => (
                        <div
                          key={request.id}
                          className="p-4 rounded-lg bg-accent/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">
                              {request.request_type.replace('_', ' ')}
                            </Badge>
                            <Badge
                              variant={
                                request.status === 'completed' ? 'default' :
                                request.status === 'pending' ? 'outline' : 'secondary'
                              }
                              className="capitalize"
                            >
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm">{request.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Your property information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Property Name</Label>
                  <p className="font-medium">{account.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">
                    {account.address}
                    {account.city && `, ${account.city}`}
                    {account.state && `, ${account.state}`}
                    {account.zip && ` ${account.zip}`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Contact Name</Label>
                    <p className="font-medium">{account.contact_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact Phone</Label>
                    <p className="font-medium">{account.contact_phone || '-'}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service Type</Label>
                  <Badge className="capitalize mt-1">{account.service_type}</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Need to import Label
const Label = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm ${className}`}>{children}</p>
);

export default ClientPortal;
