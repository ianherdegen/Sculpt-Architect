// @ts-nocheck
import { getDb, rowToBool } from './db.js'
import { generateId } from './auth.js'
import { ensureBookingSchema } from './booking.js'
import {
  addDays,
  buildIcs,
  calendarDescription,
  classInstants,
  dueReminderKinds,
  formatWallDate,
  formatWallTime,
  googleCalendarUrl,
  hoursUntilStart,
  zonedToday,
} from '../src/lib/classCalendar.js'

let schemaReady = false

async function addColumn(db, table, column, definition) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!/duplicate column/i.test(message)) throw err
  }
}

export async function ensureReminderSchema() {
  if (schemaReady) return
  await ensureBookingSchema()
  const db = getDb()
  await addColumn(db, 'user_profiles', 'notify_day_before', 'INTEGER NOT NULL DEFAULT 1')
  await addColumn(db, 'user_profiles', 'notify_two_hours', 'INTEGER NOT NULL DEFAULT 1')
  await addColumn(db, 'class_rsvps', 'calendar_token', 'TEXT')
  await db.execute(`
    CREATE TABLE IF NOT EXISTS class_reminder_sends (
      id TEXT PRIMARY KEY,
      rsvp_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(rsvp_id, kind)
    )
  `)
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_class_rsvps_calendar_token
    ON class_rsvps(calendar_token)
  `)
  schemaReady = true
}

function appOrigin() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wantsReminder(profile, kind) {
  if (!profile) return true
  const raw = kind === 'day' ? profile.notify_day_before : profile.notify_two_hours
  if (raw == null) return true
  return rowToBool(raw)
}

async function ensureCalendarToken(rsvp) {
  if (rsvp.calendar_token) return rsvp.calendar_token
  const token = generateId()
  const db = getDb()
  await db.execute({
    sql: `UPDATE class_rsvps
          SET calendar_token = ?
          WHERE id = ? AND calendar_token IS NULL`,
    args: [token, rsvp.id],
  })
  const result = await db.execute({
    sql: 'SELECT calendar_token FROM class_rsvps WHERE id = ?',
    args: [rsvp.id],
  })
  return (result.rows[0]?.calendar_token as string) || token
}

function reminderCopy(kind) {
  if (kind === 'day') {
    return {
      subjectPrefix: 'Class tomorrow',
      lead: 'Your class is tomorrow.',
    }
  }
  return {
    subjectPrefix: 'Class in 2 hours',
    lead: 'Your class starts in about 2 hours.',
  }
}

function reminderHtml({ kind, title, when, location, instructorName, googleUrl, icsUrl }) {
  const copy = reminderCopy(kind)
  const buttons = []
  if (googleUrl) {
    buttons.push(`<a href="${escapeHtml(googleUrl)}" style="display:inline-block;padding:12px 18px;background:#030213;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Google Calendar</a>`)
  }
  if (icsUrl) {
    buttons.push(`<a href="${escapeHtml(icsUrl)}" style="display:inline-block;padding:12px 18px;background:#ffffff;color:#030213;text-decoration:none;border-radius:6px;font-weight:600;border:1px solid #030213;">iCal</a>`)
  }
  const withLine = instructorName
    ? `<p style="color:#717182;font-size:16px;line-height:1.6;margin:0 0 8px;">With ${escapeHtml(instructorName)}</p>`
    : ''
  return `
    <h2 style="color:#030213;font-size:24px;margin:0 0 12px;">${escapeHtml(copy.lead)}</h2>
    <p style="color:#030213;font-size:18px;font-weight:600;margin:0 0 8px;">${escapeHtml(title)}</p>
    <p style="color:#717182;font-size:16px;line-height:1.6;margin:0 0 8px;">${escapeHtml(when)} Eastern Time</p>
    <p style="color:#717182;font-size:16px;line-height:1.6;margin:0 0 8px;">${escapeHtml(location)}</p>
    ${withLine}
    <p style="margin:24px 0 8px;">${buttons.join(' ')}</p>
    <p style="color:#717182;font-size:13px;line-height:1.6;">The iCal file is also attached. Change these reminders anytime in your profile.</p>
  `
}

