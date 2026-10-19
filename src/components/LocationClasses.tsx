import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingService, formatClassDate, formatClassTime, occurrenceKey } from '../lib/booking'
import { locationService, type BookableClass, type Studio } from '../lib/locations'
import { Button } from './ui/button'
import { ApiError } from '../lib/apiClient'

const selectClass = 'border-input bg-input-background flex h-9 w-full rounded-md border px-3 text-sm'

export function LocationClasses({
  revision,
  onChanged,
}: {
  revision: number
  onChanged: () => void
}) {
  const [studios, setStudios] = useState<Studio[]>([])
  const [studioId, setStudioId] = useState('')
  const [classes, setClasses] = useState<BookableClass[]>([])
  const [loadingStudios, setLoadingStudios] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    locationService.list()
      .then((list) => {
        if (cancelled) return
        setStudios(list)
        setStudioId((current) => current || (list.length === 1 ? list[0].id : ''))
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load studios.')
      })
      .finally(() => {
        if (!cancelled) setLoadingStudios(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!studioId) {
      setClasses([])
      return
    }
    let cancelled = false
    setLoadingClasses(true)
    setError(null)
    locationService.classes(studioId)
      .then((list) => {
        if (!cancelled) setClasses(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load classes.')
      })
      .finally(() => {
        if (!cancelled) setLoadingClasses(false)
      })
    return () => {
      cancelled = true
    }
  }, [studioId, revision])

  const selected = studios.find((studio) => studio.id === studioId)

  const reserve = async (item: BookableClass) => {
    const key = occurrenceKey(item.eventId, item.classDate)
    setBusyKey(key)
    setError(null)
    try {
      await bookingService.rsvp(item.instructorShareId, item.eventId, item.classDate)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reserve this class.')
    } finally {
      setBusyKey(null)
    }
  }

  const cancel = async (item: BookableClass) => {
    const key = occurrenceKey(item.eventId, item.classDate)
    setBusyKey(key)
    setError(null)
    try {
      await bookingService.cancel(item.instructorShareId, item.eventId, item.classDate)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel RSVP.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">Book a class</h3>
        <p className="text-sm text-muted-foreground">Choose a studio to see its upcoming classes.</p>
      </div>
      {loadingStudios ? (
        <p className="text-sm text-muted-foreground">Loading studios...</p>
      ) : studios.length === 0 ? (
        <p className="text-sm text-muted-foreground">No studios are available yet.</p>
      ) : (
        <select
          aria-label="Studio"
          className={selectClass}
          value={studioId}
          onChange={(event) => setStudioId(event.target.value)}
        >
          <option value="">Choose a studio</option>
          {studios.map((studio) => (
            <option key={studio.id} value={studio.id}>{studio.name}</option>
          ))}
        </select>
      )}
      {selected?.address && <p className="text-sm text-muted-foreground">{selected.address}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {studioId && loadingClasses && <p className="text-sm text-muted-foreground">Loading classes...</p>}
      {studioId && !loadingClasses && classes.length === 0 && (
        <p className="text-sm text-muted-foreground">No upcoming classes at this studio.</p>
      )}
      {studioId && !loadingClasses && classes.length > 0 && (
        <div className="space-y-2">
          {classes.map((item) => {
            const key = occurrenceKey(item.eventId, item.classDate)
            return (
              <div key={`${item.instructorShareId}:${key}`} className="p-3 border rounded-lg bg-card space-y-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.instructorShareId ? (
                    <Link to={`/book/${item.instructorShareId}`} className="text-sm text-primary hover:underline">
                      {item.instructorName || 'Instructor'}
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">{item.instructorName}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatClassDate(item.classDate)} · {formatClassTime(item.startTime)} – {formatClassTime(item.endTime)}
                  </p>
                </div>
                {item.ownClass ? (
                  <p className="text-sm text-muted-foreground">Your class</p>
                ) : item.going ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium">Going</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={busyKey === key}
                      onClick={() => cancel(item)}
                    >
                      Cancel RSVP
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={busyKey === key}
                    onClick={() => reserve(item)}
                  >
                    RSVP
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
