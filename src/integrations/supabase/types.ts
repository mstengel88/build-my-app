export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          address: string
          city: string | null
          client_user_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          priority: string | null
          service_type: string | null
          state: string | null
          status: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address: string
          city?: string | null
          client_user_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          priority?: string | null
          service_type?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string
          city?: string | null
          client_user_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          priority?: string | null
          service_type?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          is_read: boolean
          metadata: Json | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          is_read?: boolean
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          is_read?: boolean
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backups: {
        Row: {
          created_at: string
          created_by: string | null
          entity_counts: Json | null
          file_size_bytes: number | null
          filename: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_counts?: Json | null
          file_size_bytes?: number | null
          filename: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_counts?: Json | null
          file_size_bytes?: number | null
          filename?: string
          id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          allowed_pages: string[] | null
          category: string
          created_at: string
          email: string | null
          hire_date: string | null
          id: string
          name: string
          phone: string | null
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allowed_pages?: string[] | null
          category?: string
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allowed_pages?: string[] | null
          category?: string
          created_at?: string
          email?: string | null
          hire_date?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          category: string
          created_at: string
          id: string
          last_maintenance_date: string | null
          license_plate: string | null
          maintenance_interval_days: number | null
          make: string | null
          model: string | null
          name: string
          next_maintenance_date: string | null
          notes: string | null
          service_capability: string
          status: string
          type: string
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          last_maintenance_date?: string | null
          license_plate?: string | null
          maintenance_interval_days?: number | null
          make?: string | null
          model?: string | null
          name: string
          next_maintenance_date?: string | null
          notes?: string | null
          service_capability?: string
          status?: string
          type: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          last_maintenance_date?: string | null
          license_plate?: string | null
          maintenance_interval_days?: number | null
          make?: string | null
          model?: string | null
          name?: string
          next_maintenance_date?: string | null
          notes?: string | null
          service_capability?: string
          status?: string
          type?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
      geofence_events: {
        Row: {
          account_id: string
          accuracy: number | null
          created_at: string
          employee_id: string
          event_type: string
          id: string
          latitude: number
          longitude: number
          shovel_work_log_id: string | null
          timestamp: string
          work_log_id: string | null
        }
        Insert: {
          account_id: string
          accuracy?: number | null
          created_at?: string
          employee_id: string
          event_type: string
          id?: string
          latitude: number
          longitude: number
          shovel_work_log_id?: string | null
          timestamp?: string
          work_log_id?: string | null
        }
        Update: {
          account_id?: string
          accuracy?: number | null
          created_at?: string
          employee_id?: string
          event_type?: string
          id?: string
          latitude?: number
          longitude?: number
          shovel_work_log_id?: string | null
          timestamp?: string
          work_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "geofence_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          invoice_number: string
          line_items: Json | null
          notes: string | null
          paid_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          invoice_number: string
          line_items?: Json | null
          notes?: string | null
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          paid_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          cost: number | null
          created_at: string
          description: string
          equipment_id: string
          id: string
          maintenance_type: string
          next_due_date: string | null
          notes: string | null
          performed_by: string | null
          performed_date: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description: string
          equipment_id: string
          id?: string
          maintenance_type: string
          next_due_date?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_date: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string
          equipment_id?: string
          id?: string
          maintenance_type?: string
          next_due_date?: string | null
          notes?: string | null
          performed_by?: string | null
          performed_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_super_admin: boolean
          notification_preferences: Json | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_super_admin?: boolean
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_super_admin?: boolean
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          request_type: string
          requested_by: string | null
          response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          request_type: string
          requested_by?: string | null
          response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          request_type?: string
          requested_by?: string | null
          response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      shovel_work_log_employees: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          shovel_work_log_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          shovel_work_log_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          shovel_work_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shovel_work_log_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shovel_work_log_employees_shovel_work_log_id_fkey"
            columns: ["shovel_work_log_id"]
            isOneToOne: false
            referencedRelation: "shovel_work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      shovel_work_logs: {
        Row: {
          account_id: string
          check_in_time: string
          check_out_time: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          geofence_event_id: string | null
          id: string
          notes: string | null
          photo_url: string | null
          salt_used: number | null
          service_type: string
          snow_depth: number | null
          temperature: number | null
          updated_at: string
          weather_description: string | null
          wind_speed: string | null
        }
        Insert: {
          account_id: string
          check_in_time: string
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          geofence_event_id?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          salt_used?: number | null
          service_type: string
          snow_depth?: number | null
          temperature?: number | null
          updated_at?: string
          weather_description?: string | null
          wind_speed?: string | null
        }
        Update: {
          account_id?: string
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          geofence_event_id?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          salt_used?: number | null
          service_type?: string
          snow_depth?: number | null
          temperature?: number | null
          updated_at?: string
          weather_description?: string | null
          wind_speed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shovel_work_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shovel_work_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock: {
        Row: {
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_in_time: string
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          clock_out_time: string | null
          created_at: string
          duration_minutes: number | null
          employee_id: string
          id: string
          notes: string | null
        }
        Insert: {
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_time: string
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_time?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_time?: string
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_time?: string | null
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weather_forecasts: {
        Row: {
          alerts: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          forecast_date: string
          id: string
          snow_amount_max: number | null
          snow_amount_min: number | null
          snow_chance: number | null
          temperature_high: number | null
          temperature_low: number | null
          updated_at: string
        }
        Insert: {
          alerts?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          forecast_date: string
          id?: string
          snow_amount_max?: number | null
          snow_amount_min?: number | null
          snow_chance?: number | null
          temperature_high?: number | null
          temperature_low?: number | null
          updated_at?: string
        }
        Update: {
          alerts?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          forecast_date?: string
          id?: string
          snow_amount_max?: number | null
          snow_amount_min?: number | null
          snow_chance?: number | null
          temperature_high?: number | null
          temperature_low?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      work_log_employees: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          work_log_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          work_log_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          work_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_log_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_log_employees_work_log_id_fkey"
            columns: ["work_log_id"]
            isOneToOne: false
            referencedRelation: "work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      work_log_equipment: {
        Row: {
          created_at: string
          equipment_id: string
          id: string
          work_log_id: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          id?: string
          work_log_id: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          id?: string
          work_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_log_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_log_equipment_work_log_id_fkey"
            columns: ["work_log_id"]
            isOneToOne: false
            referencedRelation: "work_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      work_logs: {
        Row: {
          account_id: string
          check_in_time: string
          check_out_time: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          geofence_event_id: string | null
          id: string
          notes: string | null
          photo_url: string | null
          salt_used: number | null
          service_type: string
          snow_depth: number | null
          temperature: number | null
          updated_at: string
          weather_description: string | null
          wind_speed: string | null
        }
        Insert: {
          account_id: string
          check_in_time: string
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          geofence_event_id?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          salt_used?: number | null
          service_type: string
          snow_depth?: number | null
          temperature?: number | null
          updated_at?: string
          weather_description?: string | null
          wind_speed?: string | null
        }
        Update: {
          account_id?: string
          check_in_time?: string
          check_out_time?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          geofence_event_id?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          salt_used?: number | null
          service_type?: string
          snow_depth?: number | null
          temperature?: number | null
          updated_at?: string
          weather_description?: string | null
          wind_speed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts_secure"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      accounts_secure: {
        Row: {
          address: string | null
          city: string | null
          client_user_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          name: string | null
          notes: string | null
          priority: string | null
          service_type: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_user_id?: string | null
          contact_email?: never
          contact_name?: never
          contact_phone?: never
          created_at?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          notes?: string | null
          priority?: string | null
          service_type?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_user_id?: string | null
          contact_email?: never
          contact_name?: never
          contact_phone?: never
          created_at?: string | null
          id?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          notes?: string | null
          priority?: string | null
          service_type?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_employee_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "driver" | "shovel_crew" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "driver", "shovel_crew", "client"],
    },
  },
} as const
