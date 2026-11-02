import { useState, type FormEvent } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ApiError } from '../lib/apiClient'

export function GuestSeat({
  guestEmail,
  disabled,
  canAdd,
  onAdd,
  onRemove,
}: {
  guestEmail?: string | null
  disabled?: boolean
  canAdd?: boolean
  onAdd?: (email: string) => Promise<{ emailed?: boolean } | void>
  onRemove?: () => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const remove = async () => {
    if (!onRemove || busy) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await onRemove()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove guest.')
    } finally {
      setBusy(false)
    }
  }

  if (guestEmail) {
    return (
      <div className="space-y-2">
        <p className="text-sm">Guest: {guestEmail}</p>
        {onRemove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={disabled || busy}
            onClick={remove}
          >
            Remove guest
          </Button>
        )}
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }

  if (!canAdd || !onAdd) return null

  const add = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const result = await onAdd(email.trim())
      setEmail('')
      if (result && result.emailed === false) {
        setNote('Added. The email did not send, so tell them yourself.')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add guest.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={add} className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Add one guest. They’ll get class emails and a link to take themselves off.
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
          Add guest
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
