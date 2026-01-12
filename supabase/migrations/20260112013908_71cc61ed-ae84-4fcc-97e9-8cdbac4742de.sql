-- Snow Tracker Database Schema

-- 1. Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'driver', 'shovel_crew', 'client');

-- 2. Create user_roles table (CRITICAL: roles stored separately for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create employees table
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'driver', -- driver, operator, supervisor, mechanic, other
    category TEXT NOT NULL DEFAULT 'plow', -- plow or shovel
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive
    hire_date DATE,
    allowed_pages TEXT[], -- Page access restrictions
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create accounts (customers/properties) table
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    status TEXT DEFAULT 'active', -- active, inactive
    service_type TEXT DEFAULT 'both', -- plowing, shovel, both
    notes TEXT,
    client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to client portal user
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create equipment table
CREATE TABLE public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- plow_truck, salt_truck, skid_steer, atv, semi, box_truck, loader, trailer
    license_plate TEXT,
    vin TEXT,
    year INTEGER,
    make TEXT,
    model TEXT,
    category TEXT NOT NULL DEFAULT 'operational', -- operational, maintenance_only
    service_capability TEXT NOT NULL DEFAULT 'both', -- plow, salter, both
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, maintenance
    maintenance_interval_days INTEGER DEFAULT 90,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create time_clock table
CREATE TABLE public.time_clock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    clock_in_latitude DOUBLE PRECISION,
    clock_in_longitude DOUBLE PRECISION,
    clock_out_latitude DOUBLE PRECISION,
    clock_out_longitude DOUBLE PRECISION,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Create work_logs table (plow/salt services)
CREATE TABLE public.work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT NOT NULL, -- plow, salt, both
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    snow_depth DECIMAL(4,1),
    salt_used DECIMAL(6,1),
    temperature DECIMAL(5,1),
    weather_description TEXT,
    wind_speed TEXT,
    notes TEXT,
    photo_url TEXT,
    geofence_event_id UUID, -- Link to geofence event
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Create work_log_employees junction table
CREATE TABLE public.work_log_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_log_id UUID REFERENCES public.work_logs(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (work_log_id, employee_id)
);

-- 10. Create work_log_equipment junction table
CREATE TABLE public.work_log_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_log_id UUID REFERENCES public.work_logs(id) ON DELETE CASCADE NOT NULL,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (work_log_id, equipment_id)
);

-- 11. Create shovel_work_logs table
CREATE TABLE public.shovel_work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT NOT NULL, -- shovel, salt, both
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    snow_depth DECIMAL(4,1),
    salt_used DECIMAL(6,1),
    temperature DECIMAL(5,1),
    weather_description TEXT,
    wind_speed TEXT,
    notes TEXT,
    photo_url TEXT,
    geofence_event_id UUID,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. Create shovel_work_log_employees junction table
CREATE TABLE public.shovel_work_log_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shovel_work_log_id UUID REFERENCES public.shovel_work_logs(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (shovel_work_log_id, employee_id)
);

-- 13. Create geofence_events table
CREATE TABLE public.geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL, -- check_in, check_out
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    work_log_id UUID, -- Link to work log when completed
    shovel_work_log_id UUID, -- Link to shovel work log when completed
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 14. Create invoices table
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    due_date DATE NOT NULL,
    paid_date DATE,
    notes TEXT,
    line_items JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 15. Create service_requests table
CREATE TABLE public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL, -- new_service, schedule_change, complaint, other
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    description TEXT NOT NULL,
    response TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 16. Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general', -- service_scheduled, urgent, weather_alert, general
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 17. Create maintenance_logs table
CREATE TABLE public.maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE NOT NULL,
    maintenance_type TEXT NOT NULL, -- routine, repair, inspection, other
    description TEXT NOT NULL,
    cost DECIMAL(10,2),
    performed_by TEXT,
    performed_date DATE NOT NULL,
    next_due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 18. Create weather_forecasts table
CREATE TABLE public.weather_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date DATE NOT NULL,
    temperature_high DECIMAL(5,1),
    temperature_low DECIMAL(5,1),
    snow_chance INTEGER, -- percentage
    snow_amount_min DECIMAL(4,1),
    snow_amount_max DECIMAL(4,1),
    description TEXT,
    alerts TEXT[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 19. Create audit_logs table (super admin only)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL, -- login, create, update, delete, notification, report, etc.
    entity_type TEXT, -- table/entity name
    entity_id UUID,
    severity TEXT NOT NULL DEFAULT 'info', -- info, warning, critical
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 20. Create backups table
CREATE TABLE public.backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_size_bytes BIGINT,
    entity_counts JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 21. Create settings table
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_log_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_log_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shovel_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shovel_work_log_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is staff (admin, manager, driver, shovel_crew)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager', 'driver', 'shovel_crew')
  )
$$;

-- Create function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Create function to get user's employee_id
CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies

-- User Roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_staff(auth.uid()));

-- Employees policies
CREATE POLICY "Staff can view all employees" ON public.employees
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin/Manager can manage employees" ON public.employees
    FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Accounts policies
CREATE POLICY "Staff can view all accounts" ON public.accounts
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Clients can view their own account" ON public.accounts
    FOR SELECT USING (auth.uid() = client_user_id);

