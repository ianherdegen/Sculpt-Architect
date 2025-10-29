import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Pose {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface PoseVariation {
  id: string
  pose_id: string
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Sequence {
  id: string
  name: string
  sections: any[] // JSON array of sections
  created_at: string
  updated_at: string
}
