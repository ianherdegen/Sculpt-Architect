// @ts-nocheck
import { getDb, parseJson, resolveViewMode, rowToBool } from './db.js'
import { generateId } from './auth.js'
import { newRsvpsClosed, RSVP_CLOSED_MESSAGE, showsInUpcomingWeek, zonedToday, zonedWallTimeToUtc } from '../src/lib/classCalendar.js'

let schemaReady = false

export async function ensureBookingSchema() {
  if (schemaReady) return
  const db = getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS class_rsvps (
      id TEXT PRIMARY KEY,
      profile_user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      class_date TEXT NOT NULL,
      email TEXT NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT NOT NULL,
      user_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(profile_user_id, event_id, class_date, email)
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_class_rsvps_profile_email
    ON class_rsvps(profile_user_id, email)
  `)
  try {
    await db.execute(`ALTER TABLE class_rsvps ADD COLUMN user_id TEXT`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (!/duplicate column/i.test(message)) throw err
  }
  try {
    await db.execute(`ALTER TABLE class_rsvps ADD COLUMN calendar_token TEXT`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (!/duplicate column/i.test(message)) throw err
  }
  await db.execute(`
    CREATE TABLE IF NOT EXISTS class_occurrence_decisions (
      id TEXT PRIMARY KEY,
      profile_user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      class_date TEXT NOT NULL,
      status TEXT NOT NULL,
      rsvp_count INTEGER NOT NULL,
      min_rsvps INTEGER NOT NULL,
      decided_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(profile_user_id, event_id, class_date)
    )
  `)
  schemaReady = true
}

export function normalizeBookingEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

function parseYmd(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return value
}

function addDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekday(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export async function getBookableProfile(shareId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM user_profiles WHERE share_id = ?',
    args: [shareId],
  })
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  if (rowToBool(row.is_banned)) return null
  return {
    userId: row.user_id as string,
    name: (row.name as string) || '',
    shareId: (row.share_id as string) || shareId,
    events: parseJson(row.events, []),
  }
}

function findClass(events: any[], eventId: string, classDate: string) {
  const event = events.find((item) => item && item.id === eventId)
  if (!event) return null
  if (event.isRecurring) {
    if (Number(event.dayOfWeek) !== weekday(classDate)) return null
  } else if (event.date !== classDate) {
    return null
  }
  if (!event.title || !event.startTime || !event.endTime || !event.location) return null
  return event
}

function formatRsvp(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    event_id: row.event_id as string,
    class_date: row.class_date as string,
    email: row.email as string,
    title: row.title as string,
    start_time: row.start_time as string,
    end_time: row.end_time as string,
    location: row.location as string,
    created_at: row.created_at as string,
  }
}

export async function listReceivedRsvps(profileUserId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM class_rsvps
          WHERE profile_user_id = ?
          ORDER BY class_date ASC, start_time ASC, email ASC`,
    args: [profileUserId],
  })
  return result.rows.map((row) => formatRsvp(row))
}

export async function getViewMode(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT view_mode, permissions FROM user_profiles WHERE user_id = ?',
    args: [userId],
  })
  if (result.rows.length === 0) return 'student'
  return resolveViewMode(result.rows[0])
}

export async function listMyRsvps(userId: string, email: string) {
  await syncAllClassDecisions()
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT r.*, p.name AS instructor_name, p.share_id AS instructor_share_id,
                 d.status AS decision_status
          FROM class_rsvps r
          LEFT JOIN user_profiles p ON p.user_id = r.profile_user_id
          LEFT JOIN class_occurrence_decisions d
            ON d.profile_user_id = r.profile_user_id
           AND d.event_id = r.event_id
           AND d.class_date = r.class_date
          WHERE (r.user_id = ? OR (r.user_id IS NULL AND r.email = ?))
            AND r.profile_user_id != ?
          ORDER BY r.class_date ASC, r.start_time ASC`,
    args: [userId, email, userId],
  })
  return result.rows.map((row) => ({
    ...formatRsvp(row),
    instructor_name: (row.instructor_name as string) || '',
    instructor_share_id: (row.instructor_share_id as string) || '',
    cancelled: row.decision_status === 'cancelled',
  }))
}

export async function listRsvps(profileUserId: string, userId: string, email: string) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM class_rsvps
          WHERE profile_user_id = ? AND (user_id = ? OR (user_id IS NULL AND email = ?))
          ORDER BY class_date ASC, start_time ASC`,
    args: [profileUserId, userId, email],
  })
  return result.rows.map((row) => formatRsvp(row))
}

const DEFAULT_CANCEL_HOURS = 12

function positiveInt(value: unknown, max = 999) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(number) || number < 1 || number > max) return null
  return number
}

function classRequirement(event: any) {
  const minRsvps = positiveInt(event?.minRsvps)
  if (!minRsvps) return null
  return {
    minRsvps,
    hours: positiveInt(event.cancelHoursBefore, 24 * 90) || DEFAULT_CANCEL_HOURS,
  }
}

