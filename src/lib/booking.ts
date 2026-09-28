import { api } from './apiClient'
import type { ClassEvent } from './types'

export interface ClassOccurrence {
  eventId: string
  date: string
  title: string
  startTime: string
  endTime: string
  location: string
  description?: string
}

export interface ClassRsvp {
  id: string
  eventId: string
  classDate: string
  email: string
  title: string
  startTime: string
  endTime: string
  location: string
  createdAt: string
  instructorName?: string
  instructorShareId?: string
  cancelled?: boolean
}

export interface ClassRunStatus {
  eventId: string
  classDate: string
  minRsvps: number
  cancelHoursBefore: number
  rsvpCount: number
  deadline: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

interface ApiRsvp {
  id: string
  event_id: string
  class_date: string
  email: string
  title: string
  start_time: string
  end_time: string
  location: string
  created_at: string
  instructor_name?: string
  instructor_share_id?: string
  cancelled?: boolean
}

interface ApiOccurrence {
  event_id: string
  class_date: string
  min_rsvps: number
  cancel_hours_before: number
  rsvp_count: number
  deadline: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

export function occurrenceKey(eventId: string, date: string) {
  return `${eventId}:${date}`
}

export function localToday(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function minutesOf(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function formatClassTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  if (Number.isNaN(hour) || minutes == null) return time
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

export function formatClassDate(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function upcomingWeek(events: ClassEvent[], now = new Date()): ClassOccurrence[] {
  const occurrences: ClassOccurrence[] = []
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(start)
    day.setDate(start.getDate() + offset)
    const date = localToday(day)
    const dayOfWeek = day.getDay()

    for (const event of events) {
      const matches = event.isRecurring
        ? event.dayOfWeek === dayOfWeek
        : event.date === date
      if (!matches) continue
      if (offset === 0) {
        const end = minutesOf(event.endTime)
        const nowMinutes = now.getHours() * 60 + now.getMinutes()
        if (end != null && end <= nowMinutes) continue
      }
      occurrences.push({
        eventId: event.id,
        date,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        description: event.description,
      })
    }
  }

  occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  return occurrences
}

function toRsvp(row: ApiRsvp): ClassRsvp {
  return {
    id: row.id,
    eventId: row.event_id,
    classDate: row.class_date,
    email: row.email,
    title: row.title,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    createdAt: row.created_at,
    instructorName: row.instructor_name || '',
    instructorShareId: row.instructor_share_id || '',
    cancelled: row.cancelled === true,
  }
}

export function formatRunStatus(status: ClassRunStatus): string {
  if (status.status === 'cancelled') return 'Cancelled — not enough RSVPs'
  if (status.status === 'confirmed') return `On · ${status.rsvpCount} of ${status.minRsvps} RSVPs`
  const when = new Date(status.deadline).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${status.rsvpCount} of ${status.minRsvps} RSVPs needed by ${when}`
}

export const bookingService = {
  async listOccurrences(shareId: string): Promise<ClassRunStatus[]> {
    const result = await api.get<{ occurrences: ApiOccurrence[] }>(
      `/book/${encodeURIComponent(shareId)}/occurrences`
    )
    return (result.occurrences || []).map((row) => ({
      eventId: row.event_id,
      classDate: row.class_date,
      minRsvps: row.min_rsvps,
      cancelHoursBefore: row.cancel_hours_before,
      rsvpCount: row.rsvp_count,
      deadline: row.deadline,
      status: row.status,
    }))
  },

  async listReceived(): Promise<ClassRsvp[]> {
    const result = await api.get<{ rsvps: ApiRsvp[] }>('/book/received', true)
    return (result.rsvps || []).map(toRsvp)
  },

  async listMine(): Promise<ClassRsvp[]> {
    const result = await api.get<{ rsvps: ApiRsvp[] }>('/book/mine', true)
    return (result.rsvps || []).map(toRsvp)
  },

  async listRsvps(shareId: string): Promise<ClassRsvp[]> {
    const result = await api.get<{ rsvps: ApiRsvp[] }>(
      `/book/${encodeURIComponent(shareId)}/rsvps`,
      true
    )
    return (result.rsvps || []).map(toRsvp)
  },

  async rsvp(shareId: string, eventId: string, classDate: string): Promise<ClassRsvp> {
    const result = await api.post<{ rsvp: ApiRsvp }>(
      `/book/${encodeURIComponent(shareId)}/rsvps`,
      { eventId, classDate },
      true
    )
    return toRsvp(result.rsvp)
  },

  async cancel(shareId: string, eventId: string, classDate: string): Promise<void> {
    await api.post(
      `/book/${encodeURIComponent(shareId)}/rsvps/cancel`,
      { eventId, classDate },
      true
    )
  },
}