async function deliverEmail({ to, subject, html, ics, filename }) {
  const from = process.env.EMAIL_FROM
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'RESEND_API_KEY is not set' }
    }
    console.log(`[class-reminders] (no RESEND_API_KEY) would email ${to}: ${subject}`)
    return { ok: true, logged: true }
  }
  if (!from) return { ok: false, error: 'EMAIL_FROM is not set' }

  const payload = { from, to, subject, html }
  if (ics) {
    payload.attachments = [{
      filename: filename || 'class.ics',
      content: Buffer.from(ics).toString('base64'),
    }]
  }

  let res
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 300)}` }
  }
  return { ok: true, logged: false }
}

async function claimSend(rsvpId, kind) {
  const db = getDb()
  try {
    await db.execute({
      sql: `INSERT INTO class_reminder_sends (id, rsvp_id, kind) VALUES (?, ?, ?)`,
      args: [generateId(), rsvpId, kind],
    })
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/UNIQUE/i.test(message)) return false
    throw err
  }
}

async function releaseSend(rsvpId, kind) {
  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM class_reminder_sends WHERE rsvp_id = ? AND kind = ?',
    args: [rsvpId, kind],
  })
}

export async function icsForCalendarToken(token) {
  if (!token || typeof token !== 'string' || token.length > 80) return null
  await ensureReminderSchema()
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT r.*, instructor.name AS instructor_name, d.status AS decision_status
          FROM class_rsvps r
          LEFT JOIN user_profiles instructor ON instructor.user_id = r.profile_user_id
          LEFT JOIN class_occurrence_decisions d
            ON d.profile_user_id = r.profile_user_id
           AND d.event_id = r.event_id
           AND d.class_date = r.class_date
          WHERE r.calendar_token = ?`,
    args: [token],
  })
  const row = result.rows[0]
  if (!row || row.decision_status === 'cancelled') return null
  const description = calendarDescription({
    instructorName: row.instructor_name || '',
  })
  return buildIcs({
    title: row.title,
    classDate: row.class_date,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    description,
    uid: `class-${row.calendar_token}@sculpt-sequences`,
  })
}

