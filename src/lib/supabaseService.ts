import { supabase, Pose as DBPose, PoseVariation as DBPoseVariation, Sequence } from './supabase'
import { Pose, PoseVariation } from '../types'

// Helper function to convert database pose format to app format
const dbToAppPose = (dbPose: DBPose): Pose => ({
  id: dbPose.id,
  name: dbPose.name,
  authorId: dbPose.author_id || null
})

// Helper function to convert database format to app format
const dbToAppVariation = (dbVariation: DBPoseVariation): PoseVariation => ({
  id: dbVariation.id,
  poseId: dbVariation.pose_id,
  name: dbVariation.name,
  isDefault: dbVariation.is_default,
  imageUrl: dbVariation.image_url || null,
  cue1: dbVariation.cue_1 || null,
  cue2: dbVariation.cue_2 || null,
  cue3: dbVariation.cue_3 || null,
  breathTransition: dbVariation.breath_transition || null,
  authorId: dbVariation.author_id || null
})

// Helper function to convert app format to database format
const appToDbVariation = (appVariation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'>): Omit<DBPoseVariation, 'id' | 'created_at' | 'updated_at'> => ({
  pose_id: appVariation.poseId,
  name: appVariation.name,
  is_default: appVariation.isDefault,
  image_url: appVariation.imageUrl || null,
  cue_1: appVariation.cue1 || null,
  cue_2: appVariation.cue2 || null,
  cue_3: appVariation.cue3 || null,
  breath_transition: appVariation.breathTransition || null,
  author_id: appVariation.authorId || null
})

