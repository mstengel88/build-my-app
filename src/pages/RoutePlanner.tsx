import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation, calculateDistance, formatDistance } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MapPin,
  Navigation,
  Route,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  ArrowRight,
  GripVertical,
  Snowflake,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteStop {
  id: string;
  name: string;
  address: string;
  priority: string;
  serviceType: string;
  distance: number | null;
  latitude: number | null;
  longitude: number | null;
  completed: boolean;
  order: number;
}

const RoutePlanner = () => {
  const { position, loading: gpsLoading, getPosition } = useGeolocation();
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [completedStops, setCompletedStops] = useState<Set<string>>(new Set());

  // Fetch accounts using secure view (masks contact info for non-admin/manager roles)
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['routeAccounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts_secure')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's completed work logs
  const { data: todayLogs = [] } = useQuery({
    queryKey: ['todayRouteLogs'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('work_logs')
        .select('account_id')
        .gte('check_in_time', today.toISOString());
      
      if (error) throw error;
      return data.map(log => log.account_id);
    },
    refetchInterval: 30000,
  });

  // Calculate distances and prepare stops
  const availableStops = useMemo(() => {
    return accounts
      .filter(account => {
        if (selectedServiceType !== 'all' && account.service_type !== selectedServiceType && account.service_type !== 'both') {
          return false;
        }
        if (selectedPriority !== 'all' && account.priority !== selectedPriority) {
          return false;
        }
        return true;
      })
      .map((account, index) => {
        let distance: number | null = null;
        if (position && account.latitude && account.longitude) {
          distance = calculateDistance(
            position.latitude,
            position.longitude,
            account.latitude,
            account.longitude
          );
        }
        return {
          id: account.id,
          name: account.name,
          address: account.address,
          priority: account.priority || 'normal',
          serviceType: account.service_type || 'both',
          distance,
          latitude: account.latitude,
          longitude: account.longitude,
          completed: todayLogs.includes(account.id),
          order: index,
        };
      })
      .sort((a, b) => {
        // Priority sorting: high > normal > low
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Then by distance if available
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        return 0;
      });
  }, [accounts, position, selectedServiceType, selectedPriority, todayLogs]);

  // Optimize route using nearest neighbor algorithm
  const optimizeRoute = () => {
    if (!position || availableStops.length === 0) return;

    const unvisited = [...availableStops.filter(s => !s.completed)];
    const optimized: RouteStop[] = [];
    let currentLat = position.latitude;
    let currentLng = position.longitude;

    // High priority stops first
    const highPriority = unvisited.filter(s => s.priority === 'high');
    const others = unvisited.filter(s => s.priority !== 'high');

    // Sort high priority by distance
    const sortByDistance = (stops: RouteStop[], lat: number, lng: number) => {
      return [...stops].sort((a, b) => {
        if (!a.latitude || !a.longitude) return 1;
        if (!b.latitude || !b.longitude) return -1;
        const distA = calculateDistance(lat, lng, a.latitude, a.longitude);
        const distB = calculateDistance(lat, lng, b.latitude, b.longitude);
        return distA - distB;
      });
    };

    // Add high priority stops first, sorted by distance
    const sortedHigh = sortByDistance(highPriority, currentLat, currentLng);
    for (const stop of sortedHigh) {
      optimized.push({ ...stop, order: optimized.length });
      if (stop.latitude && stop.longitude) {
        currentLat = stop.latitude;
        currentLng = stop.longitude;
      }
    }

    // Then add remaining stops using nearest neighbor
    let remaining = [...others];
    while (remaining.length > 0) {
      const sorted = sortByDistance(remaining, currentLat, currentLng);
      const nearest = sorted[0];
      optimized.push({ ...nearest, order: optimized.length });
      
      if (nearest.latitude && nearest.longitude) {
        currentLat = nearest.latitude;
        currentLng = nearest.longitude;
      }
      remaining = remaining.filter(s => s.id !== nearest.id);
    }

    setRouteStops(optimized);
    setIsRouteActive(true);
  };

  const handleStopComplete = (stopId: string) => {
    setCompletedStops(prev => {
      const next = new Set(prev);
      if (next.has(stopId)) {
        next.delete(stopId);
      } else {
        next.add(stopId);
      }
      return next;
    });
  };

  const resetRoute = () => {
    setRouteStops([]);
    setIsRouteActive(false);
    setCompletedStops(new Set());
  };

  const totalDistance = useMemo(() => {
    if (routeStops.length === 0 || !position) return null;
    
    let total = 0;
    let prevLat = position.latitude;
    let prevLng = position.longitude;

    for (const stop of routeStops) {
      if (stop.latitude && stop.longitude) {
        total += calculateDistance(prevLat, prevLng, stop.latitude, stop.longitude);
        prevLat = stop.latitude;
        prevLng = stop.longitude;
      }
    }
    return total;
  }, [routeStops, position]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> High</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const stopsToDisplay = isRouteActive ? routeStops : availableStops;
  const incompleteStops = stopsToDisplay.filter(s => !s.completed && !completedStops.has(s.id));
  const completedStopsCount = stopsToDisplay.filter(s => s.completed || completedStops.has(s.id)).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Route Planner</h1>
            <p className="text-muted-foreground">Optimize your service route</p>
          </div>
          <div className="flex items-center gap-2">
            {!position ? (
              <Button onClick={() => getPosition()} disabled={gpsLoading}>
                <Navigation className="h-4 w-4 mr-2" />
                {gpsLoading ? 'Getting Location...' : 'Get Location'}
              </Button>
            ) : (
              <Badge variant="outline" className="gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                GPS Active
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{incompleteStops.length}</p>
                  <p className="text-xs text-muted-foreground">Stops Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedStopsCount}</p>
                  <p className="text-xs text-muted-foreground">Completed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Route className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {totalDistance ? formatDistance(totalDistance) : '--'}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Distance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Clock className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {incompleteStops.length > 0 ? `~${Math.round(incompleteStops.length * 15)}` : '0'}
                  </p>
                  <p className="text-xs text-muted-foreground">Est. Minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Filters & Controls */}
          <Card className="glass lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Route Options
              </CardTitle>
              <CardDescription>Filter and optimize your route</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="plowing">Plowing Only</SelectItem>
                    <SelectItem value="shoveling">Shoveling Only</SelectItem>
                    <SelectItem value="both">Both Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 space-y-2">
                {!isRouteActive ? (
                  <Button 
                    onClick={optimizeRoute} 
                    className="w-full"
                    disabled={!position || availableStops.length === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Optimize Route
                  </Button>
                ) : (
                  <Button onClick={resetRoute} variant="outline" className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Route
                  </Button>
                )}
              </div>

              {isRouteActive && (
                <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-2 text-success mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Route Optimized</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {routeStops.length} stops organized by priority and distance
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Route List */}
          <Card className="glass lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                {isRouteActive ? 'Optimized Route' : 'Available Stops'}
              </CardTitle>
              <CardDescription>
                {isRouteActive 
                  ? 'Follow this order for optimal efficiency' 
                  : 'Select filters and optimize your route'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stopsToDisplay.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No stops match your filters</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {stopsToDisplay.map((stop, index) => {
                      const isCompleted = stop.completed || completedStops.has(stop.id);
                      const isNext = isRouteActive && !isCompleted && index === stopsToDisplay.findIndex(s => !s.completed && !completedStops.has(s.id));
                      
                      return (
                        <div
                          key={stop.id}
                          className={cn(
                            'flex items-start gap-3 p-4 rounded-lg transition-all',
                            isCompleted 
                              ? 'bg-muted/30 opacity-60' 
                              : isNext 
                                ? 'bg-primary/10 border-2 border-primary' 
                                : 'bg-muted/50 hover:bg-muted'
                          )}
                        >
                          {isRouteActive && (
                            <div className="flex flex-col items-center gap-1 pt-1">
                              <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                                isCompleted 
                                  ? 'bg-success text-success-foreground' 
                                  : isNext 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-muted-foreground/20 text-muted-foreground'
                              )}>
                                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                              </div>
                              {index < stopsToDisplay.length - 1 && (
                                <div className="w-0.5 h-8 bg-border" />
                              )}
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={cn(
                                  'font-medium',
                                  isCompleted && 'line-through'
                                )}>
                                  {stop.name}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {stop.address}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {getPriorityBadge(stop.priority)}
                                {stop.distance !== null && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistance(stop.distance)}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="secondary" className="gap-1">
                                {stop.serviceType === 'plowing' && <Truck className="h-3 w-3" />}
                                {stop.serviceType === 'shoveling' && <Snowflake className="h-3 w-3" />}
                                {stop.serviceType === 'both' && <><Truck className="h-3 w-3" /><Snowflake className="h-3 w-3" /></>}
                                {stop.serviceType}
                              </Badge>
                              
                              {isRouteActive && !stop.completed && (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`complete-${stop.id}`}
                                    checked={completedStops.has(stop.id)}
                                    onCheckedChange={() => handleStopComplete(stop.id)}
                                  />
                                  <Label 
                                    htmlFor={`complete-${stop.id}`}
                                    className="text-sm cursor-pointer"
                                  >
                                    Mark Complete
                                  </Label>
                                </div>
                              )}
                              
                              {stop.completed && (
                                <Badge variant="outline" className="gap-1 text-success border-success">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Serviced Today
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default RoutePlanner;
