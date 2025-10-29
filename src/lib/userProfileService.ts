import { supabase, UserProfile } from './supabase'

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

  async isAdmin(userId: string): Promise<boolean> {
    const profile = await this.getByUserId(userId)
    return profile?.is_admin ?? false
  }
}
