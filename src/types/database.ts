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
          student_count: number | null
          class_count: number | null
          tier: 'Priority' | 'Standard'
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
          student_count?: number | null
          class_count?: number | null
          tier?: 'Priority' | 'Standard'
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
          student_count?: number | null
          class_count?: number | null
          tier?: 'Priority' | 'Standard'
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
          start_time: string | null  // HH:MM 형식, null이면 하루 전체 차단
          end_time: string | null    // HH:MM 형식, null이면 하루 전체 차단
          created_at: string
        }
        Insert: {
          id?: number
          region_id: number
          date: string
          reason?: string | null
          start_time?: string | null
          end_time?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          region_id?: number
          date?: string
          reason?: string | null
          start_time?: string | null
          end_time?: string | null
          created_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          user_id: string
          region_id: number
          date: string
          status: 'pending' | 'approved' | 'cancelled' | 'admin_cancelled' | 'rejected' | 'cancel_requested'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          region_id: number
          date: string
          status?: 'pending' | 'approved' | 'cancelled' | 'admin_cancelled' | 'rejected' | 'cancel_requested'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          region_id?: number
          date?: string
          status?: 'pending' | 'approved' | 'cancelled' | 'admin_cancelled' | 'rejected' | 'cancel_requested'
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
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          author_id: string
          target_type: 'all' | 'region'
          target_region_id: number | null
          is_important: boolean
          is_published: boolean
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_id: string
          target_type: 'all' | 'region'
          target_region_id?: number | null
          is_important?: boolean
          is_published?: boolean
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_id?: string
          target_type?: 'all' | 'region'
          target_region_id?: number | null
          is_important?: boolean
          is_published?: boolean
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      announcement_views: {
        Row: {
          id: string
          announcement_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          announcement_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          announcement_id?: string
          user_id?: string
          viewed_at?: string
        }
      }
      announcement_attachments: {
        Row: {
          id: string
          announcement_id: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          announcement_id: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          announcement_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          storage_path?: string
          uploaded_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: number
          user_id: string
          session_token: string
          user_agent: string | null
          ip_address: string | null
          is_active: boolean
          last_activity: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: number
          user_id: string
          session_token: string
          user_agent?: string | null
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: number
          user_id?: string
          session_token?: string
          user_agent?: string | null
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          created_at?: string
          expires_at?: string
        }
      }
      daily_reservations_limit: {
        Row: {
          id: number
          reservation_date: string
          time_slot: string
          max_capacity: number
          current_count: number
          is_full: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          reservation_date: string
          time_slot: string
          max_capacity?: number
          current_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          reservation_date?: string
          time_slot?: string
          max_capacity?: number
          current_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      reservation_transactions: {
        Row: {
          id: number
          user_id: string
          reservation_date: string
          time_slot: string
          transaction_id: string
          status: 'pending' | 'success' | 'failed' | 'expired'
          failure_reason: string | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: number
          user_id: string
          reservation_date: string
          time_slot: string
          transaction_id?: string
          status?: 'pending' | 'success' | 'failed' | 'expired'
          failure_reason?: string | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          reservation_date?: string
          time_slot?: string
          transaction_id?: string
          status?: 'pending' | 'success' | 'failed' | 'expired'
          failure_reason?: string | null
          created_at?: string
          expires_at?: string
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
      cleanup_expired_sessions: {
        Args: Record<string, never>
        Returns: void
      }
      create_reservation_atomic: {
        Args: {
          p_user_id: string
          p_region_id: number
          p_date: string
          p_slots: unknown
        }
        Returns: {
          success: boolean
          message?: string
          reservation?: {
            id: string
            user_id: string
            region_id: number
            date: string
            status: string
            reservation_slots: Array<{
              id: string
              start_time: string
              end_time: string
              grade: string
              participant_count: number
              location: string
              slot_order: number
            }>
          }
        }
      }
      try_reserve_slot: {
        Args: {
          p_user_id: string
          p_date: string
          p_time_slot: string
        }
        Returns: {
          success: boolean
          message: string
          transaction_id: string
          current_count: number
          max_capacity: number
        }
      }
      cancel_reservation_slot: {
        Args: {
          p_date: string
          p_time_slot: string
        }
        Returns: void
      }
      count_announcement_attachments: {
        Args: {
          p_announcement_id: string
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

// Announcements (공지사항)
export type Announcement = Database['public']['Tables']['announcements']['Row']
export type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert']
export type AnnouncementUpdate = Database['public']['Tables']['announcements']['Update']

export type AnnouncementView = Database['public']['Tables']['announcement_views']['Row']
export type AnnouncementViewInsert = Database['public']['Tables']['announcement_views']['Insert']

export type AnnouncementAttachment = Database['public']['Tables']['announcement_attachments']['Row']
export type AnnouncementAttachmentInsert = Database['public']['Tables']['announcement_attachments']['Insert']
export type AnnouncementAttachmentUpdate = Database['public']['Tables']['announcement_attachments']['Update']

// Sessions (세션 관리)
export type UserSession = Database['public']['Tables']['user_sessions']['Row']
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert']
export type UserSessionUpdate = Database['public']['Tables']['user_sessions']['Update']

// Reservation Limits (예약 정원 관리)
export type DailyReservationsLimit = Database['public']['Tables']['daily_reservations_limit']['Row']
export type DailyReservationsLimitInsert = Database['public']['Tables']['daily_reservations_limit']['Insert']
export type DailyReservationsLimitUpdate = Database['public']['Tables']['daily_reservations_limit']['Update']

// Reservation Transactions (예약 트랜잭션)
export type ReservationTransaction = Database['public']['Tables']['reservation_transactions']['Row']
export type ReservationTransactionInsert = Database['public']['Tables']['reservation_transactions']['Insert']
export type ReservationTransactionUpdate = Database['public']['Tables']['reservation_transactions']['Update']
