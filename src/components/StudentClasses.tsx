import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingService, formatClassDate, formatClassTime, localToday, type ClassRsvp } from '../lib/booking'
import { calendarDescription } from '../lib/classCalendar'
import { AddToCalendar } from './AddToCalendar'
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
          upcoming.map((rsvp) => <ClassRow key={rsvp.id} rsvp={rsvp} />)
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

function ClassRow({ rsvp }: { rsvp: ClassRsvp }) {
  const profileLink = rsvp.instructorShareId ? `/book/${rsvp.instructorShareId}` : null
  return (
    <div className="p-4 border rounded-lg bg-card">
      <p className="font-medium">{rsvp.title}</p>
      {rsvp.cancelled && (
        <p className="text-sm text-destructive">Cancelled — not enough RSVPs</p>
      )}
      <p className="text-sm text-muted-foreground">
        {formatClassDate(rsvp.classDate)} · {formatClassTime(rsvp.startTime)} – {formatClassTime(rsvp.endTime)}
      </p>
      <p className="text-sm text-muted-foreground">{rsvp.location}</p>
      {!rsvp.cancelled && rsvp.classDate >= localToday() && (
        <div className="pt-3">
          <AddToCalendar
            title={rsvp.title}
            classDate={rsvp.classDate}
            startTime={rsvp.startTime}
            endTime={rsvp.endTime}
            location={rsvp.location}
            description={calendarDescription({ instructorName: rsvp.instructorName })}
          />
        </div>
      )}
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
  )
}
