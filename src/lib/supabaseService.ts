import { api } from './apiClient'
import type { Pose as DBPose, PoseVariation as DBPoseVariation, Sequence } from './types'
import { Pose, PoseVariation } from '../types'

const dbToAppPose = (dbPose: DBPose): Pose => ({
  id: dbPose.id,
  name: dbPose.name,
  authorId: dbPose.author_id || null
})

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

export const poseService = {
  async getAll(): Promise<Pose[]> {
    const data = await api.get<DBPose[]>('/poses')
    return data.map(dbToAppPose)
  },

  async create(pose: Omit<Pose, 'id' | 'created_at' | 'updated_at'>): Promise<Pose> {
    const data = await api.post<DBPose>('/poses', {
      name: pose.name,
      author_id: pose.authorId || null
    }, true)
    return dbToAppPose(data)
  },

  async update(id: string, updates: Partial<Pose>): Promise<Pose> {
    const dbUpdates: Partial<DBPose> = {}
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.authorId !== undefined) dbUpdates.author_id = updates.authorId || null

    const data = await api.patch<DBPose>(`/poses/${id}`, dbUpdates)
    return dbToAppPose(data)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/poses/${id}`)
  }
}

export const poseVariationService = {
  async getAll(): Promise<PoseVariation[]> {
    const data = await api.get<DBPoseVariation[]>('/pose-variations')
    return data.map(dbToAppVariation)
  },

  async getByPoseId(poseId: string): Promise<PoseVariation[]> {
    const data = await api.get<DBPoseVariation[]>(`/pose-variations?pose_id=${encodeURIComponent(poseId)}`)
    return data.map(dbToAppVariation)
  },

  async create(variation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'>): Promise<PoseVariation> {
    const dbVariation = appToDbVariation(variation)
    const data = await api.post<DBPoseVariation>('/pose-variations', dbVariation, true)
    return dbToAppVariation(data)
  },

  async update(id: string, updates: Partial<PoseVariation>): Promise<PoseVariation> {
    const dbUpdates: Partial<DBPoseVariation> = {}
    if (updates.poseId !== undefined) dbUpdates.pose_id = updates.poseId
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl || null
    if (updates.cue1 !== undefined) dbUpdates.cue_1 = updates.cue1 || null
    if (updates.cue2 !== undefined) dbUpdates.cue_2 = updates.cue2 || null
    if (updates.cue3 !== undefined) dbUpdates.cue_3 = updates.cue3 || null
    if (updates.breathTransition !== undefined) dbUpdates.breath_transition = updates.breathTransition || null

    const data = await api.patch<DBPoseVariation>(`/pose-variations/${id}`, dbUpdates)
    return dbToAppVariation(data)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/pose-variations/${id}`)
  },

  async uploadImage(variationId: string, file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const data = await api.post<DBPoseVariation>(`/pose-variations/${variationId}/image`, formData, true)
    if (!data.image_url) {
      throw new Error('Image URL was not saved to database')
    }
    return data.image_url
  },

  async deleteImage(variationId: string, _imageUrl: string): Promise<void> {
    await api.delete(`/pose-variations/${variationId}/image`)
  }
}

export const sequenceService = {
  async getAll(userId: string): Promise<Sequence[]> {
    return api.get<Sequence[]>('/sequences', true)
  },

  async reorderSequences(userId: string, sequenceIds: string[]): Promise<void> {
    await api.post('/sequences/reorder', { sequenceIds }, true)
  },

  async getById(id: string, userId: string): Promise<Sequence | null> {
    const sequences = await this.getAll(userId)
    return sequences.find(s => s.id === id) || null
  },

  async create(sequence: Omit<Sequence, 'id' | 'user_id' | 'created_at' | 'updated_at'>, userId: string): Promise<Sequence> {
    return api.post<Sequence>('/sequences', sequence, true)
  },

  async update(id: string, updates: Partial<Sequence>, userId: string): Promise<Sequence> {
    return api.patch<Sequence>(`/sequences/${id}`, updates)
  },

  async delete(id: string, userId: string): Promise<void> {
    await api.delete(`/sequences/${id}`)
  },

  async isVariationUsedInAnySequence(variationId: string): Promise<{ used: boolean; sequenceNames: string[] }> {
    return api.get(`/sequences/check-variation/${variationId}`)
  },

  async isPoseUsedInAnySequence(poseId: string, variationIds: string[]): Promise<{ used: boolean; sequenceNames: string[] }> {
    const sequenceNamesSet = new Set<string>()
    for (const variationId of variationIds) {
      const result = await this.isVariationUsedInAnySequence(variationId)
      result.sequenceNames.forEach(name => sequenceNamesSet.add(name))
    }
    return { used: sequenceNamesSet.size > 0, sequenceNames: Array.from(sequenceNamesSet) }
  },

  async getByIdPublic(id: string): Promise<Sequence | null> {
    return api.get<Sequence | null>(`/sequences/public/${id}`)
  },

  async getPublishedByUserId(userId: string): Promise<Sequence[]> {
    return api.get<Sequence[]>(`/sequences/published/${userId}`)
  }
}

// Re-export types for backward compatibility
export type { Sequence } from './types'
