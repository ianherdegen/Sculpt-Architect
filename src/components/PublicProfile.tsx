import React, { useState, useEffect } from 'react';
import { Profile, UserProfile } from './Profile';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { userProfileService } from '../lib/userProfileService';
import type { UserProfile as DBUserProfile } from '../lib/supabase';

interface PublicProfileProps {
  shareId: string;
}

export function PublicProfile({ shareId }: PublicProfileProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    };
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const dbProfile = await userProfileService.getByShareId(shareId);
        
        if (!dbProfile) {
          setProfile(null);
          setProfileUserId(null);
          return;
        }

        // Check if user is banned
        if (dbProfile.is_banned) {
          setProfile(null);
          setProfileUserId(null);
          return;
        }
        
        const localProfile = dbToLocalProfile(dbProfile);
        setProfile(localProfile);
        // Get user_id from the database profile for loading sequences
        setProfileUserId(dbProfile.user_id);
      } catch (error) {
        console.error('Error loading public profile:', error);
        setProfile(null);
        setProfileUserId(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [shareId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    // Only show back button if user came from same origin (not a direct link)
    const referrer = document.referrer;
    const hasReferrer = referrer && new URL(referrer).origin === window.location.origin;
    
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Profile not found</p>
        {hasReferrer ? (
          <Button onClick={() => navigate(-1)} className="mt-4">
            Back
          </Button>
        ) : (
          <Button onClick={() => navigate('/')} className="mt-4">
            Go to Home
          </Button>
        )}
      </div>
    );
  }

  return (
    <Profile 
      userEmail={profile.email} 
      userId={shareId}
      profileUserId={profileUserId || undefined}
      isViewerMode={true}
      initialProfile={profile}
    />
  );
}

