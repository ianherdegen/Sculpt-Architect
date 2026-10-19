import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { userProfileService } from '../lib/userProfileService'
import { ApiError } from '../lib/apiClient'
import { useAuth } from '../lib/auth'

export function ClassReminderSettings() {
  const { user } = useAuth()
  const [dayBefore, setDayBefore] = useState(true)
  const [twoHours, setTwoHours] = useState(true)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
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

  const save = async (next: { notify_day_before?: boolean; notify_two_hours?: boolean }) => {
    if (!user) return
    const previous = { dayBefore, twoHours }
    if (next.notify_day_before !== undefined) setDayBefore(next.notify_day_before)
    if (next.notify_two_hours !== undefined) setTwoHours(next.notify_two_hours)
    setSaving(true)
    setError(null)
    try {
      await userProfileService.update(user.id, next)
    } catch (err) {
      setDayBefore(previous.dayBefore)
      setTwoHours(previous.twoHours)
      setError(err instanceof ApiError ? err.message : 'Could not save reminder settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class reminders</CardTitle>
        <CardDescription>
          Emails for classes you reserve. Both are on until you turn one off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="remind-day">1 day before</Label>
          <Switch
            id="remind-day"
            checked={dayBefore}
            disabled={!ready || saving || !user}
            onCheckedChange={(checked) => save({ notify_day_before: checked })}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="remind-soon">2 hours before</Label>
          <Switch
            id="remind-soon"
            checked={twoHours}
            disabled={!ready || saving || !user}
            onCheckedChange={(checked) => save({ notify_two_hours: checked })}
          />
        </div>
      </CardContent>
    </Card>
  )
}
