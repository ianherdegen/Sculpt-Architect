// @ts-nocheck
import { getDb, isProtectedInstructor, parseJson } from './db.js'
import { generateId } from './auth.js'
import { syncClassDecisions } from './booking.js'
import { addDays, zonedToday, zonedWallTimeToUtc } from '../src/lib/classCalendar.js'

let ready: Promise<void> | null = null

export function ensureLocationSchema() {
  if (!ready) {
    ready = setupLocations().catch((err) => {
      ready = null
      throw err
    })
  }
  return ready
}

async function setupLocations() {
  const db = getDb()
  await db.execute(`
    CREATE TABLE IF NOT EXISTS class_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      removed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS instructor_locations (
      user_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      PRIMARY KEY (user_id, location_id)
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_instructor_locations_location
    ON instructor_locations(location_id)
  `)
  await backfillLocations()
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name || name.length > 80) return null
  return name
}

function cleanAddress(value: unknown): string | null {
  if (value == null || value === '') return ''
  if (typeof value !== 'string') return null
  const address = value.trim().replace(/\s+/g, ' ')
  if (address.length > 160) return null
  return address
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function weekday(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

async function loadLocations() {
  const db = getDb()
  const result = await db.execute('SELECT * FROM class_locations ORDER BY name ASC')
  return result.rows
}

async function activeNameTaken(name: string, exceptId?: string) {
  const key = normalizeName(name)
  const rows = await loadLocations()
  return rows.some((row) => !row.removed_at && row.id !== exceptId && normalizeName(row.name) === key)
}

async function assignmentSet() {
  const db = getDb()
  const result = await db.execute('SELECT user_id, location_id FROM instructor_locations')
  return new Set(result.rows.map((row) => `${row.user_id}:${row.location_id}`))
}

async function ensureAssignment(userId: string, locationId: string, assigned: Set<string>) {
  const key = `${userId}:${locationId}`
  if (assigned.has(key)) return
  const db = getDb()
  await db.execute({
    sql: 'INSERT OR IGNORE INTO instructor_locations (user_id, location_id) VALUES (?, ?)',
    args: [userId, locationId],
  })
  assigned.add(key)
}

async function backfillLocations() {
  const db = getDb()
  const locations = await loadLocations()
  const activeByName = new Map<string, { id: string; name: string }>()
  const byId = new Map(locations.map((row) => [row.id, row]))
  for (const row of locations) {
    if (!row.removed_at) activeByName.set(normalizeName(String(row.name)), { id: String(row.id), name: String(row.name) })
  }
  const assigned = await assignmentSet()
  const profiles = await db.execute('SELECT user_id, events FROM user_profiles')

  for (const profile of profiles.rows) {
    const events = parseJson(profile.events, [])
    if (!Array.isArray(events) || events.length === 0) continue
    let changed = false
    for (const event of events) {
      if (!event || typeof event !== 'object') continue
      const linked = event.locationId ? byId.get(String(event.locationId)) : null
      if (linked && !linked.removed_at) {
        if (event.location !== linked.name) {
          event.location = linked.name
          changed = true
        }
        await ensureAssignment(String(profile.user_id), String(linked.id), assigned)
        continue
      }
      const name = cleanName(typeof event.location === 'string' ? event.location : '')
      if (!name) continue
      let location = activeByName.get(normalizeName(name))
      if (!location) {
        const id = generateId()
        await db.execute({
          sql: `INSERT INTO class_locations (id, name, address) VALUES (?, ?, '')`,
          args: [id, name],
        })
        location = { id, name }
        activeByName.set(normalizeName(name), location)
        byId.set(id, { id, name, removed_at: null })
      }
      if (event.locationId !== location.id || event.location !== location.name) {
        event.locationId = location.id
        event.location = location.name
        changed = true
      }
      await ensureAssignment(String(profile.user_id), location.id, assigned)
    }
    if (changed) {
      await db.execute({
        sql: `UPDATE user_profiles SET events = ?, updated_at = datetime('now') WHERE user_id = ?`,
        args: [JSON.stringify(events), profile.user_id],
      })
    }
  }
}

function formatLocation(row, extras: Record<string, unknown> = {}) {
  return {
    id: row.id,
    name: row.name,
    address: row.address || '',
    removed_at: row.removed_at || null,
    ...extras,
  }
}

async function classCounts() {
  const db = getDb()
  const profiles = await db.execute('SELECT events FROM user_profiles')
  const byId = new Map<string, number>()
  const byName = new Map<string, number>()
  for (const profile of profiles.rows) {
    const events = parseJson(profile.events, [])
    if (!Array.isArray(events)) continue
    for (const event of events) {
      if (!event || typeof event !== 'object') continue
      if (event.locationId) {
        const id = String(event.locationId)
        byId.set(id, (byId.get(id) || 0) + 1)
        continue
      }
      const name = cleanName(typeof event.location === 'string' ? event.location : '')
      if (!name) continue
      const key = normalizeName(name)
      byName.set(key, (byName.get(key) || 0) + 1)
    }
  }
  return { byId, byName }
}

function countFor(location, counts) {
  return (counts.byId.get(String(location.id)) || 0) + (counts.byName.get(normalizeName(String(location.name))) || 0)
}

async function instructorDirectory() {
  const db = getDb()
  const result = await db.execute(`
    SELECT up.user_id, up.name, up.permissions, u.email AS user_email
    FROM user_profiles up
    JOIN users u ON u.id = up.user_id
    ORDER BY u.email ASC
  `)
  return result.rows
    .filter((row) => {
      const permissions = parseJson(row.permissions, {})
      return permissions.instructor === true || isProtectedInstructor(row.user_email)
    })
    .map((row) => ({
      user_id: row.user_id,
      name: row.name || '',
      email: row.user_email,
    }))
}

async function assignmentsByLocation() {
  const db = getDb()
  const result = await db.execute('SELECT user_id, location_id FROM instructor_locations')
  const map = new Map<string, string[]>()
  for (const row of result.rows) {
    const list = map.get(String(row.location_id)) || []
    list.push(String(row.user_id))
    map.set(String(row.location_id), list)
  }
  return map
}

export async function listAdminLocations() {
  const [locations, counts, assignments, instructors] = await Promise.all([
    loadLocations(),
    classCounts(),
    assignmentsByLocation(),
    instructorDirectory(),
  ])
  return {
    locations: locations.map((row) => formatLocation(row, {
      class_count: countFor(row, counts),
      instructor_ids: assignments.get(String(row.id)) || [],
    })),
    instructors,
  }
}

export async function listActiveLocations() {
  const rows = await loadLocations()
  return rows.filter((row) => !row.removed_at).map((row) => formatLocation(row))
}

export async function listMyLocations(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT l.*
          FROM class_locations l
          JOIN instructor_locations il ON il.location_id = l.id
          WHERE il.user_id = ? AND l.removed_at IS NULL
          ORDER BY l.name ASC`,
    args: [userId],
  })
  return result.rows.map((row) => formatLocation(row))
}

export async function createLocation(input: { name?: unknown; address?: unknown }) {
  const name = cleanName(input.name)
  if (!name) return { error: 'Enter a studio name.', status: 400 as const }
  const address = cleanAddress(input.address)
  if (address == null) return { error: 'That address is too long.', status: 400 as const }
  if (await activeNameTaken(name)) {
    return { error: 'A studio with that name already exists.', status: 409 as const }
  }
  const db = getDb()
  const id = generateId()
  await db.execute({
    sql: 'INSERT INTO class_locations (id, name, address) VALUES (?, ?, ?)',
    args: [id, name, address],
  })
  return { location: formatLocation({ id, name, address, removed_at: null }, { class_count: 0, instructor_ids: [] }) }
}

async function replaceInstructors(locationId: string, instructorIds: unknown) {
  if (!Array.isArray(instructorIds)) return { error: 'Choose instructors for this studio.', status: 400 as const }
  const ids = [...new Set(instructorIds.filter((id) => typeof id === 'string' && id))]
  const allowed = new Set((await instructorDirectory()).map((instructor) => instructor.user_id))
  if (ids.some((id) => !allowed.has(id))) {
    return { error: 'Choose instructors from the instructor list.', status: 400 as const }
  }
  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM instructor_locations WHERE location_id = ?',
    args: [locationId],
  })
  for (const userId of ids) {
    await db.execute({
      sql: 'INSERT INTO instructor_locations (user_id, location_id) VALUES (?, ?)',
      args: [userId, locationId],
    })
  }
  return null
}

async function renameOnClasses(locationId: string, previousName: string, name: string) {
  if (previousName === name) return
  const db = getDb()
  const profiles = await db.execute('SELECT user_id, events FROM user_profiles')
  for (const profile of profiles.rows) {
    const events = parseJson(profile.events, [])
    if (!Array.isArray(events)) continue
    let changed = false
    for (const event of events) {
      if (event && event.locationId === locationId && event.location !== name) {
        event.location = name
        changed = true
      }
    }
    if (changed) {
      await db.execute({
        sql: `UPDATE user_profiles SET events = ?, updated_at = datetime('now') WHERE user_id = ?`,
        args: [JSON.stringify(events), profile.user_id],
      })
    }
  }
  const today = zonedToday()
  await db.execute({
    sql: `UPDATE class_rsvps SET location = ? WHERE location = ? AND class_date >= ?`,
    args: [name, previousName, today],
  })
}

export async function updateLocation(id: string, input: Record<string, unknown>) {
  const db = getDb()
  const existing = await db.execute({ sql: 'SELECT * FROM class_locations WHERE id = ?', args: [id] })
  const current = existing.rows[0]
  if (!current) return { error: 'Studio not found.', status: 404 as const }

  let name = String(current.name)
  let address = String(current.address || '')
  let removedAt = current.removed_at || null

  if (input.name !== undefined) {
    const cleaned = cleanName(input.name)
    if (!cleaned) return { error: 'Enter a studio name.', status: 400 as const }
    if (normalizeName(cleaned) !== normalizeName(name) && await activeNameTaken(cleaned, id)) {
      return { error: 'A studio with that name already exists.', status: 409 as const }
    }
    name = cleaned
  }
  if (input.address !== undefined) {
    const cleaned = cleanAddress(input.address)
    if (cleaned == null) return { error: 'That address is too long.', status: 400 as const }
    address = cleaned
  }
  if (input.removed === true && !removedAt) {
    const counts = await classCounts()
    if (countFor(current, counts) > 0) {
      return { error: 'This studio still has classes, so it can’t be removed.', status: 409 as const }
    }
    removedAt = new Date().toISOString()
  } else if (input.removed === false) {
    if (await activeNameTaken(name, id)) {
      return { error: 'A studio with that name already exists.', status: 409 as const }
    }
    removedAt = null
  }

  if (input.instructor_ids !== undefined) {
    const failed = await replaceInstructors(id, input.instructor_ids)
    if (failed) return failed
  }

  await db.execute({
    sql: `UPDATE class_locations
          SET name = ?, address = ?, removed_at = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [name, address, removedAt, id],
  })
  await renameOnClasses(id, String(current.name), name)

  const counts = await classCounts()
  const assignments = await assignmentsByLocation()
  return {
    location: formatLocation(
      { id, name, address, removed_at: removedAt },
      { class_count: countFor({ id, name }, counts), instructor_ids: assignments.get(id) || [] },
    ),
  }
}

