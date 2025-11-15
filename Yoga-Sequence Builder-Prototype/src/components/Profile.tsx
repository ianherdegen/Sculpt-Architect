import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Edit, Save, X, User, Calendar, Mail } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { ContactForm } from './ContactForm';

export interface ClassEvent {
  id: string;
  title: string;
  dayOfWeek?: number; // 0-6 for Sunday-Saturday (for recurring)
  date?: string; // For single events
  startTime: string;
  endTime: string;
  location: string;
  description?: string;
  isRecurring: boolean;
}

export interface UserProfile {
  name: string;
  bio: string;
  email: string;
  events: ClassEvent[];
}

interface ProfileProps {
  userEmail: string;
  isViewerMode?: boolean;
}

export function Profile({ userEmail, isViewerMode = false }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Sarah Martinez',
    bio: 'Certified yoga instructor specializing in sculpt and vinyasa flow. I believe in building strength, flexibility, and mindfulness through intentional movement.',
    email: userEmail,
    events: [
      {
        id: '1',
        title: 'Morning Sculpt Flow',
        dayOfWeek: 1, // Monday
        startTime: '07:00',
        endTime: '08:00',
        location: 'Zen Studio, Room A',
        description: 'Start your week strong with weights and flow',
        isRecurring: true,
      },
      {
        id: '2',
        title: 'Sculpt + Core',
        dayOfWeek: 3, // Wednesday
        startTime: '18:00',
        endTime: '19:00',
        location: 'Zen Studio, Room A',
        description: 'Build core strength and stability',
        isRecurring: true,
      },
      {
        id: '3',
        title: 'Weekend Warrior Workshop',
        date: '2025-11-15',
        startTime: '10:00',
        endTime: '12:00',
        location: 'Beachside Yoga Studio',
        description: 'Special 2-hour intensive workshop',
        isRecurring: false,
      },
    ],
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  const handleEdit = () => {
    setEditedProfile(profile);
    setIsEditing(true);
  };

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleAddEvent = (event: ClassEvent) => {
    setEditedProfile({
      ...editedProfile,
      events: [...editedProfile.events, event],
    });
  };

  const handleUpdateEvent = (eventId: string, updatedEvent: ClassEvent) => {
    setEditedProfile({
      ...editedProfile,
      events: editedProfile.events.map(e => e.id === eventId ? updatedEvent : e),
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setEditedProfile({
      ...editedProfile,
      events: editedProfile.events.filter(e => e.id !== eventId),
    });
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
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <h2>{isViewerMode ? 'Instructor Profile' : 'My Profile'}</h2>
        </div>
        {!isViewerMode && !isEditing && (
          <Button onClick={handleEdit} size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
        {!isViewerMode && isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleCancel} size="sm" variant="outline">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editedProfile.bio}
                  onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell students about yourself..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editedProfile.email}
                  onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="mb-1">{profile.name}</h3>
                <p className="text-muted-foreground">{profile.bio}</p>
              </div>
              {!isViewerMode && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {profile.email}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Class Schedule</CardTitle>
          </div>
          <CardDescription>
            {isViewerMode 
              ? 'View upcoming classes and workshops' 
              : isEditing 
                ? 'Add and manage your class schedule'
                : 'Your regular classes and special events'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <ScheduleEditor
              events={editedProfile.events}
              onAddEvent={handleAddEvent}
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          ) : (
            <Tabs defaultValue="recurring" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="recurring">Weekly Classes</TabsTrigger>
                <TabsTrigger value="single">Special Events</TabsTrigger>
              </TabsList>

              <TabsContent value="recurring" className="mt-4">
                <div className="space-y-3">
                  {profile.events
                    .filter(e => e.isRecurring)
                    .sort((a, b) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0))
                    .map(event => (
                      <div key={event.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4>{event.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {getDayName(event.dayOfWeek || 0)} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground">{event.location}</p>
                          {event.description && <p className="mt-1">{event.description}</p>}
                        </div>
                      </div>
                    ))}
                  {profile.events.filter(e => e.isRecurring).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No weekly classes scheduled</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="single" className="mt-4">
                <div className="space-y-3">
                  {profile.events
                    .filter(e => !e.isRecurring)
                    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                    .map(event => (
                      <div key={event.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4>{event.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(event.date || '')} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground">{event.location}</p>
                          {event.description && <p className="mt-1">{event.description}</p>}
                        </div>
                      </div>
                    ))}
                  {profile.events.filter(e => !e.isRecurring).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No special events scheduled</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Contact Form (Viewer Mode Only) */}
      {isViewerMode && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Get in Touch</CardTitle>
            </div>
            <CardDescription>Send a message to inquire about classes</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactForm instructorName={profile.name} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
