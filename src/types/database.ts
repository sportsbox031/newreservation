export interface Database {
  public: {
    Tables: {
      regions: {
        Row: {
          id: number
          name: string
          code: string
        }
        Insert: {
          id?: number
          name: string
          code: string
        }
        Update: {
          id?: number
          name?: string
          code?: string
        }
      }
      cities: {
        Row: {
          id: number
          name: string
          region_id: number
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          region_id: number
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          region_id?: number
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_name: string
          password_hash: string
          manager_name: string
          city_id: number
          phone: string
          email: string
          privacy_consent: boolean
          status: 'pending' | 'approved' | 'rejected' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_name: string
          password_hash: string
          manager_name: string
          city_id: number
          phone: string
          email: string
          privacy_consent: boolean
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_name?: string
          password_hash?: string
          manager_name?: string
          city_id?: number
          phone?: string
          email?: string
          privacy_consent?: boolean
          status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      admins: {
        Row: {
          id: string
          username: string
          password_hash: string
          role: 'super' | 'south' | 'north'
          created_at: string
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          role: 'super' | 'south' | 'north'
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          role?: 'super' | 'south' | 'north'
          created_at?: string
        }
      }
      reservation_settings: {
        Row: {
          id: number
          region_id: number
          year: number
          month: number
          is_open: boolean
          max_reservations_per_day: number
          max_days_per_month: number
          created_at: string
        }
        Insert: {
          id?: number
          region_id: number
          year: number
          month: number
          is_open?: boolean
          max_reservations_per_day?: number
          max_days_per_month?: number
          created_at?: string
        }
        Update: {
          id?: number
          region_id?: number
          year?: number
          month?: number
          is_open?: boolean
          max_reservations_per_day?: number
          max_days_per_month?: number
          created_at?: string
        }
      }
      blocked_dates: {
        Row: {
          id: number
          region_id: number
          date: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: number
          region_id: number
          date: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          region_id?: number
          date?: string
          reason?: string | null
          created_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          user_id: string
          region_id: number
          date: string
          status: 'pending' | 'approved' | 'cancelled' | 'admin_cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          region_id: number
          date: string
          status?: 'pending' | 'approved' | 'cancelled' | 'admin_cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          region_id?: number
          date?: string
          status?: 'pending' | 'approved' | 'cancelled' | 'admin_cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      reservation_slots: {
        Row: {
          id: string
          reservation_id: string
          start_time: string
          end_time: string
          grade: string
          participant_count: number
          location: string
          slot_order: number
          created_at: string
        }
        Insert: {
          id?: string
          reservation_id: string
          start_time: string
          end_time: string
          grade: string
          participant_count: number
          location: string
          slot_order: number
          created_at?: string
        }
        Update: {
          id?: string
          reservation_id?: string
          start_time?: string
          end_time?: string
          grade?: string
          participant_count?: number
          location?: string
          slot_order?: number
          created_at?: string
        }
      }
      reservation_logs: {
        Row: {
          id: number
          reservation_id: string
          old_status: string | null
          new_status: string | null
          changed_by: string | null
          changed_by_type: 'user' | 'admin' | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: number
          reservation_id: string
          old_status?: string | null
          new_status?: string | null
          changed_by?: string | null
          changed_by_type?: 'user' | 'admin' | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          reservation_id?: string
          old_status?: string | null
          new_status?: string | null
          changed_by?: string | null
          changed_by_type?: 'user' | 'admin' | null
          reason?: string | null
          created_at?: string
        }
      }
      homepage_popups: {
        Row: {
          id: string
          title: string
          content: string
          content_type: 'html' | 'markdown' | 'text'
          is_active: boolean
          start_date: string
          end_date: string | null
          author_id: string
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          content_type?: 'html' | 'markdown' | 'text'
          is_active?: boolean
          start_date: string
          end_date?: string | null
          author_id: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          content_type?: 'html' | 'markdown' | 'text'
          is_active?: boolean
          start_date?: string
          end_date?: string | null
          author_id?: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      user_details: {
        Row: {
          id: string
          organization_name: string
          manager_name: string
          phone: string
          email: string
          status: 'pending' | 'approved' | 'rejected' | 'suspended'
          city_name: string
          region_name: string
          region_code: string
          created_at: string
        }
      }
    }
    Functions: {
      get_user_monthly_reservation_count: {
        Args: {
          user_uuid: string
          target_year: number
          target_month: number
        }
        Returns: number
      }
      get_daily_reservation_count: {
        Args: {
          target_region_id: number
          target_date: string
        }
        Returns: number
      }
    }
  }
}

// 편의를 위한 타입 별칭들
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Reservation = Database['public']['Tables']['reservations']['Row']
export type ReservationInsert = Database['public']['Tables']['reservations']['Insert']

export type HomepagePopup = Database['public']['Tables']['homepage_popups']['Row']
export type HomepagePopupInsert = Database['public']['Tables']['homepage_popups']['Insert']
export type HomepagePopupUpdate = Database['public']['Tables']['homepage_popups']['Update']
export type ReservationUpdate = Database['public']['Tables']['reservations']['Update']

export type ReservationSlot = Database['public']['Tables']['reservation_slots']['Row']
export type ReservationSlotInsert = Database['public']['Tables']['reservation_slots']['Insert']

export type City = Database['public']['Tables']['cities']['Row']
export type Region = Database['public']['Tables']['regions']['Row']

export type UserDetail = Database['public']['Views']['user_details']['Row']

export type ReservationSettings = Database['public']['Tables']['reservation_settings']['Row']
export type BlockedDate = Database['public']['Tables']['blocked_dates']['Row']

export type Admin = Database['public']['Tables']['admins']['Row']