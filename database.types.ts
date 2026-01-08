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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          password_hash: string
          phone: string | null
          region_id: number | null
          role: string
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          password_hash: string
          phone?: string | null
          region_id?: number | null
          role: string
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          password_hash?: string
          phone?: string | null
          region_id?: number | null
          role?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          uploaded_at: string | null
        }
        Insert: {
          announcement_id: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          uploaded_at?: string | null
        }
        Update: {
          announcement_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_views: {
        Row: {
          announcement_id: string | null
          id: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          announcement_id?: string | null
          id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          announcement_id?: string | null
          id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_important: boolean | null
          is_published: boolean | null
          target_region_id: number | null
          target_type: string
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_important?: boolean | null
          is_published?: boolean | null
          target_region_id?: number | null
          target_type: string
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_important?: boolean | null
          is_published?: boolean | null
          target_region_id?: number | null
          target_type?: string
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_region_id_fkey"
            columns: ["target_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          created_at: string | null
          date: string
          id: number
          reason: string | null
          region_id: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: number
          reason?: string | null
          region_id?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: number
          reason?: string | null
          region_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string | null
          id: number
          name: string
          region_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          region_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          region_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reservation_limits: {
        Row: {
          created_at: string | null
          date: string
          id: number
          max_reservations: number
          region_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: number
          max_reservations?: number
          region_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: number
          max_reservations?: number
          region_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reservation_limits_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_popups: {
        Row: {
          author_id: string
          content: string
          content_type: string | null
          created_at: string | null
          display_order: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          content_type?: string | null
          created_at?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          content_type?: string | null
          created_at?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_popups_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      member_tiers: {
        Row: {
          advance_reservation_days: number | null
          created_at: string | null
          daily_slot_limit: number | null
          description: string | null
          id: number
          is_active: boolean | null
          monthly_reservation_limit: number | null
          tier_level: number
          tier_name: string
          updated_at: string | null
        }
        Insert: {
          advance_reservation_days?: number | null
          created_at?: string | null
          daily_slot_limit?: number | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          monthly_reservation_limit?: number | null
          tier_level: number
          tier_name: string
          updated_at?: string | null
        }
        Update: {
          advance_reservation_days?: number | null
          created_at?: string | null
          daily_slot_limit?: number | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          monthly_reservation_limit?: number | null
          tier_level?: number
          tier_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string
          id: number
          name: string
        }
        Insert: {
          code: string
          id?: number
          name: string
        }
        Update: {
          code?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      reservation_logs: {
        Row: {
          changed_by: string | null
          changed_by_type: string | null
          created_at: string | null
          id: number
          new_status: string | null
          old_status: string | null
          reason: string | null
          reservation_id: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_type?: string | null
          created_at?: string | null
          id?: number
          new_status?: string | null
          old_status?: string | null
          reason?: string | null
          reservation_id?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_type?: string | null
          created_at?: string | null
          id?: number
          new_status?: string | null
          old_status?: string | null
          reason?: string | null
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_settings: {
        Row: {
          created_at: string | null
          id: number
          is_open: boolean | null
          max_days_per_month: number | null
          max_reservations_per_day: number | null
          month: number
          region_id: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_open?: boolean | null
          max_days_per_month?: number | null
          max_reservations_per_day?: number | null
          month: number
          region_id?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: number
          is_open?: boolean | null
          max_days_per_month?: number | null
          max_reservations_per_day?: number | null
          month?: number
          region_id?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservation_settings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_slots: {
        Row: {
          created_at: string | null
          end_time: string
          grade: string
          id: string
          location: string
          participant_count: number
          reservation_id: string | null
          slot_order: number
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          grade: string
          id?: string
          location: string
          participant_count: number
          reservation_id?: string | null
          slot_order: number
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          grade?: string
          id?: string
          location?: string
          participant_count?: number
          reservation_id?: string | null
          slot_order?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_slots_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_transactions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          failure_reason: string | null
          id: number
          reservation_date: string
          status: string | null
          time_slot: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          failure_reason?: string | null
          id?: number
          reservation_date: string
          status?: string | null
          time_slot: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          failure_reason?: string | null
          id?: number
          reservation_date?: string
          status?: string | null
          time_slot?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string | null
          date: string
          id: string
          region_id: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          region_id?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          region_id?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_reservation_settings: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: number
          is_open: boolean | null
          region_code: string
          reservation_start_date: string | null
          tier_id: number | null
          updated_at: string | null
          year_month: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_open?: boolean | null
          region_code: string
          reservation_start_date?: string | null
          tier_id?: number | null
          updated_at?: string | null
          year_month: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: number
          is_open?: boolean | null
          region_code?: string
          reservation_start_date?: string | null
          tier_id?: number | null
          updated_at?: string | null
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_reservation_settings_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "member_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: number
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: number
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions_backup: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: number | null
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: number | null
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: number | null
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          city_id: number
          class_count: number | null
          created_at: string | null
          email: string
          id: string
          manager_name: string
          organization_name: string
          password_hash: string
          phone: string
          privacy_consent: boolean
          status: string | null
          student_count: number | null
          tier: string | null
          tier_id: number | null
          updated_at: string | null
        }
        Insert: {
          city_id: number
          class_count?: number | null
          created_at?: string | null
          email: string
          id?: string
          manager_name: string
          organization_name: string
          password_hash: string
          phone: string
          privacy_consent?: boolean
          status?: string | null
          student_count?: number | null
          tier?: string | null
          tier_id?: number | null
          updated_at?: string | null
        }
        Update: {
          city_id?: number
          class_count?: number | null
          created_at?: string | null
          email?: string
          id?: string
          manager_name?: string
          organization_name?: string
          password_hash?: string
          phone?: string
          privacy_consent?: boolean
          status?: string | null
          student_count?: number | null
          tier?: string | null
          tier_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "member_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_details: {
        Row: {
          city_name: string | null
          created_at: string | null
          email: string | null
          id: string | null
          manager_name: string | null
          organization_name: string | null
          phone: string | null
          region_code: string | null
          region_name: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_user_tier: {
        Args: { p_class_count: number; p_student_count: number }
        Returns: string
      }
      check_daily_reservation_limit: {
        Args: {
          p_date: string
          p_max_reservations_per_day?: number
          p_region_id: number
          p_user_id: string
        }
        Returns: Json
      }
      check_user_monthly_limit: {
        Args: {
          p_max_days_per_month?: number
          p_month: number
          p_user_id: string
          p_year: number
        }
        Returns: Json
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      count_announcement_attachments: {
        Args: { p_announcement_id: string }
        Returns: number
      }
      get_daily_reservation_count: {
        Args: { target_date: string; target_region_id: number }
        Returns: number
      }
      get_user_monthly_reservation_count: {
        Args: { target_month: number; target_year: number; user_uuid: string }
        Returns: number
      }
      increment_view_count: {
        Args: { announcement_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
