import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { bookingService, formatClassDate, formatClassTime, type GuestInvite } from '../lib/booking'
import { ApiError } from '../lib/apiClient'
import { Button } from './ui/button'

export function GuestRsvpPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [invite, setInvite] = useState<GuestInvite | null>(null)
  const [missing, setMissing] = useState(false)
  const [removed, setRemoved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMissing(false)
    setInvite(null)
    bookingService.guestInvite(token)
      .then((next) => {
        if (!cancelled) setInvite(next)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setMissing(true)
        else setError(err instanceof ApiError ? err.message : 'Could not load this class.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      await bookingService.removeGuestByToken(token)
      setRemoved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not take you off this class.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-lg mx-auto px-4 sm:px-6 py-10 space-y-4">
        <h1 className="text-xl font-light tracking-widest uppercase">SCULPT ARCHITECT</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : removed ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">You’re off this class</h2>
            <p className="text-muted-foreground">You won’t get more emails for it.</p>
          </div>
        ) : missing ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">You’re not on this class</h2>
            <p className="text-muted-foreground">This seat was already removed.</p>
          </div>
        ) : invite ? (
          <div className="p-4 border rounded-lg bg-card space-y-3">
            <div>
              <p className="font-medium">{invite.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatClassDate(invite.classDate)} · {formatClassTime(invite.startTime)} – {formatClassTime(invite.endTime)}
              </p>
              <p className="text-sm text-muted-foreground">{invite.location}</p>
              {invite.instructorName && (
                <p className="text-sm text-muted-foreground">With {invite.instructorName}</p>
              )}
              <p className="text-sm text-muted-foreground">{invite.email}</p>
            </div>
            {invite.status === 'started' ? (
              <p className="text-sm text-muted-foreground">This link expired when the class started.</p>
            ) : (
              <Button type="button" variant="outline" disabled={busy} onClick={remove}>
                Take me off this class
              </Button>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <p className="text-sm text-destructive">{error || 'Could not load this class.'}</p>
        )}
        <Link to="/" className="inline-block text-sm text-primary hover:underline">Home</Link>
      </main>
    </div>
  )
}
