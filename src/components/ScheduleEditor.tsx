import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Pencil, Trash2, Calendar, Repeat } from 'lucide-react';
import { ClassEvent } from './Profile';
import { useIsMobile } from './ui/use-mobile';

interface ScheduleEditorProps {
  events: ClassEvent[];
  onAddEvent: (event: ClassEvent) => void;
  onUpdateEvent: (eventId: string, updatedEvent: ClassEvent) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function ScheduleEditor({ events, onAddEvent, onUpdateEvent, onDeleteEvent }: ScheduleEditorProps) {
  const isMobile = useIsMobile();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClassEvent | null>(null);
  const [eventType, setEventType] = useState<'recurring' | 'single'>('recurring');
  
  const [title, setTitle] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const days = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const resetForm = () => {
    setTitle('');
    setDayOfWeek(1);
    setDate('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setDescription('');
    setEditingEvent(null);
    setEventType('recurring');
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (event: ClassEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setEventType(event.isRecurring ? 'recurring' : 'single');
    setDayOfWeek(event.dayOfWeek || 1);
    setDate(event.date || '');
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setLocation(event.location);
    setDescription(event.description || '');
    setIsAddDialogOpen(true);
  };

  const handleSave = () => {
    if (!title || !startTime || !endTime || !location) {
      alert('Please fill in all required fields');
      return;
    }

    if (eventType === 'recurring' && dayOfWeek === undefined) {
      alert('Please select a day of the week');
      return;
    }

    if (eventType === 'single' && !date) {
      alert('Please select a date');
      return;
    }

    const eventData: ClassEvent = {
      id: editingEvent?.id || Date.now().toString(),
      title,
      ...(eventType === 'recurring' ? { dayOfWeek } : { date }),
      startTime,
      endTime,
      location,
      description,
      isRecurring: eventType === 'recurring',
    };

    if (editingEvent) {
      onUpdateEvent(editingEvent.id, eventData);
    } else {
      onAddEvent(eventData);
    }

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleDelete = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      onDeleteEvent(eventId);
    }
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogTrigger asChild>
          <Button onClick={handleOpenAddDialog} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Class or Event
          </Button>
        </DialogTrigger>
        <DialogContent className={`${isMobile ? 'max-w-full h-[95vh] m-0 rounded-none flex flex-col p-4' : 'max-w-md max-h-[90vh]'} overflow-hidden`}>
          <DialogHeader className={isMobile ? 'pb-3 flex-shrink-0' : ''}>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Update event details' : 'Create a recurring class or single event'}
            </DialogDescription>
          </DialogHeader>

          <div className={`overflow-y-auto flex-1 ${isMobile ? 'min-h-0' : ''}`}>
            <Tabs value={eventType} onValueChange={(v) => setEventType(v as 'recurring' | 'single')}>
              <TabsList className={`!grid !grid-cols-2 w-full ${isMobile ? 'gap-1' : ''}`}>
                <TabsTrigger value="recurring" className={isMobile ? 'text-sm' : ''}>
                  {isMobile ? (
                    <>
                      <Repeat className="h-4 w-4" />
                      <span className="ml-1.5">Weekly Class</span>
                    </>
                  ) : (
                    <>
                      <Repeat className="h-4 w-4 mr-2" />
                      Weekly Class
                    </>
                  )}
                </TabsTrigger>
                <TabsTrigger value="single" className={isMobile ? 'text-sm' : ''}>
                  {isMobile ? (
                    <>
                      <Calendar className="h-4 w-4" />
                      <span className="ml-1.5">Single Event</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Single Event
                    </>
                  )}
                </TabsTrigger>
              </TabsList>

            <TabsContent value="recurring" className={`space-y-4 mt-4 ${isMobile ? 'pb-2' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="title">Class Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Morning Flow, Sculpt + Core, etc."
                  className={isMobile ? 'text-base' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="day">Day of Week *</Label>
                <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                  <SelectTrigger className={isMobile ? 'text-base h-11' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time *</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={isMobile ? 'text-base h-11' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time *</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={isMobile ? 'text-base h-11' : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Studio name, room, etc."
                  className={isMobile ? 'text-base' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional class details..."
                  rows={isMobile ? 4 : 3}
                  className={isMobile ? 'text-base' : ''}
                />
              </div>
            </TabsContent>

            <TabsContent value="single" className={`space-y-4 mt-4 ${isMobile ? 'pb-2' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="event-title">Event Title *</Label>
                <Input
                  id="event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Workshop, Special Class, etc."
                  className={isMobile ? 'text-base' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-date">Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={isMobile ? 'text-base h-11' : ''}
                />
              </div>

              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
                <div className="space-y-2">
                  <Label htmlFor="event-start">Start Time *</Label>
                  <Input
                    id="event-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={isMobile ? 'text-base h-11' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-end">End Time *</Label>
                  <Input
                    id="event-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={isMobile ? 'text-base h-11' : ''}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-location">Location *</Label>
                <Input
                  id="event-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Studio name, address, etc."
                  className={isMobile ? 'text-base' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event details, requirements, pricing..."
                  rows={isMobile ? 4 : 3}
                  className={isMobile ? 'text-base' : ''}
                />
              </div>
            </TabsContent>
          </Tabs>
          </div>

          <DialogFooter className={`${isMobile ? 'pt-3 border-t flex-shrink-0 mt-auto gap-2' : ''}`}>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingEvent ? 'Update' : 'Add'} Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Events List */}
      <div className="space-y-3">
        <Tabs defaultValue="recurring" className="w-full">
          <TabsList>
            <TabsTrigger value="recurring">Weekly Classes</TabsTrigger>
            <TabsTrigger value="single">Special Events</TabsTrigger>
          </TabsList>

          <TabsContent value="recurring" className="mt-4">
            <div className="space-y-2">
              {events
                .filter(e => e.isRecurring)
                .sort((a, b) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0))
                .map(event => (
                  <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getDayName(event.dayOfWeek || 0)} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{event.location}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditDialog(event)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              {events.filter(e => e.isRecurring).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No weekly classes added yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="single" className="mt-4">
            <div className="space-y-2">
              {events
                .filter(e => !e.isRecurring)
                .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                .map(event => (
                  <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.date || '')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{event.location}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEditDialog(event)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              {events.filter(e => !e.isRecurring).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No special events added yet</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

