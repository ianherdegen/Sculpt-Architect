import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { userProfileService } from '../lib/userProfileService'
import { ApiError } from '../lib/apiClient'
import { useAuth } from '../lib/auth'

export function ClassReminderSettings() {
  const { user } = useAuth()
  const [dayBefore, setDayBefore] = useState(true)
  const [twoHours, setTwoHours] = useState(true)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState<{ day: boolean; hours: boolean }>({ day: false, hours: false })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    userProfileService.getMyProfile()
      .then((profile) => {
        if (cancelled || !profile) return
        setDayBefore(profile.notify_day_before !== false)
        setTwoHours(profile.notify_two_hours !== false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load reminder settings.')
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = async (field: 'day' | 'hours', value: boolean) => {
    if (!user || pending[field]) return
    if (field === 'day') setDayBefore(value)
    else setTwoHours(value)
    setPending((current) => ({ ...current, [field]: true }))
    setError(null)
    try {
      await userProfileService.update(
        user.id,
        field === 'day' ? { notify_day_before: value } : { notify_two_hours: value },
      )
    } catch (err) {
      if (field === 'day') setDayBefore(!value)
      else setTwoHours(!value)
      setError(err instanceof ApiError ? err.message : 'Could not save reminder settings.')
    } finally {
      setPending((current) => ({ ...current, [field]: false }))
    }
  }

  return (
    <Card>
      <CardHeader className="px-4 pt-6 pb-2">
        <CardTitle>Class reminders</CardTitle>
        <CardDescription>Tap a row to turn that email on or off.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <ReminderToggle
          title="1 day before"
          detail="Email about a day before class."
          checked={dayBefore}
          pending={!ready || pending.day}
          onToggle={() => save('day', !dayBefore)}
        />
        <ReminderToggle
          title="2 hours before"
          detail="Email about two hours before class."
          checked={twoHours}
          pending={!ready || pending.hours}
          onToggle={() => save('hours', !twoHours)}
        />
      </CardContent>
    </Card>
  )
}

function ReminderToggle({
  title,
  detail,
  checked,
  pending,
  onToggle,
}: {
  title: string
  detail: string
  checked: boolean
  pending: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${title}, ${checked ? 'on' : 'off'}`}
      onClick={onToggle}
      className="flex w-full min-h-11 items-center gap-3 rounded-lg border bg-background px-3 py-2 text-left hover:bg-accent"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
      <span
        className={`inline-flex h-8 min-w-16 shrink-0 items-center justify-center rounded-full px-3 text-sm font-medium ${
          checked ? 'bg-primary text-primary-foreground' : 'border bg-muted text-muted-foreground'
        } ${pending ? 'opacity-70' : ''}`}
      >
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  )
}
