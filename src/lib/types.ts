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
  transitional_cues?: string[]
  created_at: string
  updated_at: string
}

export interface Sequence {
  id: string
  user_id: string
  name: string
  sections: any[]
  share_id?: string | null
  display_order?: number
  published_to_profile?: boolean
  created_at: string
  updated_at: string
}

export interface ClassEvent {
  id: string
  title: string
  dayOfWeek?: number
  date?: string
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
  venmo_username?: string | null
  profile_photo_url?: string | null
  spotify_playlist_urls?: string[] | null
  is_banned?: boolean
  permissions?: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
}
