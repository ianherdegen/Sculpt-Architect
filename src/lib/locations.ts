import { api } from './apiClient'

export interface Studio {
  id: string
  name: string
  address: string
  removed_at?: string | null
  class_count?: number
  instructor_ids?: string[]
}

export interface StudioInstructor {
  user_id: string
  name: string
  email: string
}

export interface BookableClass {
  eventId: string
  classDate: string
  title: string
  startTime: string
  endTime: string
  instructorName: string
  instructorShareId: string
  ownClass: boolean
  going: boolean
}

interface ApiBookableClass {
  event_id: string
  class_date: string
  title: string
  start_time: string
  end_time: string
  instructor_name?: string
  instructor_share_id?: string
  own_class?: boolean
  going?: boolean
}

function toClass(row: ApiBookableClass): BookableClass {
  return {
    eventId: row.event_id,
    classDate: row.class_date,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    instructorName: row.instructor_name || '',
    instructorShareId: row.instructor_share_id || '',
    ownClass: row.own_class === true,
    going: row.going === true,
  }
}

export const locationService = {
  async list(): Promise<Studio[]> {
    const result = await api.get<{ locations: Studio[] }>('/locations', true)
    return result.locations || []
  },

  async mine(): Promise<Studio[]> {
    const result = await api.get<{ locations: Studio[] }>('/locations/mine', true)
    return result.locations || []
  },

  async classes(locationId: string): Promise<BookableClass[]> {
    const result = await api.get<{ classes: ApiBookableClass[] }>(
      `/locations/${encodeURIComponent(locationId)}/classes`,
      true,
    )
    return (result.classes || []).map(toClass)
  },

  async adminList(): Promise<{ locations: Studio[]; instructors: StudioInstructor[] }> {
    return api.get<{ locations: Studio[]; instructors: StudioInstructor[] }>('/admin/locations', true)
  },

  async create(input: { name: string; address: string }): Promise<Studio> {
    const result = await api.post<{ location: Studio }>('/admin/locations', input, true)
    return result.location
  },

  async update(id: string, patch: {
    name?: string
    address?: string
    removed?: boolean
    instructor_ids?: string[]
  }): Promise<Studio> {
    const result = await api.patch<{ location: Studio }>(`/admin/locations/${encodeURIComponent(id)}`, patch)
    return result.location
  },
}
