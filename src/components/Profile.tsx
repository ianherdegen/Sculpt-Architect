import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Edit, Save, X, User, Calendar, Mail, LogOut, Share2, Check, Shield, ExternalLink, Upload, Trash2, Clock, List, Music, Plus } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';
import { userProfileService } from '../lib/userProfileService';
import { sequenceService } from '../lib/supabaseService';
import type { UserProfile as DBUserProfile } from '../lib/supabase';
import type { Sequence } from '../lib/supabase';
import { useIsMobile } from './ui/use-mobile';
import { usePermission } from '../lib/usePermissions';
import { calculateSequenceDuration, formatDuration } from '../lib/timeUtils';

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
  venmoUsername?: string; // Venmo username for payment links
  profilePhotoUrl?: string; // Profile photo URL
  spotifyPlaylistUrls?: string[]; // Array of Spotify playlist URLs
}

interface ProfileProps {
  userEmail: string;
  userId?: string; // For generating shareable links
  profileUserId?: string; // The actual user_id from database (for loading sequences)
  isViewerMode?: boolean;
  onSignOut?: () => void;
  initialProfile?: UserProfile; // For public profiles, pass the profile data
}

export function Profile({ userEmail, userId, profileUserId, isViewerMode = false, onSignOut, initialProfile }: ProfileProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { hasPermission: hasAdminAccess } = usePermission('admin');
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
      venmoUsername: '',
      profilePhotoUrl: '',
      spotifyPlaylistUrls: [],
    }
  );

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [publishedSequences, setPublishedSequences] = useState<Sequence[]>([]);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [spotifyUrlErrors, setSpotifyUrlErrors] = useState<Record<number, string | null>>({});
  const [newSpotifyUrl, setNewSpotifyUrl] = useState('');
  const [spotifyPlaylistData, setSpotifyPlaylistData] = useState<Record<number, { thumbnail_url?: string; title?: string }>>({});
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  // Convert DB UserProfile to local UserProfile format
  const dbToLocalProfile = (dbProfile: DBUserProfile): UserProfile => {
    return {
      name: dbProfile.name || '',
      bio: dbProfile.bio || '',
      email: dbProfile.email,
      events: dbProfile.events || [],
      shareId: dbProfile.share_id || undefined,
      venmoUsername: dbProfile.venmo_username || undefined,
      profilePhotoUrl: dbProfile.profile_photo_url || undefined,
      spotifyPlaylistUrls: dbProfile.spotify_playlist_urls || [],
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

  // Load published sequences when viewing a public profile or own profile
  useEffect(() => {
    // Use profileUserId if available (public profile), otherwise use userId (own profile)
    const userIdToLoad = profileUserId || userId;
    
    if (userIdToLoad) {
      const loadSequences = async () => {
        try {
          setLoadingSequences(true);
          console.log('Loading sequences for user:', userIdToLoad, 'isViewerMode:', isViewerMode);
          const sequences = await sequenceService.getPublishedByUserId(userIdToLoad);
          console.log('Loaded sequences:', sequences);
          setPublishedSequences(sequences);
        } catch (error) {
          console.error('Error loading published sequences:', error);
        } finally {
          setLoadingSequences(false);
        }
      };
      loadSequences();
    }
  }, [isViewerMode, profileUserId, userId]);

  // Load Spotify playlist data when profile has playlist URLs
  useEffect(() => {
    if (profile.spotifyPlaylistUrls && profile.spotifyPlaylistUrls.length > 0) {
      const loadPlaylistData = async () => {
        try {
          setLoadingPlaylists(true);
          const playlistData: Record<number, { thumbnail_url?: string; title?: string }> = {};
          
          // Fetch metadata for each playlist
          await Promise.all(
            profile.spotifyPlaylistUrls.map(async (url, index) => {
              try {
                const encodedUrl = encodeURIComponent(url);
                const response = await fetch(`https://embed.spotify.com/oembed?url=${encodedUrl}`);
                
                if (response.ok) {
                  const data = await response.json();
                  playlistData[index] = {
                    thumbnail_url: data.thumbnail_url,
                    title: data.title,
                  };
                }
              } catch (error) {
                console.error(`Error loading playlist ${index + 1}:`, error);
              }
            })
          );
          
          setSpotifyPlaylistData(playlistData);
        } catch (error) {
          console.error('Error loading Spotify playlist data:', error);
        } finally {
          setLoadingPlaylists(false);
        }
      };
      loadPlaylistData();
    } else {
      setSpotifyPlaylistData({});
    }
  }, [profile.spotifyPlaylistUrls]);


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
    
    // Validate all Spotify playlist URLs
    const urlErrors: Record<number, string | null> = {};
    if (editedProfile.spotifyPlaylistUrls) {
      editedProfile.spotifyPlaylistUrls.forEach((url, index) => {
        if (url) {
          const error = validateSpotifyPlaylistUrl(url);
          if (error) {
            urlErrors[index] = error;
          }
        }
      });
    }
    
    if (Object.keys(urlErrors).length > 0) {
      setSpotifyUrlErrors(urlErrors);
      return;
    }
    
    try {
    setSlugError(null);
    setSpotifyUrlErrors({});
      setLoading(true);
      
      // Save to Supabase
      // If shareId is empty, use userId as default (so profile is always shareable)
      const shareIdToSave = editedProfile.shareId?.trim() || userId;
      
      await userProfileService.update(userId, {
        name: editedProfile.name,
        bio: editedProfile.bio,
        events: editedProfile.events,
        share_id: shareIdToSave,
        venmo_username: editedProfile.venmoUsername?.trim() || null,
        spotify_playlist_urls: editedProfile.spotifyPlaylistUrls?.filter(url => url.trim()) || [],
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
    setSpotifyUrlErrors({});
    setNewSpotifyUrl('');
    setIsEditing(false);
  };

  const handleAddSpotifyPlaylist = () => {
    if (!newSpotifyUrl.trim()) return;
    
    const trimmedUrl = newSpotifyUrl.trim();
    const error = validateSpotifyPlaylistUrl(trimmedUrl);
    if (error) {
      // Show error - user needs to fix URL before adding
      alert(error);
      return;
    }
    
    const currentUrls = editedProfile.spotifyPlaylistUrls || [];
    if (!currentUrls.includes(trimmedUrl)) {
      setEditedProfile({
        ...editedProfile,
        spotifyPlaylistUrls: [...currentUrls, trimmedUrl],
      });
      setNewSpotifyUrl('');
      setSpotifyUrlErrors({});
    }
  };

  const handleNewSpotifyUrlBlur = () => {
    // Auto-add if URL is valid when user leaves the field
    if (newSpotifyUrl.trim()) {
      const trimmedUrl = newSpotifyUrl.trim();
      const error = validateSpotifyPlaylistUrl(trimmedUrl);
      if (!error) {
        handleAddSpotifyPlaylist();
      }
    }
  };

  const handleRemoveSpotifyPlaylist = (index: number) => {
    const currentUrls = editedProfile.spotifyPlaylistUrls || [];
    setEditedProfile({
      ...editedProfile,
      spotifyPlaylistUrls: currentUrls.filter((_, i) => i !== index),
    });
    // Clear error for this index
    const newErrors = { ...spotifyUrlErrors };
    delete newErrors[index];
    setSpotifyUrlErrors(newErrors);
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

  const validateSpotifyPlaylistUrl = (url: string): string | null => {
    if (!url) return null; // Spotify playlist URL is optional
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return null;
    
    // Check if it's a valid Spotify playlist URL
    // Spotify playlist URLs can be:
    // - https://open.spotify.com/playlist/{id}?si=...
    // - https://spotify.com/playlist/{id}?si=...
    // - spotify:playlist:{id}
    // Playlist IDs are typically 22 characters alphanumeric, but can vary
    // Allow query parameters like ?si=... which Spotify adds when sharing
    const spotifyPlaylistPattern = /^(https?:\/\/(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+(\?[^\s]*)?|spotify:playlist:[a-zA-Z0-9]+)$/;
    
    if (!spotifyPlaylistPattern.test(trimmedUrl)) {
      return 'Please enter a valid Spotify playlist URL (e.g., https://open.spotify.com/playlist/...)';
    }
    
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

  // Convert URLs in text to clickable links
  const linkifyText = (text: string): React.ReactNode => {
    // URL regex pattern: matches http://, https://, www., or domain.com patterns
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    while ((match = urlRegex.exec(text)) !== null) {
      // Add text before the URL
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push(<React.Fragment key={`text-${keyCounter++}`}>{beforeText}</React.Fragment>);
        }
      }

      // Add the URL as a link
      let url = match[0];
      let displayUrl = url;
      
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // Truncate display URL if too long
      if (displayUrl.length > 50) {
        displayUrl = displayUrl.substring(0, 47) + '...';
      }

      parts.push(
        <a
          key={`link-${keyCounter++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {displayUrl}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        parts.push(<React.Fragment key={`text-${keyCounter++}`}>{remainingText}</React.Fragment>);
      }
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId || isViewerMode) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      // Upload original image without any processing
      const photoUrl = await userProfileService.uploadProfilePhoto(userId, file);
      const updatedProfile = { ...profile, profilePhotoUrl: photoUrl };
      setProfile(updatedProfile);
      setEditedProfile(updatedProfile);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert(error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async () => {
    if (!userId || !profile.profilePhotoUrl || isViewerMode) return;

    if (!confirm('Are you sure you want to delete your profile photo?')) {
      return;
    }

    try {
      setUploadingPhoto(true);
      await userProfileService.deleteProfilePhoto(userId, profile.profilePhotoUrl);
      const updatedProfile = { ...profile, profilePhotoUrl: undefined };
      setProfile(updatedProfile);
      setEditedProfile(updatedProfile);
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      alert(error.message || 'Failed to delete photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
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
            {hasAdminAccess && (
              <Button onClick={() => navigate('/admin')} size="sm" variant="outline">
                <Shield className="h-4 w-4" />
              </Button>
            )}
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
          {/* Profile Photo */}
          <div className="flex flex-col items-start gap-3">
            <div 
              className="relative group"
              style={{ width: '150px', height: '150px' }}
            >
              {profile.profilePhotoUrl ? (
                <div 
                  className="rounded-full overflow-hidden border-2 border-border shadow-sm w-full h-full"
                  style={{ 
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%'
                  }}
                >
                  <img
                    src={profile.profilePhotoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                </div>
              ) : (
                <div 
                  className="rounded-full bg-muted flex items-center justify-center border-2 border-border shadow-sm"
                  style={{ 
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%'
                  }}
                >
                  <User className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              {!isViewerMode && isEditing && (
                <div 
                  className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition-opacity duration-200 rounded-full ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  style={{
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    zIndex: 10
                  }}
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingPhoto}
                    className="h-8 px-3 text-xs relative z-20"
                  >
                    {uploadingPhoto ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                  </Button>
                  {profile.profilePhotoUrl && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePhotoDelete();
                      }}
                      disabled={uploadingPhoto}
                      className="h-8 px-3 text-xs text-destructive hover:text-destructive relative z-20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
              className="hidden"
            />
          </div>
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
              <div className="space-y-2">
                <Label htmlFor="venmoUsername">Venmo Username</Label>
                <Input
                  id="venmoUsername"
                  value={editedProfile.venmoUsername || ''}
                  onChange={(e) => {
                    // Remove @ symbol if user types it, Venmo usernames don't include @
                    const value = e.target.value.replace('@', '').trim();
                    setEditedProfile({ ...editedProfile, venmoUsername: value });
                  }}
                  placeholder="your-venmo-username"
                />
                <p className="text-xs text-muted-foreground">
                  Your Venmo username (without @) will be displayed on your public profile with a payment link.
                </p>
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
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {linkifyText(profile.bio)}
                </p>
              )}
              {profile.venmoUsername && (
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🫴</span>
                    <span className="font-medium">Donations:</span>
                  </div>
                  <div className="flex items-center gap-1 pl-7">
                    <span className="font-medium">Venmo:</span>
                    <a
                      href={`https://venmo.com/${profile.venmoUsername.replace(/^@/, '')}?txn=pay`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3D95CE] hover:underline flex items-center gap-1 font-medium"
                    >
                      @{profile.venmoUsername.replace(/^@/, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
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

      {/* Published Sequences */}
      {(
        <Card>
          <CardHeader className={isMobile && isViewerMode ? 'px-4 pt-6 pb-2' : isMobile ? 'pt-6 pb-2' : ''}>
            <div className="flex items-center gap-2">
              <List className="h-5 w-5" />
              <CardTitle>Sequences</CardTitle>
            </div>
            <CardDescription>
              Published sequences
            </CardDescription>
          </CardHeader>
          <CardContent className={isMobile && isViewerMode ? 'px-4 pt-3 pb-4' : isMobile ? 'pt-3' : ''}>
            {loadingSequences ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading sequences...</p>
              </div>
            ) : publishedSequences.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {isViewerMode 
                  ? "No published sequences yet" 
                  : "No sequences published to your profile yet. Use the globe icon in Sequence Library to publish sequences."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publishedSequences.map((sequence) => {
                  const totalDuration = calculateSequenceDuration(sequence as any);
                  const sectionCount = sequence.sections?.length || 0;
                  return (
                    <Card
                      key={sequence.id}
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => navigate(`/sequence/${sequence.id}`)}
                    >
                      <h3 className="text-lg font-semibold mb-2 text-black dark:text-white">
                        {sequence.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(totalDuration)}</span>
                        {sectionCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{sectionCount} {sectionCount === 1 ? 'section' : 'sections'}</span>
                          </>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Spotify Playlists */}
      <Card>
        <CardHeader className={isMobile && isViewerMode ? 'px-4 pt-6 pb-2' : isMobile ? 'pt-6 pb-2' : ''}>
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-[#1DB954]" />
            <CardTitle>Playlists</CardTitle>
          </div>
          <CardDescription>
            Music playlists for classes
          </CardDescription>
        </CardHeader>
        <CardContent className={isMobile && isViewerMode ? 'px-4 pt-3 pb-4' : isMobile ? 'pt-3' : ''}>
          {isEditing && !isViewerMode ? (
            // Edit mode
            <div className="space-y-2">
              <div className="space-y-2">
                {(editedProfile.spotifyPlaylistUrls || []).map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...(editedProfile.spotifyPlaylistUrls || [])];
                        newUrls[index] = e.target.value.trim();
                        setEditedProfile({ ...editedProfile, spotifyPlaylistUrls: newUrls });
                        // Clear error for this index
                        const newErrors = { ...spotifyUrlErrors };
                        delete newErrors[index];
                        setSpotifyUrlErrors(newErrors);
                      }}
                      placeholder="https://open.spotify.com/playlist/..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSpotifyPlaylist(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newSpotifyUrl}
                    onChange={(e) => setNewSpotifyUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSpotifyPlaylist();
                      }
                    }}
                    onBlur={handleNewSpotifyUrlBlur}
                    placeholder="https://open.spotify.com/playlist/..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    onClick={handleAddSpotifyPlaylist}
                    className="h-8 w-8"
                    title="Add playlist (or press Enter)"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {Object.keys(spotifyUrlErrors).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(spotifyUrlErrors).map(([index, error]) => (
                    error && (
                      <p key={index} className="text-sm text-destructive">
                        Playlist {parseInt(index) + 1}: {error}
                      </p>
                    )
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Add Spotify playlist URLs to share music with your students.
              </p>
            </div>
          ) : profile.spotifyPlaylistUrls && profile.spotifyPlaylistUrls.length > 0 ? (
            // View mode - show playlists
            loadingPlaylists ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading playlists...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.spotifyPlaylistUrls.map((url, index) => {
                  const playlistInfo = spotifyPlaylistData[index];
                  return (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:shadow-lg transition-shadow"
                    >
                      {playlistInfo?.thumbnail_url ? (
                        <img
                          src={playlistInfo.thumbnail_url}
                          alt={playlistInfo.title || 'Spotify Playlist'}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#1DB954] flex items-center justify-center flex-shrink-0">
                          <Music className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs sm:text-sm font-semibold text-black dark:text-white group-hover:text-[#1DB954] transition-colors break-words">
                          {playlistInfo?.title || `Playlist ${index + 1}`}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Open on Spotify</p>
                      </div>
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-[#1DB954] transition-colors flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            )
          ) : (
            // No playlists
            <p className="text-center text-muted-foreground py-8">
              {isViewerMode 
                ? "No playlists yet" 
                : "No playlists added yet. Click 'Edit Profile' to add playlists."}
            </p>
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