export async function sendDueClassReminders(options = {}) {
  await ensureReminderSchema()
  const now = options.now instanceof Date && !Number.isNaN(options.now.getTime())
    ? options.now
    : new Date()
  const dryRun = options.dryRun === true
  const reset = options.reset === true
  const includeLinks = options.includeLinks === true
  const fromYmd = addDays(zonedToday(now), -1)
  const toYmd = addDays(zonedToday(now), 2)
  const db = getDb()

  const rsvpResult = await db.execute({
    sql: `SELECT r.*, d.status AS decision_status
          FROM class_rsvps r
          LEFT JOIN class_occurrence_decisions d
            ON d.profile_user_id = r.profile_user_id
           AND d.event_id = r.event_id
           AND d.class_date = r.class_date
          WHERE r.class_date >= ? AND r.class_date <= ?`,
    args: [fromYmd, toYmd],
  })
  const profiles = await db.execute(
    'SELECT user_id, email, name, notify_day_before, notify_two_hours FROM user_profiles'
  )
  const byUserId = new Map()
  const byEmail = new Map()
  for (const row of profiles.rows) {
    byUserId.set(row.user_id, row)
    if (row.email) byEmail.set(String(row.email).toLowerCase(), row)
  }

  const sent = []
  const skipped = []
  const errors = []

  for (const rsvp of rsvpResult.rows) {
    if (rsvp.decision_status === 'cancelled') {
      skipped.push({ id: rsvp.id, reason: 'cancelled' })
      continue
    }
    const instants = classInstants({
      classDate: rsvp.class_date,
      startTime: rsvp.start_time,
      endTime: rsvp.end_time,
    })
    if (!instants) {
      skipped.push({ id: rsvp.id, reason: 'invalid time' })
      continue
    }
    const kinds = dueReminderKinds(hoursUntilStart(instants.start, now))
    if (kinds.length === 0) continue

    const profile = (rsvp.user_id && byUserId.get(rsvp.user_id))
      || byEmail.get(String(rsvp.email).toLowerCase())
      || null
    const instructor = byUserId.get(rsvp.profile_user_id)
    const instructorName = instructor?.name || ''
    const description = calendarDescription({ instructorName })
    const calendarItem = {
      title: rsvp.title,
      classDate: rsvp.class_date,
      startTime: rsvp.start_time,
      endTime: rsvp.end_time,
      location: rsvp.location,
      description,
      uid: rsvp.calendar_token ? `class-${rsvp.calendar_token}@sculpt-sequences` : undefined,
    }

    for (const kind of kinds) {
      if (!wantsReminder(profile, kind)) {
        skipped.push({ id: rsvp.id, kind, reason: 'preference off' })
        continue
      }
      const copy = reminderCopy(kind)
      const when = `${formatWallDate(rsvp.class_date)} · ${formatWallTime(rsvp.start_time)} – ${formatWallTime(rsvp.end_time)}`
      const entry = {
        email: rsvp.email,
        kind,
        title: rsvp.title,
        classDate: rsvp.class_date,
        startTime: rsvp.start_time,
        subject: `${copy.subjectPrefix}: ${rsvp.title}`,
      }

      if (dryRun) {
        const googleUrl = googleCalendarUrl(calendarItem)
        sent.push({
          ...entry,
          dryRun: true,
          ...(includeLinks ? { googleUrl, icsUrl: rsvp.calendar_token ? `${appOrigin()}/api/calendar/${rsvp.calendar_token}` : null } : {}),
        })
        continue
      }

      if (reset) await releaseSend(rsvp.id, kind)
      const claimed = await claimSend(rsvp.id, kind)
      if (!claimed) {
        skipped.push({ id: rsvp.id, kind, reason: 'already sent' })
        continue
      }

      try {
        const token = await ensureCalendarToken(rsvp)
        const item = {
          ...calendarItem,
          uid: `class-${token}@sculpt-sequences`,
        }
        const googleUrl = googleCalendarUrl(item)
        const icsUrl = `${appOrigin()}/api/calendar/${token}`
        const ics = buildIcs(item)
        const html = reminderHtml({
          kind,
          title: rsvp.title,
          when,
          location: rsvp.location,
          instructorName,
          googleUrl,
          icsUrl,
        })
        const delivery = await deliverEmail({
          to: rsvp.email,
          subject: entry.subject,
          html,
          ics,
          filename: 'class.ics',
        })
        if (!delivery.ok) {
          await releaseSend(rsvp.id, kind)
          errors.push({ ...entry, error: delivery.error })
          console.error('[class-reminders] send failed:', rsvp.email, kind, delivery.error)
          continue
        }
        if (delivery.logged) {
          await releaseSend(rsvp.id, kind)
          console.log(`[class-reminders] not emailed (set RESEND_API_KEY and EMAIL_FROM): ${entry.subject}`)
          console.log(`  to: ${rsvp.email}`)
          console.log(`  Google: ${googleUrl}`)
          console.log(`  iCal: ${icsUrl}`)
        } else {
          console.log(`[class-reminders] sent ${kind} to ${rsvp.email} for ${rsvp.title}`)
        }
        sent.push({
          ...entry,
          logged: delivery.logged === true,
          emailed: delivery.logged !== true,
          ...(includeLinks ? { googleUrl, icsUrl } : {}),
        })
      } catch (err) {
        await releaseSend(rsvp.id, kind)
        const message = err instanceof Error ? err.message : String(err)
        errors.push({ ...entry, error: message })
        console.error('[class-reminders] send failed:', rsvp.email, kind, message)
      }
    }
  }

  return {
    now: now.toISOString(),
    dryRun,
    window: { from: fromYmd, to: toYmd },
    checked: rsvpResult.rows.length,
    sent,
    skipped,
    errors,
  }
}
