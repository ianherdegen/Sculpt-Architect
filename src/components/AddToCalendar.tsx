import { Button } from './ui/button'
import { buildIcs, googleCalendarUrl, type CalendarClass } from '../lib/classCalendar'

export function AddToCalendar(item: CalendarClass) {
  const googleUrl = googleCalendarUrl(item)

  const downloadIcs = () => {
    const ics = buildIcs(item)
    if (!ics) return
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'class.ics'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Add to your calendar</p>
      <div className="flex flex-wrap gap-2">
        {googleUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={googleUrl} target="_blank" rel="noopener noreferrer">
              Google Calendar
            </a>
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={downloadIcs}>
          iCal
        </Button>
      </div>
    </div>
  )
}
