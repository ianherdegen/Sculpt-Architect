import { useState, type FormEvent } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ApiError } from '../lib/apiClient'

export function GuestSeat({
  guestEmail,
  disabled,
  canInvite,
  onInvite,
}: {
  guestEmail?: string | null
  disabled?: boolean
  canInvite?: boolean
  onInvite?: (email: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (guestEmail) {
    return (
      <p className="text-sm text-muted-foreground">
        Invite sent to {guestEmail}. They book from this schedule with their own account.
      </p>
    )
  }

  if (!canInvite || !onInvite) return null

  const invite = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await onInvite(email.trim())
      setEmail('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the invite.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={invite} className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Invite one guest. They get a link to this schedule and RSVP themselves. It doesn’t hold a spot.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          aria-label="Guest email"
          placeholder="Guest email"
          autoComplete="off"
          value={email}
          disabled={disabled || busy}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" variant="outline" size="sm" className="w-full sm:w-auto" disabled={disabled || busy}>
          Send invite
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