export function mergeClassRequirements(previousEvents: any[], nextEvents: any[], isAdmin: boolean) {
  const previousById = new Map(
    (Array.isArray(previousEvents) ? previousEvents : [])
      .filter((event) => event && event.id)
      .map((event) => [String(event.id), event])
  )
  return (Array.isArray(nextEvents) ? nextEvents : []).map((event) => {
    if (!event || typeof event !== 'object') return event
    const next = { ...event }
    const previous = previousById.get(String(event.id))
    if (!isAdmin || !Object.prototype.hasOwnProperty.call(event, 'minRsvps')) {
      if (previous && classRequirement(previous)) {
        next.minRsvps = previous.minRsvps
        next.cancelHoursBefore = previous.cancelHoursBefore
      } else {
        delete next.minRsvps
        delete next.cancelHoursBefore
      }
      return next
    }
    const requirement = classRequirement(next)
    if (!requirement) {
      delete next.minRsvps
      delete next.cancelHoursBefore
      return next
    }
    next.minRsvps = requirement.minRsvps
    next.cancelHoursBefore = requirement.hours
    return next
  })
}

function occurrenceDates(event: any, fromYmd: string, toYmd: string) {
  const dates: string[] = []
  for (let date = fromYmd; date <= toYmd; date = addDays(date, 1)) {
    if (event.isRecurring) {
      if (Number(event.dayOfWeek) === weekday(date)) dates.push(date)
    } else if (event.date === date) {
      dates.push(date)
    }
  }
  return dates
}

async function rsvpCounts(profileUserId: string, fromYmd: string, toYmd: string) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT event_id, class_date, COUNT(*) AS n
          FROM class_rsvps
          WHERE profile_user_id = ? AND class_date >= ? AND class_date <= ?
          GROUP BY event_id, class_date`,
    args: [profileUserId, fromYmd, toYmd],
  })
  const counts = new Map<string, number>()
  for (const row of result.rows) {
    counts.set(`${row.event_id}:${row.class_date}`, Number(row.n))
  }
  return counts
}

export async function syncClassDecisions(profileUserId: string, events: any[], now = new Date()) {
  const fromYmd = addDays(zonedToday(now), -1)
  const toYmd = addDays(fromYmd, 9)
  const required = (Array.isArray(events) ? events : [])
    .map((event) => ({ event, requirement: classRequirement(event) }))
    .filter((item) => item.requirement && item.event?.id)
  const db = getDb()
  if (required.length === 0) {
    await db.execute({
      sql: 'DELETE FROM class_occurrence_decisions WHERE profile_user_id = ?',
      args: [profileUserId],
    })
    return
  }
  const requiredIds = required.map((item) => String(item.event.id))
  await db.execute({
    sql: `DELETE FROM class_occurrence_decisions
          WHERE profile_user_id = ? AND event_id NOT IN (${requiredIds.map(() => '?').join(', ')})`,
    args: [profileUserId, ...requiredIds],
  })
  const existing = await db.execute({
    sql: `SELECT event_id, class_date FROM class_occurrence_decisions
          WHERE profile_user_id = ? AND class_date >= ? AND class_date <= ?`,
    args: [profileUserId, fromYmd, toYmd],
  })
  const decided = new Set(existing.rows.map((row) => `${row.event_id}:${row.class_date}`))
  const counts = await rsvpCounts(profileUserId, fromYmd, toYmd)

  for (const { event, requirement } of required) {
    for (const classDate of occurrenceDates(event, fromYmd, toYmd)) {
      const key = `${event.id}:${classDate}`
      const start = zonedWallTimeToUtc(classDate, event.startTime)
      if (!start) continue
      const deadline = start.getTime() - requirement.hours * 60 * 60 * 1000
      if (now.getTime() < deadline) {
        if (decided.has(key)) {
          await db.execute({
            sql: `DELETE FROM class_occurrence_decisions
                  WHERE profile_user_id = ? AND event_id = ? AND class_date = ?`,
            args: [profileUserId, String(event.id), classDate],
          })
          decided.delete(key)
        }
        continue
      }
      if (decided.has(key)) continue
      const count = counts.get(key) || 0
      try {
        await db.execute({
          sql: `INSERT INTO class_occurrence_decisions
                (id, profile_user_id, event_id, class_date, status, rsvp_count, min_rsvps)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            generateId(),
            profileUserId,
            String(event.id),
            classDate,
            count >= requirement.minRsvps ? 'confirmed' : 'cancelled',
            count,
            requirement.minRsvps,
          ],
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        if (!message.includes('UNIQUE')) throw err
      }
      decided.add(key)
    }
  }
}

