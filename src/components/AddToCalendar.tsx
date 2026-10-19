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
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Add to calendar</p>
          <p className="text-xs text-muted-foreground">
            Google Calendar opens in a new tab. iCal downloads a file for Apple Calendar.
          </p>
        </div>
        <div className={`grid gap-2 sm:flex sm:shrink-0 ${googleUrl ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {googleUrl && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                Google Calendar
              </a>
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={downloadIcs}>
            iCal
          </Button>
        </div>
      </div>
    </div>
  )
}
