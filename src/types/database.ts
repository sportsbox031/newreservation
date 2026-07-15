import type {
  Database as GeneratedDatabase,
  Json,
} from '../../database.types'

type Merge<A, B> = Omit<A, keyof B> & B

type ExtendedPublic = Merge<
  GeneratedDatabase['public'],
  {
    Tables: Merge<
      GeneratedDatabase['public']['Tables'],
      {
        admins: Merge<
          GeneratedDatabase['public']['Tables']['admins'],
          {
            Row: Merge<
              GeneratedDatabase['public']['Tables']['admins']['Row'],
              {
                role: 'super' | 'south' | 'north'
              }
            >
            Insert: Merge<
              GeneratedDatabase['public']['Tables']['admins']['Insert'],
              {
                role: 'super' | 'south' | 'north'
              }
            >
            Update: Merge<
              GeneratedDatabase['public']['Tables']['admins']['Update'],
              {
                role?: 'super' | 'south' | 'north'
              }
            >
          }
        >
        blocked_dates: Merge<
          GeneratedDatabase['public']['Tables']['blocked_dates'],
          {
            Row: Merge<
              GeneratedDatabase['public']['Tables']['blocked_dates']['Row'],
              {
                start_time: string | null
                end_time: string | null
              }
            >
            Insert: Merge<
              GeneratedDatabase['public']['Tables']['blocked_dates']['Insert'],
              {
                start_time?: string | null
                end_time?: string | null
              }
            >
            Update: Merge<
              GeneratedDatabase['public']['Tables']['blocked_dates']['Update'],
              {
                start_time?: string | null
                end_time?: string | null
              }
            >
          }
        >
        users: Merge<
          GeneratedDatabase['public']['Tables']['users'],
          {
            Row: Merge<
              GeneratedDatabase['public']['Tables']['users']['Row'],
              {
                organization_type: 'school' | 'welfare' | null
                status: 'pending' | 'approved' | 'rejected' | 'suspended' | null
                tier: 'Priority' | 'Standard' | null
              }
            >
            Insert: Merge<
              GeneratedDatabase['public']['Tables']['users']['Insert'],
              {
                organization_type?: 'school' | 'welfare'
                status?: 'pending' | 'approved' | 'rejected' | 'suspended' | null
                tier?: 'Priority' | 'Standard' | null
              }
            >
            Update: Merge<
              GeneratedDatabase['public']['Tables']['users']['Update'],
              {
                organization_type?: 'school' | 'welfare'
                status?: 'pending' | 'approved' | 'rejected' | 'suspended' | null
                tier?: 'Priority' | 'Standard' | null
              }
            >
          }
        >
        user_penalties: {
          Row: {
            id: string
            user_id: string
            type: 'warning' | 'ejection'
            reason: string
            restricted_month: string | null
            triggered_by_warning: boolean
            issued_by: string | null
            created_at: string
          }
          Insert: {
            id?: string
            user_id: string
            type: 'warning' | 'ejection'
            reason: string
            restricted_month?: string | null
            triggered_by_warning?: boolean
            issued_by?: string | null
            created_at?: string
          }
          Update: {
            id?: string
            user_id?: string
            type?: 'warning' | 'ejection'
            reason?: string
            restricted_month?: string | null
            triggered_by_warning?: boolean
            issued_by?: string | null
            created_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'user_penalties_user_id_fkey'
              columns: ['user_id']
              isOneToOne: false
              referencedRelation: 'users'
              referencedColumns: ['id']
            },
          ]
        }
        admin_sessions: {
          Row: {
            id: number
            admin_id: string
            session_token: string
            user_agent: string | null
            ip_address: string | null
            is_active: boolean | null
            last_activity: string | null
            created_at: string | null
            expires_at: string
          }
          Insert: {
            id?: number
            admin_id: string
            session_token: string
            user_agent?: string | null
            ip_address?: string | null
            is_active?: boolean | null
            last_activity?: string | null
            created_at?: string | null
            expires_at: string
          }
          Update: {
            id?: number
            admin_id?: string
            session_token?: string
            user_agent?: string | null
            ip_address?: string | null
            is_active?: boolean | null
            last_activity?: string | null
            created_at?: string | null
            expires_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'admin_sessions_admin_id_fkey'
              columns: ['admin_id']
              isOneToOne: false
              referencedRelation: 'admins'
              referencedColumns: ['id']
            },
          ]
        }
      }
    >
    Functions: Merge<
      GeneratedDatabase['public']['Functions'],
      {
        cleanup_expired_sessions: {
          Args: Record<string, never>
          Returns: void
        }
      }
    >
  }
>

export interface Database extends Merge<GeneratedDatabase, { public: ExtendedPublic }> {}

export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Reservation = Database['public']['Tables']['reservations']['Row']
export type ReservationInsert = Database['public']['Tables']['reservations']['Insert']
export type ReservationUpdate = Database['public']['Tables']['reservations']['Update']

export type HomepagePopup = Database['public']['Tables']['homepage_popups']['Row']
export type HomepagePopupInsert = Database['public']['Tables']['homepage_popups']['Insert']
export type HomepagePopupUpdate = Database['public']['Tables']['homepage_popups']['Update']

export type ReservationSlot = Database['public']['Tables']['reservation_slots']['Row']
export type ReservationSlotInsert = Database['public']['Tables']['reservation_slots']['Insert']

export type City = Database['public']['Tables']['cities']['Row']
export type Region = Database['public']['Tables']['regions']['Row']

export type UserDetail = Database['public']['Views']['user_details']['Row']

export type ReservationSettings = Database['public']['Tables']['reservation_settings']['Row']
export type BlockedDate = Database['public']['Tables']['blocked_dates']['Row']

export type Admin = Database['public']['Tables']['admins']['Row']

export type Announcement = Database['public']['Tables']['announcements']['Row']
export type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert']
export type AnnouncementUpdate = Database['public']['Tables']['announcements']['Update']

export type AnnouncementView = Database['public']['Tables']['announcement_views']['Row']
export type AnnouncementViewInsert = Database['public']['Tables']['announcement_views']['Insert']

export type AnnouncementAttachment = Database['public']['Tables']['announcement_attachments']['Row']
export type AnnouncementAttachmentInsert = Database['public']['Tables']['announcement_attachments']['Insert']
export type AnnouncementAttachmentUpdate = Database['public']['Tables']['announcement_attachments']['Update']

export type UserSession = Database['public']['Tables']['user_sessions']['Row']
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert']
export type UserSessionUpdate = Database['public']['Tables']['user_sessions']['Update']

export type DailyReservationsLimit = Database['public']['Tables']['daily_reservation_limits']['Row']
export type DailyReservationsLimitInsert = Database['public']['Tables']['daily_reservation_limits']['Insert']
export type DailyReservationsLimitUpdate = Database['public']['Tables']['daily_reservation_limits']['Update']

export type UserPenalty = Database['public']['Tables']['user_penalties']['Row']
export type UserPenaltyInsert = Database['public']['Tables']['user_penalties']['Insert']

export type ReservationTransaction = Database['public']['Tables']['reservation_transactions']['Row']
export type ReservationTransactionInsert = Database['public']['Tables']['reservation_transactions']['Insert']
export type ReservationTransactionUpdate = Database['public']['Tables']['reservation_transactions']['Update']

export type { Json }