export async function syncAllClassDecisions() {
  const db = getDb()
  const result = await db.execute('SELECT user_id, events FROM user_profiles')
  for (const row of result.rows) {
    const events = parseJson(row.events, [])
    if (events.some((event) => classRequirement(event))) {
      await syncClassDecisions(row.user_id as string, events)
    }
  }
}

export async function listOccurrenceStatuses(profileUserId: string, events: any[], now = new Date()) {
  await syncClassDecisions(profileUserId, events, now)
  const fromYmd = addDays(zonedToday(now), -1)
  const toYmd = addDays(fromYmd, 9)
  const db = getDb()
  const decisions = await db.execute({
    sql: `SELECT event_id, class_date, status FROM class_occurrence_decisions
          WHERE profile_user_id = ? AND class_date >= ? AND class_date <= ?`,
    args: [profileUserId, fromYmd, toYmd],
  })
  const decisionByKey = new Map(decisions.rows.map((row) => [`${row.event_id}:${row.class_date}`, row.status]))
  const counts = await rsvpCounts(profileUserId, fromYmd, toYmd)
  const statuses = []
  for (const event of Array.isArray(events) ? events : []) {
    const requirement = classRequirement(event)
    if (!requirement || !event?.id) continue
    for (const classDate of occurrenceDates(event, fromYmd, toYmd)) {
      const start = zonedWallTimeToUtc(classDate, event.startTime)
      if (!start) continue
      const key = `${event.id}:${classDate}`
      const decided = decisionByKey.get(key)
      statuses.push({
        event_id: String(event.id),
        class_date: classDate,
        min_rsvps: requirement.minRsvps,
        cancel_hours_before: requirement.hours,
        rsvp_count: counts.get(key) || 0,
        deadline: new Date(start.getTime() - requirement.hours * 60 * 60 * 1000).toISOString(),
        status: decided === 'cancelled' || decided === 'confirmed' ? decided : 'pending',
      })
    }
  }
  return statuses
}

async function occurrenceDecision(profileUserId: string, eventId: string, classDate: string) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT status FROM class_occurrence_decisions
          WHERE profile_user_id = ? AND event_id = ? AND class_date = ?`,
    args: [profileUserId, eventId, classDate],
  })
  return (result.rows[0]?.status as string) || null
}

export async function createRsvp(profile: { userId: string; events: any[] }, account: { id: string; email: string }, eventId: string, classDate: string) {
  const event = findClass(profile.events, eventId, classDate)
  if (!event) {
    return { error: 'That class is not on this schedule.', status: 400 as const }
  }
  if (!showsInUpcomingWeek(event, classDate)) {
    return { error: 'That class is outside the upcoming week.', status: 400 as const }
  }
  await syncClassDecisions(profile.userId, profile.events)
  if (classRequirement(event) && await occurrenceDecision(profile.userId, eventId, classDate) === 'cancelled') {
    return { error: 'This class was cancelled because it did not get enough RSVPs.', status: 409 as const }
  }
  if (newRsvpsClosed(classDate, event.startTime)) {
    const db = getDb()
    const existing = await db.execute({
      sql: `SELECT id FROM class_rsvps
            WHERE profile_user_id = ? AND event_id = ? AND class_date = ? AND email = ?`,
      args: [profile.userId, eventId, classDate, account.email],
    })
    if (existing.rows.length === 0) {
      return { error: RSVP_CLOSED_MESSAGE, status: 400 as const }
    }
  }

  const db = getDb()
  const id = generateId()
  const calendarToken = generateId()
  try {
    await db.execute({
      sql: `INSERT INTO class_rsvps
            (id, profile_user_id, event_id, class_date, email, title, start_time, end_time, location, user_id, calendar_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        profile.userId,
        eventId,
        classDate,
        account.email,
        event.title,
        event.startTime,
        event.endTime,
        event.location,
        account.id,
        calendarToken,
      ],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (!message.includes('UNIQUE')) throw err
    await db.execute({
      sql: `UPDATE class_rsvps
            SET user_id = ?, calendar_token = COALESCE(calendar_token, ?)
            WHERE profile_user_id = ? AND event_id = ? AND class_date = ? AND email = ?`,
      args: [account.id, calendarToken, profile.userId, eventId, classDate, account.email],
    })
  }

  const existing = await db.execute({
    sql: `SELECT * FROM class_rsvps
          WHERE profile_user_id = ? AND event_id = ? AND class_date = ? AND email = ?`,
    args: [profile.userId, eventId, classDate, account.email],
  })
  return { rsvp: formatRsvp(existing.rows[0]) }
}

export async function cancelRsvp(profileUserId: string, account: { id: string; email: string }, eventId: string, classDate: string) {
  const db = getDb()
  await db.execute({
    sql: `DELETE FROM class_rsvps
          WHERE profile_user_id = ? AND event_id = ? AND class_date = ?
            AND (user_id = ? OR (user_id IS NULL AND email = ?))`,
    args: [profileUserId, eventId, classDate, account.id, account.email],
  })
}
