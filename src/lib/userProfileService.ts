import { supabase, UserProfile, ClassEvent } from './supabase'

export interface CreateUserProfileInput {
  user_id: string
  name?: string
  bio?: string
  email: string
  events?: ClassEvent[]
  share_id?: string | null
}

export interface UpdateUserProfileInput {
  name?: string
  bio?: string
  email?: string
  events?: ClassEvent[]
  share_id?: string | null
}

export const userProfileService = {
  async getByUserId(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  async getByShareId(shareId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('share_id', shareId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  async create(input: CreateUserProfileInput): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: input.user_id,
        name: input.name || '',
        bio: input.bio || '',
        email: input.email,
        events: input.events || [],
        share_id: input.share_id || null
      })
      .select()
      .single()
    
    if (error) {
      // Check if it's a unique constraint violation on share_id
      if (error.code === '23505' && error.message.includes('share_id')) {
        throw new Error('This custom link is already taken. Please choose another.')
      }
      throw error
    }
    return data
  },

  async update(userId: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    const updateData: any = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.bio !== undefined) updateData.bio = input.bio
    if (input.email !== undefined) updateData.email = input.email
    if (input.events !== undefined) updateData.events = input.events
    if (input.share_id !== undefined) updateData.share_id = input.share_id || null

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) {
      // Check if it's a unique constraint violation on share_id
      if (error.code === '23505' && error.message.includes('share_id')) {
        throw new Error('This custom link is already taken. Please choose another.')
      }
      throw error
    }
    return data
  },

  async getOrCreate(userId: string, email: string): Promise<UserProfile> {
    let profile = await this.getByUserId(userId)
    
    if (!profile) {
      // Create profile with default share_id as userId (UUID)
      profile = await this.create({
        user_id: userId,
        email: email,
        name: '',
        bio: '',
        events: [],
        share_id: userId // Default to userId, user can change to custom later
      })
    }
    
    return profile
  },

  async isAdmin(userId: string): Promise<boolean> {
    const profile = await this.getByUserId(userId)
    return profile?.is_admin ?? false
  }
}
