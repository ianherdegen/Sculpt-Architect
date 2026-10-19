import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Calendar, Check, Home } from 'lucide-react';
import { AddToCalendar } from './AddToCalendar';
import { calendarDescription } from '../lib/classCalendar';
import { userProfileService } from '../lib/userProfileService';
import {
  bookingService,
  formatClassDate,
  formatClassTime,
  formatRunStatus,
  localToday,
  occurrenceKey,
  upcomingWeek,
  type ClassOccurrence,
  type ClassRsvp,
  type ClassRunStatus,
} from '../lib/booking';
import { ApiError } from '../lib/apiClient';
import { useAuth } from '../lib/auth';
import { useViewMode } from '../lib/viewMode';
import '../styles/booking-form.css';

function emailsForClass(rsvps: ClassRsvp[], eventId: string, date: string) {
  return rsvps
    .filter((rsvp) => rsvp.eventId === eventId && rsvp.classDate === date)
    .map((rsvp) => rsvp.email);
}

function RunStatusLine({ status }: { status?: ClassRunStatus }) {
  if (!status) return null;
  return (
    <p className={`text-sm ${status.status === 'cancelled' ? 'text-destructive' : 'text-muted-foreground'}`}>
      {formatRunStatus(status)}
    </p>
  );
}

function ReceivedRsvps({
  classes,
  rsvps,
  statuses,
}: {
  classes: ClassOccurrence[];
  rsvps: ClassRsvp[];
  statuses: ClassRunStatus[];
}) {
  const today = localToday();
  const classesByDate: { date: string; items: ClassOccurrence[] }[] = [];
  for (const item of classes) {
    const last = classesByDate[classesByDate.length - 1];
    if (!last || last.date !== item.date) classesByDate.push({ date: item.date, items: [item] });
    else last.items.push(item);
  }

  const previousByClass = new Map<string, ClassRsvp[]>();
  for (const rsvp of rsvps) {
    if (rsvp.classDate >= today) continue;
    const key = occurrenceKey(rsvp.eventId, rsvp.classDate);
    const group = previousByClass.get(key) || [];
    group.push(rsvp);
    previousByClass.set(key, group);
  }
  const previousGroups = [...previousByClass.values()].sort((a, b) => b[0].classDate.localeCompare(a[0].classDate));

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold">RSVPs</h2>
        <p className="text-muted-foreground">Reservations students made for your classes.</p>
      </div>

      <section className="space-y-3">
        <h3 className="font-medium">This week</h3>
        {classesByDate.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No classes in the next 7 days</p>
        ) : (
          classesByDate.map((group) => (
            <div key={group.date} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">{formatClassDate(group.date)}</h4>
              {group.items.map((item) => {
                const emails = emailsForClass(rsvps, item.eventId, item.date);
                const status = statuses.find((itemStatus) => itemStatus.eventId === item.eventId && itemStatus.classDate === item.date);
                return (
                  <div key={occurrenceKey(item.eventId, item.date)} className="p-4 border rounded-lg bg-card space-y-2">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatClassTime(item.startTime)} – {formatClassTime(item.endTime)}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.location}</p>
                      <RunStatusLine status={status} />
                    </div>
                    {emails.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No RSVPs yet</p>
                    ) : (
                      <ul className="text-sm space-y-2">
                        {emails.map((address) => (
                          <li key={address}>{address}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">Previous</h3>
        {previousGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No previous RSVPs</p>
        ) : (
          previousGroups.map((group) => {
            const first = group[0];
            return (
              <div key={occurrenceKey(first.eventId, first.classDate)} className="p-4 border rounded-lg bg-card space-y-2">
                <div>
                  <p className="font-medium">{first.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatClassDate(first.classDate)} · {formatClassTime(first.startTime)} – {formatClassTime(first.endTime)}
                  </p>
                  <p className="text-sm text-muted-foreground">{first.location}</p>
                </div>
                <ul className="text-sm space-y-2">
                  {group.map((rsvp) => (
                    <li key={rsvp.id}>{rsvp.email}</li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}

export function BookingPage() {
  const { shareId = '' } = useParams<{ shareId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { mode, canInstruct, loading: modeLoading, setMode } = useViewMode();
  const [instructorName, setInstructorName] = useState('');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOccurrence[]>([]);
  const [statuses, setStatuses] = useState<ClassRunStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rsvps, setRsvps] = useState<ClassRsvp[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modeSwitchFailed, setModeSwitchFailed] = useState(false);
  const listGeneration = useRef(0);
  const isOwner = !!user && profileUserId === user.id;
  const showReceived = isOwner && canInstruct;
  const expectedMode = user && profileUserId ? (showReceived ? 'instructor' : 'student') : null;
  const modeReady = !expectedMode || mode === expectedMode || modeSwitchFailed;
  const canBook = !!user && mode === 'student' && !isOwner;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        setProfileUserId(null);
        setModeSwitchFailed(false);
        const profile = await userProfileService.getByShareId(shareId);
        if (cancelled) return;
        if (!profile || profile.is_banned) {
          setNotFound(true);
          return;
        }
        setInstructorName(profile.name || '');
        setProfileUserId(profile.user_id);
        setClasses(upcomingWeek(profile.events || []));
        try {
          const occurrenceStatuses = await bookingService.listOccurrences(shareId);
          if (!cancelled) setStatuses(occurrenceStatuses);
        } catch (statusError) {
          console.error('Error loading class status:', statusError);
        }
      } catch (err) {
        console.error('Error loading booking page:', err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (shareId) load();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  useEffect(() => {
    if (authLoading || modeLoading || !user || !profileUserId) return;
    const next = profileUserId === user.id && canInstruct ? 'instructor' : 'student';
    if (mode === next) return;
    setMode(next).catch((err) => {
      console.error('Error switching view:', err);
      setModeSwitchFailed(true);
      setError(err instanceof ApiError ? err.message : 'Could not switch view.');
    });
  }, [authLoading, modeLoading, user, profileUserId, canInstruct, mode, setMode]);

  useEffect(() => {
    if (authLoading || modeLoading || !profileUserId || !shareId) return;
    let cancelled = false;
    const generation = ++listGeneration.current;
    const loadRsvps = async () => {
      try {
        if (user && profileUserId === user.id && canInstruct) {
          const received = await bookingService.listReceived();
          if (!cancelled && listGeneration.current === generation) setRsvps(received);
          return;
        }
        if (user && profileUserId !== user.id) {
          const mine = await bookingService.listRsvps(shareId);
          if (!cancelled && listGeneration.current === generation) setRsvps(mine);
          return;
        }
        if (!cancelled && listGeneration.current === generation) setRsvps([]);
      } catch (err) {
        console.error('Error loading RSVPs:', err);
        if (!cancelled && listGeneration.current === generation) {
          setError(err instanceof ApiError ? err.message : 'Could not load RSVPs.');
        }
      }
    };
    loadRsvps();
    return () => {
      cancelled = true;
    };
  }, [authLoading, modeLoading, user, profileUserId, canInstruct, shareId]);

  const rsvpKeys = useMemo(
    () => new Set(rsvps.map((rsvp) => occurrenceKey(rsvp.eventId, rsvp.classDate))),
    [rsvps]
  );
  const classesByDate = useMemo(() => {
    const groups: { date: string; items: ClassOccurrence[] }[] = [];
    for (const item of classes) {
      const last = groups[groups.length - 1];
      if (!last || last.date !== item.date) groups.push({ date: item.date, items: [item] });
      else last.items.push(item);
    }
    return groups;
  }, [classes]);

  const reserve = async (occurrence: ClassOccurrence) => {
    const key = occurrenceKey(occurrence.eventId, occurrence.date);
    setBusyKey(key);
    setError(null);
    try {
      const created = await bookingService.rsvp(shareId, occurrence.eventId, occurrence.date);
      listGeneration.current += 1;
      setRsvps((current) => {
        const without = current.filter((rsvp) => occurrenceKey(rsvp.eventId, rsvp.classDate) !== key);
        return [...without, created].sort((a, b) => a.classDate.localeCompare(b.classDate) || a.startTime.localeCompare(b.startTime));
      });
      setStatuses(await bookingService.listOccurrences(shareId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not RSVP.');
    } finally {
      setBusyKey(null);
    }
  };

  const cancel = async (eventId: string, classDate: string) => {
    const key = occurrenceKey(eventId, classDate);
    setBusyKey(key);
    setError(null);
    try {
      await bookingService.cancel(shareId, eventId, classDate);
      listGeneration.current += 1;
      setRsvps((current) => current.filter((rsvp) => occurrenceKey(rsvp.eventId, rsvp.classDate) !== key));
      setStatuses(await bookingService.listOccurrences(shareId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel RSVP.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-2xl mx-auto px-4 sm:px-6">
          <div className="booking-header">
            <div className="flex items-center gap-1">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
              {shareId && (
                <Link to={`/profile/${shareId}`}>
                  <Button variant="ghost" size="sm">Profile</Button>
                </Link>
              )}
            </div>
            <h1 className="text-xl font-light tracking-widest uppercase">SCULPT ARCHITECT</h1>
            <div className="booking-header-actions" />
          </div>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {loading || authLoading || modeLoading || !modeReady ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading classes...</p>
          </div>
        ) : notFound ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Profile not found</p>
            <Link to="/" className="inline-block mt-4">
              <Button>Go to Home</Button>
            </Link>
          </div>
        ) : showReceived ? (
          <ReceivedRsvps classes={classes} rsvps={rsvps} statuses={statuses} />
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold">Bookings</h2>
              <p className="text-muted-foreground">
                {instructorName ? `${instructorName}'s next 7 days` : 'Next 7 days of classes'}
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <section className="space-y-3">
              {!isOwner && (
                <p className="text-sm text-muted-foreground">
                  {user
                    ? 'RSVP with your student account, or cancel if you can’t make it.'
                    : 'Log in as a student to book a class.'}
                </p>
              )}
              {classesByDate.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No classes in the next 7 days</p>
              ) : (
                classesByDate.map((group) => (
                  <div key={group.date} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{formatClassDate(group.date)}</h4>
                    {group.items.map((item) => {
                      const key = occurrenceKey(item.eventId, item.date);
                      const going = rsvpKeys.has(key);
                      const status = statuses.find((itemStatus) => itemStatus.eventId === item.eventId && itemStatus.classDate === item.date);
                      const cancelledClass = status?.status === 'cancelled';
                      const loginHref = `/?return=${encodeURIComponent(`/book/${shareId}`)}`;
                      return (
                        <div key={key} className="p-4 border rounded-lg bg-card space-y-3">
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatClassTime(item.startTime)} – {formatClassTime(item.endTime)}
                            </p>
                            <p className="text-sm text-muted-foreground">{item.location}</p>
                            {item.description && <p className="text-sm mt-1">{item.description}</p>}
                            <RunStatusLine status={status} />
                          </div>
                          {cancelledClass ? null : canBook && going ? (
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1 text-sm font-medium">
                                  <Check className="h-4 w-4" />
                                  Going
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={busyKey === key}
                                  onClick={() => cancel(item.eventId, item.date)}
                                >
                                  Cancel RSVP
                                </Button>
                              </div>
                              <AddToCalendar
                                title={item.title}
                                classDate={item.date}
                                startTime={item.startTime}
                                endTime={item.endTime}
                                location={item.location}
                                description={calendarDescription({
                                  instructorName,
                                  description: item.description,
                                })}
                              />
                            </div>
                          ) : canBook ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyKey === key}
                              onClick={() => reserve(item)}
                            >
                              <Calendar className="h-4 w-4" />
                              RSVP
                            </Button>
                          ) : !user ? (
                            <Link to={loginHref}>
                              <Button type="button" size="sm">Log in to book</Button>
                            </Link>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
