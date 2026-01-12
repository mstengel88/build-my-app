// Extended types for the Snow Tracker application
// These are additional types that complement the auto-generated types

export type AppRole = 'admin' | 'manager' | 'driver' | 'shovel_crew' | 'client';

export type EmployeeRole = 'driver' | 'operator' | 'supervisor' | 'mechanic' | 'other';
export type EmployeeCategory = 'plow' | 'shovel';
export type EmployeeStatus = 'active' | 'inactive';

export type AccountPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AccountStatus = 'active' | 'inactive';
export type ServiceType = 'plowing' | 'shovel' | 'both';

export type EquipmentType = 'plow_truck' | 'salt_truck' | 'skid_steer' | 'atv' | 'semi' | 'box_truck' | 'loader' | 'trailer';
export type EquipmentCategory = 'operational' | 'maintenance_only';
export type EquipmentServiceCapability = 'plow' | 'salter' | 'both';
export type EquipmentStatus = 'active' | 'inactive' | 'maintenance';

export type WorkLogServiceType = 'plow' | 'salt' | 'both';
export type ShovelWorkLogServiceType = 'shovel' | 'salt' | 'both';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export type ServiceRequestType = 'new_service' | 'schedule_change' | 'complaint' | 'other';
export type ServiceRequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type NotificationType = 'service_scheduled' | 'urgent' | 'weather_alert' | 'general';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type GeofenceEventType = 'check_in' | 'check_out';

export type AuditLogSeverity = 'info' | 'warning' | 'critical';

export type MaintenanceType = 'routine' | 'repair' | 'inspection' | 'other';

// Check-in state for local storage persistence
export interface CheckInState {
  isCheckedIn: boolean;
  accountId: string | null;
  accountName: string | null;
  checkInTime: string | null;
  serviceType: WorkLogServiceType | ShovelWorkLogServiceType | null;
}

// GPS Position
export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// Account with distance (for GPS sorting)
export interface AccountWithDistance {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  distance: number | null;
  service_type: string | null;
}
