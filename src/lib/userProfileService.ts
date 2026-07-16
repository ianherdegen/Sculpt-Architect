import { api, ApiError } from './apiClient'
import type { UserProfile, ClassEvent } from './types'

export type { UserProfile, ClassEvent } from './types'

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
  spotify_playlist_urls?: string[] | null
  is_banned?: boolean
}

export const userProfileService = {
  async getByUserId(userId: string): Promise<UserProfile | null> {
    try {
      return await api.get<UserProfile | null>(`/profiles/user/${encodeURIComponent(userId)}`)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },

  async getMyProfile(): Promise<UserProfile | null> {
    try {
      return await api.get<UserProfile | null>('/profiles/me', true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null
      throw error
    }
  },

  async getByShareId(shareId: string): Promise<UserProfile | null> {
    return api.get<UserProfile | null>(`/profiles/share/${encodeURIComponent(shareId)}`)
  },

  async create(input: CreateUserProfileInput): Promise<UserProfile> {
    try {
      return await api.post<UserProfile>('/profiles/me', {
        email: input.email,
        name: input.name || '',
        bio: input.bio || '',
        events: input.events || [],
        share_id: input.share_id || null
      }, true)
    } catch (error) {
      if (error instanceof ApiError && error.message.includes('custom link')) {
        throw new Error('This custom link is already taken. Please choose another.')
      }
      throw error
    }
  },

  async update(userId: string, input: UpdateUserProfileInput): Promise<UserProfile> {
    try {
      return await api.patch<UserProfile>('/profiles/me', input)
    } catch (error) {
      if (error instanceof ApiError && error.message.includes('custom link')) {
        throw new Error('This custom link is already taken. Please choose another.')
      }
      throw error
    }
  },

  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const result = await api.post<{ url: string }>('/profiles/me/photo', formData, true)
    return result.url
  },

  async deleteProfilePhoto(userId: string, _photoUrl: string): Promise<void> {
    await api.delete('/profiles/me/photo')
  },

  async banUser(userId: string, isBanned: boolean): Promise<UserProfile> {
    return this.update(userId, { is_banned: isBanned })
  },

  async getOrCreate(userId: string, email: string): Promise<UserProfile> {
    let profile = await this.getMyProfile()

    if (!profile) {
      profile = await this.create({
        user_id: userId,
        email: email,
        name: '',
        bio: '',
        events: [],
        share_id: userId
      })
    }

    return profile
  },

  async isAdmin(userId: string): Promise<boolean> {
    const profile = await this.getMyProfile()
    return profile?.permissions?.admin === true
  }
}