export async function bindEventLocations(userId: string, nextEvents: unknown) {
  if (!Array.isArray(nextEvents)) return { error: 'Classes are invalid.', status: 400 as const }
  const db = getDb()
  const previousRow = await db.execute({
    sql: 'SELECT events FROM user_profiles WHERE user_id = ?',
    args: [userId],
  })
  const previous = parseJson(previousRow.rows[0]?.events, [])
  const previousById = new Map(
    (Array.isArray(previous) ? previous : [])
      .filter((event) => event && event.id)
      .map((event) => [String(event.id), event]),
  )
  const locations = await loadLocations()
  const byId = new Map(locations.map((row) => [String(row.id), row]))
  const assigned = await db.execute({
    sql: `SELECT location_id FROM instructor_locations WHERE user_id = ?`,
    args: [userId],
  })
  const assignedIds = new Set(
    assigned.rows
      .map((row) => byId.get(String(row.location_id)))
      .filter((row) => row && !row.removed_at)
      .map((row) => String(row.id)),
  )

  const bound = []
  for (const event of nextEvents) {
    if (!event || typeof event !== 'object') return { error: 'Classes are invalid.', status: 400 as const }
    const prev = previousById.get(String(event.id || ''))
    let locationId = typeof event.locationId === 'string' ? event.locationId : ''
    if (!locationId && prev?.locationId) locationId = String(prev.locationId)
    const location = byId.get(locationId)
    const label = typeof event.title === 'string' && event.title.trim() ? event.title.trim() : 'A class'
    if (!location || location.removed_at) {
      return { error: `${label} needs an approved studio.`, status: 400 as const }
    }
    const kept = prev && String(prev.locationId) === locationId
    if (!assignedIds.has(locationId) && !kept) {
      return { error: `You are not approved to host classes at ${location.name}.`, status: 400 as const }
    }
    bound.push({ ...event, locationId, location: location.name })
  }
  return { events: bound }
}