CREATE POLICY "Admin/Manager can manage accounts" ON public.accounts
    FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Equipment policies
CREATE POLICY "Staff can view all equipment" ON public.equipment
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin/Manager can manage equipment" ON public.equipment
    FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Time Clock policies
CREATE POLICY "Staff can view all time clock entries" ON public.time_clock
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert time clock entries" ON public.time_clock
    FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update their own time clock entries" ON public.time_clock
    FOR UPDATE USING (
        employee_id = public.get_employee_id(auth.uid()) 
        OR public.is_admin_or_manager(auth.uid())
    );

-- Work Logs policies
CREATE POLICY "Staff can view all work logs" ON public.work_logs
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Clients can view their account work logs" ON public.work_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = work_logs.account_id 
            AND client_user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can insert work logs" ON public.work_logs
    FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update work logs" ON public.work_logs
    FOR UPDATE USING (
        created_by = auth.uid() 
        OR public.is_admin_or_manager(auth.uid())
    );

CREATE POLICY "Admin can delete work logs" ON public.work_logs
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Work Log Employees policies
CREATE POLICY "Staff can view work log employees" ON public.work_log_employees
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage work log employees" ON public.work_log_employees
    FOR ALL USING (public.is_staff(auth.uid()));

-- Work Log Equipment policies
CREATE POLICY "Staff can view work log equipment" ON public.work_log_equipment
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage work log equipment" ON public.work_log_equipment
    FOR ALL USING (public.is_staff(auth.uid()));

-- Shovel Work Logs policies
CREATE POLICY "Staff can view all shovel work logs" ON public.shovel_work_logs
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Clients can view their account shovel work logs" ON public.shovel_work_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = shovel_work_logs.account_id 
            AND client_user_id = auth.uid()
        )
    );

CREATE POLICY "Staff can insert shovel work logs" ON public.shovel_work_logs
    FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update shovel work logs" ON public.shovel_work_logs
    FOR UPDATE USING (
        created_by = auth.uid() 
        OR public.is_admin_or_manager(auth.uid())
    );

CREATE POLICY "Admin can delete shovel work logs" ON public.shovel_work_logs
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Shovel Work Log Employees policies
CREATE POLICY "Staff can view shovel work log employees" ON public.shovel_work_log_employees
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can manage shovel work log employees" ON public.shovel_work_log_employees
    FOR ALL USING (public.is_staff(auth.uid()));

-- Geofence Events policies
CREATE POLICY "Staff can view all geofence events" ON public.geofence_events
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert geofence events" ON public.geofence_events
    FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update their own geofence events" ON public.geofence_events
    FOR UPDATE USING (
        employee_id = public.get_employee_id(auth.uid()) 
        OR public.is_admin_or_manager(auth.uid())
    );

-- Invoices policies
CREATE POLICY "Admin/Manager can view all invoices" ON public.invoices
    FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Clients can view their account invoices" ON public.invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = invoices.account_id 
            AND client_user_id = auth.uid()
        )
    );

CREATE POLICY "Admin/Manager can manage invoices" ON public.invoices
    FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Service Requests policies
CREATE POLICY "Admin/Manager can view all service requests" ON public.service_requests
    FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Clients can view their own service requests" ON public.service_requests
    FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "Clients can create service requests" ON public.service_requests
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.accounts 
            WHERE id = service_requests.account_id 
            AND client_user_id = auth.uid()
        )
    );

CREATE POLICY "Admin/Manager can manage service requests" ON public.service_requests
    FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can create notifications for anyone" ON public.notifications
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Maintenance Logs policies
CREATE POLICY "Staff can view maintenance logs" ON public.maintenance_logs
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin/Manager can manage maintenance logs" ON public.maintenance_logs
    FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Weather Forecasts policies
CREATE POLICY "Staff can view weather forecasts" ON public.weather_forecasts
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin/Manager can manage weather forecasts" ON public.weather_forecasts
    FOR ALL USING (public.is_admin_or_manager(auth.uid()));

-- Audit Logs policies (super admin only - matthewstengel69@gmail.com)
CREATE POLICY "Super admin can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND email = 'matthewstengel69@gmail.com'
        )
    );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can update audit logs" ON public.audit_logs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND email = 'matthewstengel69@gmail.com'
        )
    );

-- Backups policies
CREATE POLICY "Admin can view backups" ON public.backups
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage backups" ON public.backups
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Settings policies
CREATE POLICY "Staff can view settings" ON public.settings
    FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "Admin can manage settings" ON public.settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$;

-- Create trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_logs_updated_at BEFORE UPDATE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shovel_work_logs_updated_at BEFORE UPDATE ON public.shovel_work_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weather_forecasts_updated_at BEFORE UPDATE ON public.weather_forecasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('work-photos', 'work-photos', true);

-- Storage policies for work photos
CREATE POLICY "Anyone can view work photos" ON storage.objects FOR SELECT USING (bucket_id = 'work-photos');
CREATE POLICY "Authenticated users can upload work photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'work-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'work-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admin can delete photos" ON storage.objects FOR DELETE USING (bucket_id = 'work-photos' AND public.has_role(auth.uid(), 'admin'));