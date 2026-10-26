/**
 * Send class reminder emails that are due.
 *
 *   yarn reminders                 send whatever is due right now
 *   yarn reminders --dry-run       show what would send, without emailing
 *   yarn reminders --now=2026-10-19T22:00:00.000Z
 *   yarn reminders --now=... --reset
 *   yarn reminders --now=... --reset --to=person@example.com
 *
 * --now pretends the current time is that UTC instant, so you can trigger
 * the 1-day window (22–26 hours before start), the 2-hour window
 * (30 minutes–2.75 hours before start), the thank-you
 * (within 3 hours after class ends), or a cancellation notice
 * for a class whose RSVP deadline has passed.
 * A real run records those cancellations before it sends. A dry run does not.
 * --reset clears the "already sent" mark for reminders due at that time.
 * --to limits the run to one RSVP email.
 *
 * Requires TURSO_DATABASE_URL. Real email also needs RESEND_API_KEY and EMAIL_FROM.
 */
import { sendDueClassReminders } from '../server/reminders.js'

function flagValue(name) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : null
}

const nowValue = flagValue('now')
const now = nowValue ? new Date(nowValue) : new Date()
if (Number.isNaN(now.getTime())) {
  console.error(`Invalid --now value: ${nowValue}`)
  process.exit(1)
}

const result = await sendDueClassReminders({
  now,
  dryRun: process.argv.includes('--dry-run'),
  reset: process.argv.includes('--reset'),
  includeLinks: true,
  onlyEmail: flagValue('to'),
})

console.log(JSON.stringify(result, null, 2))
if (result.errors.length > 0) process.exit(1)
