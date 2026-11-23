import { api } from './apiClient'
import { addDays, showsInUpcomingWeek, ymdWeekday, zonedToday } from './classCalendar'
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
  cancelReason?: 'instructor' | 'rsvps' | null
  cancelNote?: string
}

export interface ClassDateSkip {
  id: string
  eventId: string
  classDate: string
  note: string
  notifiedAt: string | null
}

export interface SkipNotice {
  emailed: number
  failed: number
  logged: number
}

export interface ClassRunStatus {
  eventId: string
  classDate: string
  minRsvps: number
  cancelHoursBefore: number
  rsvpCount: number
  deadline: string
  status: 'pending' | 'confirmed' | 'cancelled'
  reason?: 'instructor' | 'rsvps' | null
  note?: string
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
  cancel_reason?: 'instructor' | 'rsvps' | null
  cancel_note?: string
}

interface ApiOccurrence {
  event_id: string
  class_date: string
  min_rsvps: number
  cancel_hours_before: number
  rsvp_count: number
  deadline: string
  status: 'pending' | 'confirmed' | 'cancelled'
  reason?: 'instructor' | 'rsvps' | null
  note?: string
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
  const today = zonedToday(now)

  for (let offset = 0; offset <= 7; offset++) {
    const date = addDays(today, offset)
    const dayOfWeek = ymdWeekday(date)

    for (const event of events) {
      const matches = event.isRecurring
        ? Number(event.dayOfWeek) === dayOfWeek
        : event.date === date
      if (!matches || !showsInUpcomingWeek(event, date, now)) continue
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
    cancelReason: row.cancel_reason === 'instructor' || row.cancel_reason === 'rsvps' ? row.cancel_reason : null,
    cancelNote: row.cancel_note || '',
  }
}

export function cancellationLabel(reason?: string | null, note?: string | null): string {
  if (reason === 'instructor') {
    const trimmed = note?.trim()
    return trimmed ? `Cancelled — ${trimmed}` : 'Cancelled'
  }
  return 'Cancelled — not enough RSVPs'
}

function formatDecisionTime(deadline: string) {
  return new Date(deadline).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function rsvpsStillNeeded(status: ClassRunStatus) {
  return Math.max(0, status.minRsvps - status.rsvpCount)
}

export function formatRunStatus(status: ClassRunStatus): string {
  if (status.status === 'cancelled') return cancellationLabel(status.reason, status.note)
  if (status.status === 'confirmed') return `On · ${status.rsvpCount} of ${status.minRsvps} RSVPs`
  return `${status.rsvpCount} of ${status.minRsvps} RSVPs needed by ${formatDecisionTime(status.deadline)}`
}

export function formatStudentRunStatus(status: ClassRunStatus): string {
  if (status.status === 'cancelled') return cancellationLabel(status.reason, status.note)
  if (status.status === 'confirmed') return 'Confirmed'
  const remaining = rsvpsStillNeeded(status)
  if (remaining === 0) return 'Enough RSVPs to confirm this class'
  const label = remaining === 1 ? 'RSVP' : 'RSVPs'
  return `${remaining} more ${label} to ensure class is confirmed`
}

export function formatStudentRunDetail(status: ClassRunStatus): string {
  const people = status.minRsvps === 1 ? '1 person has' : `${status.minRsvps} people have`
  return `If fewer than ${people} RSVP'd by ${formatDecisionTime(status.deadline)}, the class is cancelled.`
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
      reason: row.reason === 'instructor' || row.reason === 'rsvps' ? row.reason : null,
      note: row.note || '',
    }))
  },

  async listSkips(): Promise<ClassDateSkip[]> {
    const result = await api.get<{ skips: Array<{
      id: string
      event_id: string
      class_date: string
      note?: string
      notified_at?: string | null
    }> }>('/classes/skips', true)
    return (result.skips || []).map((row) => ({
      id: row.id,
      eventId: row.event_id,
      classDate: row.class_date,
      note: row.note || '',
      notifiedAt: row.notified_at || null,
    }))
  },

  async skipDate(eventId: string, classDate: string, note: string): Promise<{ skip: ClassDateSkip; notice: SkipNotice }> {
    const result = await api.post<{
      skip: { id: string; event_id: string; class_date: string; note?: string; notified_at?: string | null }
      notice?: SkipNotice
    }>(
      '/classes/skips',
      { eventId, classDate, note },
      true,
    )
    return {
      skip: {
        id: result.skip.id,
        eventId: result.skip.event_id,
        classDate: result.skip.class_date,
        note: result.skip.note || '',
        notifiedAt: result.skip.notified_at || null,
      },
      notice: result.notice || { emailed: 0, failed: 0, logged: 0 },
    }
  },

  async restoreDate(eventId: string, classDate: string): Promise<SkipNotice> {
    const result = await api.post<{ notice?: SkipNotice }>(
      '/classes/skips/restore',
      { eventId, classDate },
      true,
    )
    return result.notice || { emailed: 0, failed: 0, logged: 0 }
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
