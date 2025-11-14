import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Pose {
  id: string
  name: string
  author_id?: string | null
  created_at: string
  updated_at: string
}

export interface PoseVariation {
  id: string
  pose_id: string
  name: string
  is_default: boolean
  image_url?: string | null
  cue_1?: string | null
  cue_2?: string | null
  cue_3?: string | null
  breath_transition?: string | null
  author_id?: string | null
  created_at: string
  updated_at: string
}

export interface Sequence {
  id: string
  user_id: string
  name: string
  sections: any[] // JSON array of sections
  share_id?: string | null
  created_at: string
  updated_at: string
}

export interface ClassEvent {
  id: string
  title: string
  dayOfWeek?: number // 0-6 for Sunday-Saturday (for recurring)
  date?: string // For single events
  startTime: string
  endTime: string
  location: string
  description?: string
  isRecurring: boolean
}

export interface UserProfile {
  id: string
  user_id: string
  name: string
  bio: string
  email: string
  events: ClassEvent[]
  share_id?: string | null
  permissions?: Record<string, boolean>
  created_at: string
  updated_at: string
}
