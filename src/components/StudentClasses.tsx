import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingService, formatClassDate, formatClassTime, localToday, type ClassRsvp } from '../lib/booking'
import { calendarDescription } from '../lib/classCalendar'
import { AddToCalendar } from './AddToCalendar'
import { Button } from './ui/button'
import { ApiError } from '../lib/apiClient'

export function StudentClasses() {
  const [rsvps, setRsvps] = useState<ClassRsvp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    bookingService.listMine()
      .then((list) => {
        if (!cancelled) setRsvps(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load your classes.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const today = localToday()
  const upcoming = rsvps.filter((rsvp) => rsvp.classDate >= today)
  const previous = rsvps.filter((rsvp) => rsvp.classDate < today).reverse()

  if (loading) {
    return <p className="text-muted-foreground">Loading your classes...</p>
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-medium">Your classes</h3>
        <p className="text-sm text-muted-foreground">
          Classes you reserved while signed in as a student.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Upcoming</h4>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming classes. Open an instructor profile to book.</p>
        ) : (
          upcoming.map((rsvp) => (
            <ClassRow
              key={rsvp.id}
              rsvp={rsvp}
              onCancel={async (item) => {
                if (!item.instructorShareId) return
                await bookingService.cancel(item.instructorShareId, item.eventId, item.classDate)
                setRsvps((current) => current.filter((row) => row.id !== item.id))
              }}
            />
          ))
        )}
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Previous</h4>
        {previous.length === 0 ? (
          <p className="text-sm text-muted-foreground">No previous classes</p>
        ) : (
          previous.map((rsvp) => <ClassRow key={rsvp.id} rsvp={rsvp} />)
        )}
      </div>
    </section>
  )
}

function ClassRow({
  rsvp,
  onCancel,
}: {
  rsvp: ClassRsvp
  onCancel?: (rsvp: ClassRsvp) => Promise<void>
}) {
  const profileLink = rsvp.instructorShareId ? `/book/${rsvp.instructorShareId}` : null
  const upcoming = rsvp.classDate >= localToday()
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)

  const cancel = async () => {
    if (!onCancel || busy) return
    setBusy(true)
    setRowError(null)
    try {
      await onCancel(rsvp)
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : 'Could not cancel RSVP.')
      setBusy(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 border rounded-lg bg-card space-y-2">
      <div>
        <p className="font-medium">{rsvp.title}</p>
        {rsvp.cancelled && (
          <p className="text-sm text-destructive">Cancelled — not enough RSVPs</p>
        )}
        <p className="text-sm text-muted-foreground">
          {formatClassDate(rsvp.classDate)} · {formatClassTime(rsvp.startTime)} – {formatClassTime(rsvp.endTime)}
        </p>
        <p className="text-sm text-muted-foreground">{rsvp.location}</p>
        {rsvp.instructorName && (
          profileLink ? (
            <Link to={profileLink} className="text-sm text-primary hover:underline">
              {rsvp.instructorName}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">{rsvp.instructorName}</p>
          )
        )}
      </div>
      {upcoming && (
        <div className="space-y-2">
          {!rsvp.cancelled && (
            <AddToCalendar
              title={rsvp.title}
              classDate={rsvp.classDate}
              startTime={rsvp.startTime}
              endTime={rsvp.endTime}
              location={rsvp.location}
              description={calendarDescription({ instructorName: rsvp.instructorName })}
            />
          )}
          {onCancel && rsvp.instructorShareId && (
            <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" disabled={busy} onClick={cancel}>
              Cancel RSVP
            </Button>
          )}
          {rowError && <p className="text-sm text-destructive">{rowError}</p>}
        </div>
      )}
    </div>
  )
}