export async function listClassesAtLocation(locationId: string, account: { id: string; email: string }) {
  const db = getDb()
  const locationRow = await db.execute({
    sql: 'SELECT * FROM class_locations WHERE id = ? AND removed_at IS NULL',
    args: [locationId],
  })
  const location = locationRow.rows[0]
  if (!location) return { error: 'Studio not found.', status: 404 as const }

  const today = zonedToday()
  const endDate = addDays(today, 6)
  const profiles = await db.execute(`
    SELECT user_id, name, share_id, events, is_banned
    FROM user_profiles
  `)
  const hosts = []
  for (const profile of profiles.rows) {
    if (profile.is_banned === 1 || profile.is_banned === true || !profile.share_id) continue
    const events = parseJson(profile.events, [])
    if (!Array.isArray(events)) continue
    const here = events.filter((event) => event && String(event.locationId) === locationId)
    if (here.length === 0) continue
    if (here.some((event) => event.minRsvps)) await syncClassDecisions(String(profile.user_id), events)
    hosts.push({ profile, events: here })
  }

  const decisions = await db.execute({
    sql: `SELECT profile_user_id, event_id, class_date, status
          FROM class_occurrence_decisions
          WHERE class_date >= ? AND class_date <= ?`,
    args: [today, endDate],
  })
  const cancelled = new Set(
    decisions.rows
      .filter((row) => row.status === 'cancelled')
      .map((row) => `${row.profile_user_id}:${row.event_id}:${row.class_date}`),
  )
  const rsvps = await db.execute({
    sql: `SELECT profile_user_id, event_id, class_date
          FROM class_rsvps
          WHERE class_date >= ? AND class_date <= ?
            AND (user_id = ? OR (user_id IS NULL AND email = ?))`,
    args: [today, endDate, account.id, account.email],
  })
  const going = new Set(rsvps.rows.map((row) => `${row.profile_user_id}:${row.event_id}:${row.class_date}`))

  const now = new Date()
  const classes = []
  for (const { profile, events } of hosts) {
    for (const event of events) {
      if (!event.id || !event.title || !event.startTime || !event.endTime) continue
      for (let offset = 0; offset < 7; offset++) {
        const classDate = addDays(today, offset)
        const matches = event.isRecurring
          ? Number(event.dayOfWeek) === weekday(classDate)
          : event.date === classDate
        if (!matches) continue
        const end = zonedWallTimeToUtc(classDate, event.endTime)
        if (end && end.getTime() <= now.getTime()) continue
        const key = `${profile.user_id}:${event.id}:${classDate}`
        classes.push({
          event_id: String(event.id),
          class_date: classDate,
          title: event.title,
          start_time: event.startTime,
          end_time: event.endTime,
          instructor_name: profile.name || '',
          instructor_share_id: profile.share_id,
          own_class: profile.user_id === account.id,
          going: going.has(key),
          cancelled: cancelled.has(key),
        })
      }
    }
  }

  classes.sort((a, b) => a.class_date.localeCompare(b.class_date) || a.start_time.localeCompare(b.start_time) || a.title.localeCompare(b.title))
  return { classes, location: formatLocation(location) }
}
