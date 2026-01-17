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
  venmo_username?: string | null
  profile_photo_url?: string | null
  is_banned?: boolean
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
    if (input.venmo_username !== undefined) updateData.venmo_username = input.venmo_username || null
    if (input.profile_photo_url !== undefined) updateData.profile_photo_url = input.profile_photo_url || null
    if (input.is_banned !== undefined) updateData.is_banned = input.is_banned

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

  // Upload profile photo
  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `photo-${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log('Uploading profile photo to path:', filePath)

      // Upload file to storage
      const { error: uploadError, data } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        const errorMsg = uploadError.message || String(uploadError)
        if (errorMsg.includes('RLS') || errorMsg.includes('policy') || errorMsg.includes('violates') || errorMsg.includes('42501')) {
          throw new Error(`Storage RLS policy error: ${errorMsg}. Make sure the 'profile-photos' bucket exists and has proper policies. Run supabase-profile-photos-storage-setup.sql in your Supabase SQL Editor.`)
        }
        throw new Error(`Failed to upload photo: ${errorMsg}`)
      }

      console.log('File uploaded successfully, data:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath)

      console.log('Public URL:', publicUrl)

      // Update profile with photo URL
      const updated = await this.update(userId, { profile_photo_url: publicUrl })
      console.log('Profile updated with photo URL:', updated)

      return publicUrl
    } catch (error) {
      console.error('Error uploading profile photo:', error)
      throw error
    }
  },

  // Delete profile photo
  async deleteProfilePhoto(userId: string, photoUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/profile-photos/')
      if (urlParts.length !== 2) {
        throw new Error('Invalid photo URL format')
      }
      const filePath = urlParts[1].split('?')[0] // Remove query params if any

      console.log('Deleting profile photo from path:', filePath)

      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('profile-photos')
        .remove([filePath])

      if (deleteError) {
        console.error('Storage delete error:', deleteError)
        throw new Error(`Failed to delete photo: ${deleteError.message}`)
      }

      // Update profile to remove photo URL
      await this.update(userId, { profile_photo_url: null })
      console.log('Profile photo deleted successfully')
    } catch (error) {
      console.error('Error deleting profile photo:', error)
      throw error
    }
  },

  // Ban/unban user (admin only)
  async banUser(userId: string, isBanned: boolean): Promise<UserProfile> {
    return this.update(userId, { is_banned: isBanned })
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
