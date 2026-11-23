import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { upcomingClassDates } from '../lib/classCalendar';
import { bookingService, cancellationLabel, type ClassDateSkip } from '../lib/booking';
import { ApiError } from '../lib/apiClient';

type SkipEvent = {
  id: string;
  title: string;
  isRecurring: boolean;
  dayOfWeek?: number;
  date?: string;
  startTime: string;
};

type SkipContextValue = {
  skips: ClassDateSkip[];
  ready: boolean;
  reload: () => Promise<void>;
};

const ClassDateSkipContext = createContext<SkipContextValue | null>(null);
const PREVIEW_COUNT = 6;

export function ClassDateSkipProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [skips, setSkips] = useState<ClassDateSkip[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setSkips(await bookingService.listSkips());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load cancelled dates.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  if (!enabled) return <>{children}</>;
  return (
    <ClassDateSkipContext.Provider value={{ skips, ready, reload }}>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      {children}
    </ClassDateSkipContext.Provider>
  );
}

function formatSkipDate(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ClassDateSkipRows({ event }: { event: SkipEvent }) {
  const ctx = useContext(ClassDateSkipContext);
  const [expanded, setExpanded] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [mode, setMode] = useState<'cancel' | 'restore' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  if (!ctx) return null;
  const dates = upcomingClassDates(event);
  if (dates.length === 0) return null;
  if (!ctx.ready) {
    return <p className="mt-3 text-sm text-muted-foreground">Loading dates...</p>;
  }
  const visible = expanded ? dates : dates.slice(0, PREVIEW_COUNT);
  const dateLabel = activeDate ? formatSkipDate(activeDate) : '';

  const open = (nextMode: 'cancel' | 'restore', date: string) => {
    setMode(nextMode);
    setActiveDate(date);
    setNote('');
    setError(null);
  };

  const close = () => {
    if (busy) return;
    setMode(null);
    setActiveDate(null);
    setError(null);
  };

  const confirm = async () => {
    if (!activeDate || !mode || busy) return;
    setBusy(true);
    setError(null);
    try {
      const notice = mode === 'cancel'
        ? (await bookingService.skipDate(event.id, activeDate, note)).notice
        : await bookingService.restoreDate(event.id, activeDate);
      await ctx.reload();
      setWarning(notice.failed > 0 ? 'The date was updated. Some students could not be emailed.' : null);
      setMode(null);
      setActiveDate(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update this date.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-sm text-muted-foreground">
        {event.isRecurring
          ? 'Cancel one date, like a holiday. Every other week stays bookable.'
          : 'Cancel this date if it will not run.'}
      </p>
      {warning && <p className="text-sm text-destructive">{warning}</p>}
      <ul className="space-y-2">
        {visible.map((date) => {
          const skip = ctx.skips.find((item) => item.eventId === event.id && item.classDate === date);
          return (
            <li key={date} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm">{formatSkipDate(date)}</p>
                {skip && <p className="text-sm text-destructive">{cancellationLabel('instructor', skip.note)}</p>}
              </div>
              {skip ? (
                <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => open('restore', date)}>
                  Put back on
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => open('cancel', date)}>
                  Cancel this date
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {dates.length > PREVIEW_COUNT && (
        <Button type="button" variant="ghost" size="sm" className="px-2" onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Show fewer dates' : 'Show later dates'}
        </Button>
      )}

      <AlertDialog open={mode != null} onOpenChange={(next) => { if (!next) close(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mode === 'restore' ? 'Put this date back on?' : 'Cancel this date?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {mode === 'restore'
                ? `Put ${dateLabel} back on? Anyone who already RSVP'd stays signed up. Anyone who was emailed about the cancellation gets a note that this class is back on.`
                : event.isRecurring
                  ? `Cancel ${dateLabel} only. ${event.title} stays on the weekly schedule. Anyone already RSVP'd is emailed, and that RSVP stays in place.`
                  : `Cancel ${dateLabel} only. Anyone already RSVP'd is emailed, and that RSVP stays in place.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {mode === 'cancel' && (
            <div className="space-y-2">
              <Label htmlFor={`skip-note-${event.id}`}>Note for students (optional)</Label>
              <Input
                id={`skip-note-${event.id}`}
                value={note}
                maxLength={80}
                placeholder="Thanksgiving"
                onChange={(change) => setNote(change.target.value)}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{mode === 'restore' ? 'Not now' : 'Keep this date'}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(click) => {
                click.preventDefault();
                void confirm();
              }}
            >
              {mode === 'restore' ? 'Put back on' : 'Cancel this date'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
