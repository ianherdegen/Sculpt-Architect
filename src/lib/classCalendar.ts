export const CLASS_TIME_ZONE = 'America/Detroit'

export type ReminderKind = 'day' | 'two_hours'

/** Hours-until-start window in which that reminder is due. Wider than one hour so an hourly job still hits it. */
export const REMINDER_WINDOWS: Record<ReminderKind, { minHours: number; maxHours: number }> = {
  day: { minHours: 22, maxHours: 26 },
  two_hours: { minHours: 0.75, maxHours: 2.5 },
}

export interface CalendarClass {
  title: string
  classDate: string
  startTime: string
  endTime: string
  location: string
  description?: string
  uid?: string
}

export function zonedToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLASS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Convert a Detroit wall-clock time on a calendar date to a UTC instant. */
export function zonedWallTimeToUtc(ymd: string, time: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time || '')
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const [year, month, day] = ymd.split('-').map(Number)
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0)
  const parts: Record<string, string> = {}
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone: CLASS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcGuess))) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return new Date(utcGuess - (asUtc - utcGuess))
}

export function classInstants(item: Pick<CalendarClass, 'classDate' | 'startTime' | 'endTime'>) {
  const start = zonedWallTimeToUtc(item.classDate, item.startTime)
  const end = zonedWallTimeToUtc(item.classDate, item.endTime)
  if (!start || !end) return null
  const endInstant = end.getTime() <= start.getTime()
    ? new Date(end.getTime() + 24 * 60 * 60 * 1000)
    : end
  return { start, end: endInstant }
}

export function hoursUntilStart(start: Date, now: Date): number {
  return (start.getTime() - now.getTime()) / (60 * 60 * 1000)
}

export function dueReminderKinds(hoursUntil: number): ReminderKind[] {
  const kinds: ReminderKind[] = []
  for (const kind of ['day', 'two_hours'] as ReminderKind[]) {
    const window = REMINDER_WINDOWS[kind]
    if (hoursUntil > window.minHours && hoursUntil <= window.maxHours) kinds.push(kind)
  }
  return kinds
}

export function formatWallTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  if (Number.isNaN(hour) || minutes == null) return time
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

export function formatWallDate(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number)
  if (!year || !month || !day) return ymd
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function calendarDescription(input: {
  instructorName?: string
  description?: string
}): string {
  const lines: string[] = []
  if (input.instructorName) lines.push(`With ${input.instructorName}`)
  if (input.description) lines.push(input.description)
  lines.push('Reserved on Sculpt Sequences')
  return lines.join('\n')
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function googleCalendarUrl(item: CalendarClass): string | null {
  const instants = classInstants(item)
  if (!instants) return null
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.title,
    dates: `${utcStamp(instants.start)}/${utcStamp(instants.end)}`,
    location: item.location || '',
    details: item.description || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildIcs(item: CalendarClass): string | null {
  const instants = classInstants(item)
  if (!instants) return null
  const uid = item.uid || `${item.classDate}-${item.startTime}-${item.title}@sculpt-sequences`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sculpt Sequences//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(instants.start)}`,
    `DTEND:${utcStamp(instants.end)}`,
    `SUMMARY:${escapeIcs(item.title)}`,
    `LOCATION:${escapeIcs(item.location || '')}`,
    `DESCRIPTION:${escapeIcs(item.description || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.join('\r\n')}\r\n`
}