// Pose operations
export const poseService = {
  async getAll(): Promise<Pose[]> {
    const { data, error } = await supabase
      .from('poses')
      .select('*')
      .order('name')
    
    if (error) throw error
    return (data || []).map(dbToAppPose)
  },

  async create(pose: Omit<Pose, 'id' | 'created_at' | 'updated_at'>): Promise<Pose> {
    const dbPose: Omit<DBPose, 'id' | 'created_at' | 'updated_at'> = {
      name: pose.name,
      author_id: pose.authorId || null
    }
    
    const { data, error } = await supabase
      .from('poses')
      .insert(dbPose)
      .select()
      .single()
    
    if (error) throw error
    return dbToAppPose(data)
  },

  async update(id: string, updates: Partial<Pose>): Promise<Pose> {
    const dbUpdates: Partial<DBPose> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.authorId !== undefined) dbUpdates.author_id = updates.authorId || null
    
    const { data, error } = await supabase
      .from('poses')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return dbToAppPose(data)
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('poses')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Pose Variation operations
export const poseVariationService = {
  async getAll(): Promise<PoseVariation[]> {
    const { data, error } = await supabase
      .from('pose_variations')
      .select('*')
      .order('name')
    
    if (error) throw error
    return (data || []).map(dbToAppVariation)
  },

  async getByPoseId(poseId: string): Promise<PoseVariation[]> {
    const { data, error } = await supabase
      .from('pose_variations')
      .select('*')
      .eq('pose_id', poseId)
      .order('name')
    
    if (error) throw error
    return (data || []).map(dbToAppVariation)
  },

  async create(variation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'>): Promise<PoseVariation> {
    const dbVariation = appToDbVariation(variation)
    const { data, error } = await supabase
      .from('pose_variations')
      .insert(dbVariation)
      .select()
      .single()
    
    if (error) throw error
    return dbToAppVariation(data)
  },

  async update(id: string, updates: Partial<PoseVariation>): Promise<PoseVariation> {
    const dbUpdates: Partial<DBPoseVariation> = {}
    if (updates.poseId !== undefined) dbUpdates.pose_id = updates.poseId
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault
    if (updates.imageUrl !== undefined) {
      dbUpdates.image_url = updates.imageUrl || null
      console.log('Updating imageUrl to:', dbUpdates.image_url)
    }
    if (updates.cue1 !== undefined) dbUpdates.cue_1 = updates.cue1 || null
    if (updates.cue2 !== undefined) dbUpdates.cue_2 = updates.cue2 || null
    if (updates.cue3 !== undefined) dbUpdates.cue_3 = updates.cue3 || null
    if (updates.breathTransition !== undefined) dbUpdates.breath_transition = updates.breathTransition || null

    console.log('Updating variation with:', dbUpdates)

    const { data, error } = await supabase
      .from('pose_variations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Database update error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw new Error(`Failed to update variation: ${error.message}. Make sure the image_url column exists in the pose_variations table.`)
    }
    
    console.log('Database update successful, returned data:', data)
    const converted = dbToAppVariation(data)
    console.log('Converted variation:', converted)
    return converted
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pose_variations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Upload image for a pose variation
  async uploadImage(variationId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${variationId}-${Date.now()}.${fileExt}`
      const filePath = `variations/${fileName}`

      console.log('Uploading file to path:', filePath)

      // Upload file to storage
      const { error: uploadError, data } = await supabase.storage
        .from('pose-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        console.error('Error message:', uploadError.message)
        console.error('Full error:', JSON.stringify(uploadError, null, 2))
        
        // Provide helpful error message for RLS issues
        const errorMsg = uploadError.message || String(uploadError)
        if (errorMsg.includes('RLS') || errorMsg.includes('policy') || errorMsg.includes('violates') || errorMsg.includes('42501')) {
          throw new Error(`Storage RLS policy error: ${errorMsg}. Make sure the 'pose-images' bucket exists and has proper policies. Run supabase-storage-fix-rls.sql in your Supabase SQL Editor.`)
        }
        
        throw new Error(`Failed to upload image: ${errorMsg}`)
      }

      console.log('File uploaded successfully, data:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pose-images')
        .getPublicUrl(filePath)

      console.log('Public URL:', publicUrl)

      // Update variation with image URL
      console.log('About to update variation in database with imageUrl:', publicUrl)
      console.log('Variation ID:', variationId)
      
      const updated = await this.update(variationId, { imageUrl: publicUrl })
      console.log('Variation updated with image URL:', updated)
      console.log('Updated variation imageUrl:', updated.imageUrl)
      console.log('Updated variation full object:', JSON.stringify(updated, null, 2))
      
      // Verify the update worked
      if (!updated.imageUrl || updated.imageUrl !== publicUrl) {
        console.error('WARNING: Image URL was not saved correctly!')
        console.error('Expected:', publicUrl)
        console.error('Got:', updated.imageUrl)
        console.error('Full updated object:', updated)
        
        // Try to reload from database to see what's actually there
        const { data: reloaded, error: reloadError } = await supabase
          .from('pose_variations')
          .select('*')
          .eq('id', variationId)
          .single()
        
        if (!reloadError && reloaded) {
          console.error('Reloaded from database:', reloaded)
          console.error('image_url in database:', reloaded.image_url)
        }
        
        throw new Error(`Image URL was not saved to database correctly. Expected: ${publicUrl}, Got: ${updated.imageUrl || 'null'}`)
      }

      return publicUrl
    } catch (error) {
      console.error('Error in uploadImage:', error)
      throw error
    }
  },

  // Delete image for a pose variation
  async deleteImage(variationId: string, imageUrl: string): Promise<void> {
    try {
      console.log('Deleting image, URL:', imageUrl)
      
      // Extract file path from URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/pose-images/variations/filename.jpg
      const urlParts = imageUrl.split('/pose-images/')
      if (urlParts.length < 2) {
        throw new Error(`Invalid image URL format: ${imageUrl}`)
      }
      
      // The path after /pose-images/ should already include "variations/" if it was uploaded correctly
      let filePath = urlParts[1].split('?')[0] // Remove query params
      
      // Ensure the path starts with "variations/" if it doesn't already
      if (!filePath.startsWith('variations/')) {
        filePath = `variations/${filePath}`
      }
      
      console.log('Deleting file at path:', filePath)

      // Delete file from storage
      const { error: deleteError } = await supabase.storage
        .from('pose-images')
        .remove([filePath])

      if (deleteError) {
        console.error('Storage delete error:', deleteError)
        throw new Error(`Failed to delete image: ${deleteError.message}`)
      }

      console.log('File deleted successfully')

      // Update variation to remove image URL
      await this.update(variationId, { imageUrl: null })
      console.log('Variation updated, image URL removed')
    } catch (error) {
      console.error('Error in deleteImage:', error)
      throw error
    }
  }
}

// Sequence operations
export const sequenceService = {
  async getAll(userId: string): Promise<Sequence[]> {
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('user_id', userId)
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async getById(id: string, userId: string): Promise<Sequence | null> {
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  async create(sequence: Omit<Sequence, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId: string): Promise<Sequence> {
    const { data, error } = await supabase
      .from('sequences')
      .insert({ ...sequence, user_id: userId })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Sequence>, userId: string): Promise<Sequence> {
    const { data, error } = await supabase
      .from('sequences')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('sequences')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    
    if (error) throw error
  },

  // Check if a variation is used in any sequence (across all users)
  // Uses database function with SECURITY DEFINER to bypass RLS
  async isVariationUsedInAnySequence(variationId: string): Promise<{ used: boolean; sequenceNames: string[] }> {
    try {
      const { data, error } = await supabase.rpc('check_variation_usage', {
        p_variation_id: variationId
      })
      
      if (error) {
        console.error('RPC error checking variation usage:', error)
        // Re-throw with more context
        throw new Error(`Database check failed: ${error.message}. Make sure the check_variation_usage function exists in Supabase.`)
      }
      
      // The function returns TEXT[] directly (not wrapped in a table)
      const sequenceNames = Array.isArray(data) ? data : []
      console.log(`Variation ${variationId} check result:`, { used: sequenceNames.length > 0, sequenceNames })
      return { used: sequenceNames.length > 0, sequenceNames }
    } catch (err: any) {
      console.error('Error in isVariationUsedInAnySequence:', err)
      throw err
    }
  },

  // Check if a pose (any of its variations) is used in any sequence (across all users)
  async isPoseUsedInAnySequence(poseId: string, variationIds: string[]): Promise<{ used: boolean; sequenceNames: string[] }> {
    const sequenceNamesSet = new Set<string>()
    
    // Check each variation
    for (const variationId of variationIds) {
      const result = await this.isVariationUsedInAnySequence(variationId)
      result.sequenceNames.forEach(name => sequenceNamesSet.add(name))
    }
    
    return { used: sequenceNamesSet.size > 0, sequenceNames: Array.from(sequenceNamesSet) }
  },

  // Get sequence by ID (public access, no auth required)
  async getByIdPublic(id: string): Promise<Sequence | null> {
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  }
}
