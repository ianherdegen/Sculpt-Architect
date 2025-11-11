import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Edit, Save, X, User, Calendar, Mail, LogOut, Share2, Check } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { userProfileService } from '../lib/userProfileService';
import type { UserProfile as DBUserProfile } from '../lib/supabase';
import { useIsMobile } from './ui/use-mobile';

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
  shareId?: string; // Unique ID for shareable profile links
}

interface ProfileProps {
  userEmail: string;
  userId?: string; // For generating shareable links
  isViewerMode?: boolean;
  onSignOut?: () => void;
  initialProfile?: UserProfile; // For public profiles, pass the profile data
}

export function Profile({ userEmail, userId, isViewerMode = false, onSignOut, initialProfile }: ProfileProps) {
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialProfile && !isViewerMode);
  const [profile, setProfile] = useState<UserProfile>(
    initialProfile || {
      name: '',
      bio: '',
      email: userEmail,
      events: [],
      shareId: userId || '',
    }
  );

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);

  // Convert DB UserProfile to local UserProfile format
  const dbToLocalProfile = (dbProfile: DBUserProfile): UserProfile => {
    return {
      name: dbProfile.name || '',
      bio: dbProfile.bio || '',
      email: dbProfile.email,
      events: dbProfile.events || [],
      shareId: dbProfile.share_id || undefined,
    };
  };

  // Load profile from Supabase on mount (if not in viewer mode and userId exists)
  useEffect(() => {
    if (initialProfile || isViewerMode || !userId) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const dbProfile = await userProfileService.getOrCreate(userId, userEmail);
        const localProfile = dbToLocalProfile(dbProfile);
        setProfile(localProfile);
        setEditedProfile(localProfile);
      } catch (error) {
        console.error('Error loading profile:', error);
        // Keep default profile on error
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId, userEmail, initialProfile, isViewerMode]);

  // Update profile when initialProfile changes (for public profiles)
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setEditedProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleEdit = () => {
    setEditedProfile(profile);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (isViewerMode || !userId) {
      // For viewer mode or no userId, just update local state
      setProfile(editedProfile);
      setIsEditing(false);
      return;
    }

    // Validate custom link if it's being edited
    if (editedProfile.shareId) {
      const error = validateSlug(editedProfile.shareId);
      if (error) {
        setSlugError(error);
        return;
      }
    }
    
    try {
    setSlugError(null);
      setLoading(true);
      
      // Save to Supabase
      // If shareId is empty, use userId as default (so profile is always shareable)
      const shareIdToSave = editedProfile.shareId?.trim() || userId;
      
      await userProfileService.update(userId, {
        name: editedProfile.name,
        bio: editedProfile.bio,
        events: editedProfile.events,
        share_id: shareIdToSave,
      });
      
    setProfile(editedProfile);
    setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSlugError(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setSlugError(null);
    setIsEditing(false);
  };

  const handleCopyShareLink = async () => {
    const shareId = profile.shareId || userId || '';
    if (!shareId) return;
    
    const shareUrl = `${window.location.origin}/profile/${shareId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Helper to check if shareId is the default userId (UUID format)
  const isDefaultUserId = (shareId: string | undefined): boolean => {
    if (!shareId || !userId) return false;
    // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (36 chars with hyphens)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return shareId === userId && uuidRegex.test(shareId);
  };

  const validateSlug = (slug: string): string | null => {
    if (!slug) return null; // Custom link is optional
    
    // Allow default UUID to bypass length restrictions
    if (isDefaultUserId(slug)) {
      return null; // Default UUID is valid
    }
    
    if (slug.length < 3) return 'Custom link must be at least 3 characters';
    if (slug.length > 30) return 'Custom link must be less than 30 characters';
    if (!/^[a-z0-9-]+$/.test(slug)) return 'Custom link can only contain lowercase letters, numbers, and hyphens';
    if (slug.startsWith('-') || slug.endsWith('-')) return 'Custom link cannot start or end with a hyphen';
    return null;
  };

  const handleAddEvent = async (event: ClassEvent) => {
    const updatedEvents = [...editedProfile.events, event];
    const updatedProfile = {
      ...editedProfile,
      events: updatedEvents,
    };
    setEditedProfile(updatedProfile);
    
    // Auto-save events to Supabase if not in viewer mode and userId exists
    if (!isViewerMode && userId) {
      try {
        await userProfileService.update(userId, {
          events: updatedEvents,
    });
        // Update the main profile state so changes are reflected immediately
        setProfile(updatedProfile);
      } catch (error) {
        console.error('Error auto-saving event:', error);
        // Don't show error to user for auto-save, just log it
      }
    }
  };

  const handleUpdateEvent = async (eventId: string, updatedEvent: ClassEvent) => {
    const updatedEvents = editedProfile.events.map(e => e.id === eventId ? updatedEvent : e);
    const updatedProfile = {
      ...editedProfile,
      events: updatedEvents,
    };
    setEditedProfile(updatedProfile);
    
    // Auto-save events to Supabase if not in viewer mode and userId exists
    if (!isViewerMode && userId) {
      try {
        await userProfileService.update(userId, {
          events: updatedEvents,
        });
        // Update the main profile state so changes are reflected immediately
        setProfile(updatedProfile);
      } catch (error) {
        console.error('Error auto-saving event update:', error);
        // Don't show error to user for auto-save, just log it
      }
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const updatedEvents = editedProfile.events.filter(e => e.id !== eventId);
    const updatedProfile = {
      ...editedProfile,
      events: updatedEvents,
    };
    setEditedProfile(updatedProfile);
    
    // Auto-save events to Supabase if not in viewer mode and userId exists
    if (!isViewerMode && userId) {
      try {
        await userProfileService.update(userId, {
          events: updatedEvents,
        });
        // Update the main profile state so changes are reflected immediately
        setProfile(updatedProfile);
      } catch (error) {
        console.error('Error auto-saving event deletion:', error);
        // Don't show error to user for auto-save, just log it
      }
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
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="space-y-6 py-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${isMobile ? 'py-4' : 'py-6'} ${isViewerMode && isMobile ? 'px-0' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <h2 className="text-xl font-semibold">{isViewerMode ? 'Instructor Profile' : 'My Profile'}</h2>
        </div>
        {!isViewerMode && !isEditing && (
          <div className="flex gap-2 ml-auto">
            <Button onClick={handleCopyShareLink} size="sm" variant="outline">
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="ml-2">{isMobile ? 'Copied!' : 'Link Copied!'}</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span className="ml-2">{isMobile ? 'Share' : 'Share Profile'}</span>
                </>
              )}
            </Button>
            <Button onClick={handleEdit} size="sm">
              <Edit className="h-4 w-4" />
              <span className="ml-2">{isMobile ? 'Edit' : 'Edit Profile'}</span>
            </Button>
          </div>
        )}
        {!isViewerMode && isEditing && (
          <div className="flex gap-2 ml-auto">
            <Button onClick={handleSave} size="sm">
              <Save className="h-4 w-4" />
              <span className="ml-2">Save</span>
            </Button>
            <Button onClick={handleCancel} size="sm" variant="outline">
              <X className="h-4 w-4" />
              <span className="ml-2">Cancel</span>
            </Button>
          </div>
        )}
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader className={isMobile && isViewerMode ? 'px-4 pt-6 pb-2' : isMobile ? 'pt-6 pb-2' : ''}>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${isMobile && isViewerMode ? 'px-4 pt-3 pb-4' : isMobile ? 'pt-3' : ''}`}>
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editedProfile.name}
                  onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                  placeholder="Your name"
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
                <Label htmlFor="shareId">Custom Profile Link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="shareId"
                    value={editedProfile.shareId || ''}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setEditedProfile({ ...editedProfile, shareId: value });
                      setSlugError(null);
                    }}
                    placeholder="your-custom-link"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const shareId = editedProfile.shareId || userId || '';
                      if (!shareId) return;
                      
                      const shareUrl = `${window.location.origin}/profile/${shareId}`;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      } catch (error) {
                        console.error('Failed to copy link:', error);
                        const textArea = document.createElement('textarea');
                        textArea.value = shareUrl;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2000);
                      }
                    }}
                    disabled={!editedProfile.shareId && !userId}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        Copy Full Link
                      </>
                    )}
                  </Button>
                </div>
                {slugError && (
                  <p className="text-sm text-destructive">{slugError}</p>
                )}
                {/* Show full link preview - hidden on mobile */}
                {(editedProfile.shareId || userId) && !isMobile && (
                  <div className="p-2 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Full link:</p>
                    <code className="text-xs break-all">
                      {window.location.origin}/profile/{editedProfile.shareId || userId}
                    </code>
                  </div>
                )}
                {isDefaultUserId(editedProfile.shareId) ? (
                  <p className="text-xs text-muted-foreground">
                    You're currently using the default ID. Set a custom link (3-30 characters) for a cleaner, shareable URL.
                  </p>
                ) : (
                <p className="text-xs text-muted-foreground">
                  Choose a custom link for your profile (e.g., "yoga-instructor" or "sarah-martinez")
                </p>
                )}
              </div>
            </>
          ) : (
            <>
              {profile.name && (
                <div>
                  <h3 className="text-lg font-semibold mb-1">{profile.name}</h3>
                </div>
              )}
              {profile.bio && (
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              )}
              {!profile.name && !profile.bio && (
                <p className="text-muted-foreground italic">No profile information yet. Click "Edit Profile" to add your bio.</p>
              )}
              {!isViewerMode && (
                <div className="pt-2 border-t space-y-2">
                  {profile.shareId && !isDefaultUserId(profile.shareId) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Profile link:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {profile.shareId}
                      </code>
                    </div>
                  )}
                  {profile.shareId && isDefaultUserId(profile.shareId) && !isMobile && (
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Full profile link:</p>
                      <code className="text-xs break-all">
                        {window.location.origin}/profile/{profile.shareId}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Using default ID. Set a custom link in edit mode for a cleaner URL.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader className={isMobile && isViewerMode ? 'px-4 pt-6 pb-2' : isMobile ? 'pt-6 pb-2' : ''}>
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
        <CardContent className={isMobile && isViewerMode ? 'px-4 pt-3 pb-4' : isMobile ? 'pt-3' : ''}>
          {isEditing ? (
            <ScheduleEditor
              events={editedProfile.events}
              onAddEvent={handleAddEvent}
              onUpdateEvent={handleUpdateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          ) : (
            <Tabs defaultValue="recurring" className="w-full">
              <TabsList>
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
                            <h4 className="font-medium">{event.title}</h4>
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
                            <h4 className="font-medium">{event.title}</h4>
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

      {/* Logout Button (Not in Viewer Mode) */}
      {!isViewerMode && onSignOut && (
        <div className="pt-6 border-t">
          <Button variant="outline" onClick={onSignOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      )}
    </div>
  );
}

