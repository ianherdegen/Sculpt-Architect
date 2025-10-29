import { supabase, Pose, PoseVariation as DBPoseVariation, Sequence } from './supabase'
import { PoseVariation } from '../types'

// Helper function to convert database format to app format
const dbToAppVariation = (dbVariation: DBPoseVariation): PoseVariation => ({
  id: dbVariation.id,
  poseId: dbVariation.pose_id,
  name: dbVariation.name,
  isDefault: dbVariation.is_default
})

// Helper function to convert app format to database format
const appToDbVariation = (appVariation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'>): Omit<DBPoseVariation, 'id' | 'created_at' | 'updated_at'> => ({
  pose_id: appVariation.poseId,
  name: appVariation.name,
  is_default: appVariation.isDefault
})

// Pose operations
export const poseService = {
  async getAll(): Promise<Pose[]> {
    const { data, error } = await supabase
      .from('poses')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async create(pose: Omit<Pose, 'id' | 'created_at' | 'updated_at'>): Promise<Pose> {
    const { data, error } = await supabase
      .from('poses')
      .insert(pose)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Pose>): Promise<Pose> {
    const { data, error } = await supabase
      .from('poses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
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

    const { data, error } = await supabase
      .from('pose_variations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return dbToAppVariation(data)
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('pose_variations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Sequence operations
export const sequenceService = {
  async getAll(): Promise<Sequence[]> {
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Sequence | null> {
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
  },

  async create(sequence: Omit<Sequence, 'id' | 'created_at' | 'updated_at'>): Promise<Sequence> {
    const { data, error } = await supabase
      .from('sequences')
      .insert(sequence)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Sequence>): Promise<Sequence> {
    const { data, error } = await supabase
      .from('sequences')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sequences')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
