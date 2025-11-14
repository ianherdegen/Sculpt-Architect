import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import { PoseLibrary } from './components/PoseLibrary';
import { SequenceBuilder } from './components/SequenceBuilder';
import { SequenceLibrary } from './components/SequenceLibrary';
import { SequenceView } from './components/SequenceView';
import { PublicSequenceView } from './components/PublicSequenceView';
import { AuthPage } from './components/AuthPage';
import { Profile } from './components/Profile';
import { PublicProfile } from './components/PublicProfile';
import { AdminPage } from './components/AdminPage';
import { Pose, PoseVariation, Sequence, PoseInstance, GroupBlock } from './types';
import { poseService, poseVariationService, sequenceService } from './lib/supabaseService';
import type { Sequence as DBSequence } from './lib/supabase';
import { useAuth } from './lib/auth';
import { Dumbbell, ListOrdered, BookOpen, User, Home, Heart } from 'lucide-react';
import { Button } from './components/ui/button';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { useIsMobile } from './components/ui/use-mobile';
import { useNavigate } from 'react-router-dom';

// Component to update page title and meta tags based on route
function PageTitle() {
  const location = useLocation();
  
  useEffect(() => {
    const getPageTitle = () => {
      const path = location.pathname;
      
      if (path === '/' || path === '/auth') {
        return 'Sculpt Architect | Home';
      } else if (path === '/sequence-builder') {
        return 'Sequence Builder | Sculpt Architect';
      } else if (path === '/sequence-library') {
        return 'Sequence Library | Sculpt Architect';
      } else if (path === '/pose-library') {
        return 'Pose Library | Sculpt Architect';
      } else if (path === '/profile') {
        return 'Profile | Sculpt Architect';
      } else if (path.startsWith('/profile/')) {
        return 'Public Profile | Sculpt Architect';
      }
      
      return 'Sculpt Architect | Home';
    };
    
    const title = getPageTitle();
    // Set page title
    document.title = title;
    
    // Update or create Open Graph title meta tag - always match page title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', title);
    
    // Also update Twitter title to match
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.setAttribute('name', 'twitter:title');
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.setAttribute('content', title);
    
    // Update or create Open Graph URL meta tag
    const baseUrl = window.location.origin;
    const currentUrl = baseUrl + location.pathname;
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', currentUrl);
    
    // Update or create Open Graph image meta tag (use absolute URL)
    const ogImageUrl = baseUrl + '/og-image.svg';
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', ogImageUrl);
    
    // Update Twitter image meta tag
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.setAttribute('name', 'twitter:image');
      document.head.appendChild(twitterImage);
    }
    twitterImage.setAttribute('content', ogImageUrl);
    
    // Update or create standard meta name tag
    let metaName = document.querySelector('meta[name="title"]');
    if (!metaName) {
      metaName = document.createElement('meta');
      metaName.setAttribute('name', 'title');
      document.head.appendChild(metaName);
    }
    metaName.setAttribute('content', title);
  }, [location.pathname]);
  
  return null;
}

function NavTabs({ location, isSmallScreen }: { location: ReturnType<typeof useLocation>, isSmallScreen: boolean }) {
  const navigate = useNavigate();
  
  const getActiveTab = () => {
    if (location.pathname === '/sequence-builder') return 'builder';
    if (location.pathname.startsWith('/sequence-library')) return 'sequences';
    if (location.pathname === '/pose-library') return 'library';
    return 'builder';
  };

  const handleTabChange = (value: string) => {
    if (value === 'builder') navigate('/sequence-builder');
    if (value === 'sequences') navigate('/sequence-library');
    if (value === 'library') navigate('/pose-library');
  };

  return (
    <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full mb-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="builder" className={isSmallScreen ? 'text-xs' : ''}>
          <ListOrdered className="h-4 w-4 mr-2" />
          {isSmallScreen ? 'Builder' : 'Sequence Builder'}
        </TabsTrigger>
        <TabsTrigger value="sequences" className={isSmallScreen ? 'text-xs' : ''}>
          <BookOpen className="h-4 w-4 mr-2" />
          {isSmallScreen ? 'Sequences' : 'Sequence Library'}
        </TabsTrigger>
        <TabsTrigger value="library" className={isSmallScreen ? 'text-xs' : ''}>
          <Dumbbell className="h-4 w-4 mr-2" />
          {isSmallScreen ? 'Poses' : 'Pose Library'}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

function ProfileRoute({ signOut, userEmail, userId }: { signOut: () => Promise<void>, userEmail: string, userId: string }) {
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      // Add a small delay to ensure state is fully cleared before redirect
      // This is especially important on deployed environments
      await new Promise(resolve => setTimeout(resolve, 200));
      // Use window.location to force a full page reload and ensure auth state is cleared
      // This prevents race conditions where navigation happens before state updates
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Still navigate even if there's an error, but wait a bit first
      await new Promise(resolve => setTimeout(resolve, 200));
      window.location.href = '/';
    }
  };

  return (
    <AppLayout>
      <Profile userEmail={userEmail} userId={userId} onSignOut={handleSignOut} />
    </AppLayout>
  );
}

function PublicSequenceRoute() {
  const { id } = useParams<{ id: string }>();
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [variations, setVariations] = useState<PoseVariation[]>([]);
  const [loading, setLoading] = useState(true);

  // Convert database sequence to app sequence format
  const convertDBSequenceToApp = (dbSequence: DBSequence): Sequence => {
    return {
      id: dbSequence.id,
      name: dbSequence.name,
      sections: dbSequence.sections,
    };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load sequence by UUID (public access)
        if (id) {
          const loadedSequence = await sequenceService.getByIdPublic(id);
          if (!loadedSequence) {
            setSequence(null);
            setLoading(false);
            return;
          }
          // Convert to app format
          setSequence(convertDBSequenceToApp(loadedSequence));
        }
        
        // Load poses and variations (public access)
        const [posesData, variationsData] = await Promise.all([
          poseService.getAll(),
          poseVariationService.getAll()
        ]);
        
        setPoses(posesData);
        setVariations(variationsData);
      } catch (error) {
        console.error('Error loading public sequence:', error);
        setSequence(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading sequence...</p>
        </div>
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Sequence not found</p>
          <Button onClick={() => window.location.href = '/'}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <PublicSequenceView
      sequence={sequence}
      poses={poses}
      variations={variations}
    />
  );
}

function PublicProfileRoute() {
  const { shareId } = useParams<{ shareId: string }>();
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative w-full">
          <div className="container max-w-2xl mx-auto">
            <div className="flex h-16 items-center justify-center px-6 py-4">
              <h1 className="text-xl font-light tracking-widest uppercase">SCULPT ARCHITECT</h1>
            </div>
          </div>
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="container max-w-2xl mx-auto px-4 sm:px-6">
        <div className="py-4 sm:py-6">
          <PublicProfile shareId={shareId || ''} />
        </div>
      </div>
    </div>
  );
}

function AppLayout({ children }: { children?: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const isProfilePage = location.pathname === '/profile';
  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative w-full">
          <div className="container max-w-2xl mx-auto">
            <div className="flex h-16 items-center justify-center px-6 py-4">
              <h1 className="text-xl font-light tracking-widest uppercase">SCULPT ARCHITECT</h1>
            </div>
          </div>
          {isProfilePage ? (
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Link to="/sequence-library">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : !isAdminPage ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>
      <div className="container max-w-2xl mx-auto flex-1">
        <div className={`${isSmallScreen ? 'py-4 px-4' : 'py-6'}`}>
          {/* Navigation */}
          {!isProfilePage && !isAdminPage && (
            <NavTabs location={location} isSmallScreen={isSmallScreen} />
          )}
          {children}
        </div>
      </div>
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
        <div className="container max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-4 px-6">
            <a
              href="https://github.com/sponsors/ianherdegen"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Heart className="h-4 w-4" />
              <span>Sponsor this project</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [poses, setPoses] = useState<Pose[]>([]);
  const [variations, setVariations] = useState<PoseVariation[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data on mount (only if user is logged in)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [posesData, variationsData, sequencesData] = await Promise.all([
          poseService.getAll(),
          poseVariationService.getAll(),
          sequenceService.getAll(user.id)
        ]);
        
        setPoses(posesData);
        setVariations(variationsData);
        setSequences(sequencesData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to empty arrays if Supabase is not configured
        setPoses([]);
        setVariations([]);
        setSequences([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Helper function to check if a variation is used in any item
  const isVariationUsedInItem = (item: PoseInstance | GroupBlock, variationId: string): boolean => {
    if (item.type === 'pose_instance') {
      return item.poseVariationId === variationId;
    } else {
      // Check items in group block
      const usedInItems = item.items.some(subItem => isVariationUsedInItem(subItem, variationId));
      if (usedInItems) return true;
      
      // Check round overrides
      for (const override of item.roundOverrides) {
        if (override.items.some(subItem => isVariationUsedInItem(subItem, variationId))) {
          return true;
        }
      }
      return false;
    }
  };

  // Helper function to find sequences using a specific variation
  const findSequencesUsingVariation = (variationId: string): string[] => {
    const sequenceNames: string[] = [];
    
    for (const sequence of sequences) {
      for (const section of sequence.sections) {
        for (const item of section.items) {
          if (isVariationUsedInItem(item, variationId)) {
            sequenceNames.push(sequence.name);
            break;
          }
        }
        if (sequenceNames.includes(sequence.name)) break;
      }
    }
    
    return sequenceNames;
  };

  // Helper function to find sequences using any variation of a pose
  const findSequencesUsingPose = (poseId: string): string[] => {
    const poseVariations = variations.filter(v => v.poseId === poseId);
    const sequenceNames = new Set<string>();
    
    for (const variation of poseVariations) {
      const sequences = findSequencesUsingVariation(variation.id);
      sequences.forEach(name => sequenceNames.add(name));
    }
    
    return Array.from(sequenceNames);
  };

  const handleAddPose = async (pose: Omit<Pose, 'id' | 'created_at' | 'updated_at'>, defaultVariation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newPose = await poseService.create(pose);
      const newVariation = await poseVariationService.create({
        ...defaultVariation,
        poseId: newPose.id
      });
      
      setPoses([...poses, newPose]);
      setVariations([...variations, newVariation]);
    } catch (error) {
      console.error('Error adding pose:', error);
      alert('Failed to add pose. Please try again.');
    }
  };

  const handleDeletePose = async (poseId: string) => {
    // Check if pose is used in any sequence (across all users)
    const poseVariations = variations.filter(v => v.poseId === poseId);
    const variationIds = poseVariations.map(v => v.id);
    
    try {
      const { used } = await sequenceService.isPoseUsedInAnySequence(poseId, variationIds);
      if (used) {
        alert(`Cannot delete pose. It is currently being used in existing sequences.`);
        return;
      }
    } catch (error: any) {
      console.error('Error checking pose usage:', error);
      // If check fails, don't allow deletion - safety first
      const errorMsg = error?.message || 'Unknown error';
      if (errorMsg.includes('function') || errorMsg.includes('check_variation_usage') || errorMsg.includes('permission denied')) {
        alert('Database function not found. Please run the SQL function in Supabase first.\n\nSee: supabase-variation-check-function.sql');
      } else {
        alert(`Cannot verify if pose is safe to delete: ${errorMsg}\n\nDeletion blocked for safety.`);
      }
      return;
    }

    // Only proceed with deletion if check passed
    try {
      await poseService.delete(poseId);
      setPoses(poses.filter(p => p.id !== poseId));
      setVariations(variations.filter(v => v.poseId !== poseId));
    } catch (error) {
      console.error('Error deleting pose:', error);
      alert('Failed to delete pose. Please try again.');
    }
  };

  const handleAddVariation = async (variation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'>): Promise<PoseVariation> => {
    try {
      const newVariation = await poseVariationService.create(variation);
      setVariations([...variations, newVariation]);
      return newVariation;
    } catch (error) {
      console.error('Error adding variation:', error);
      alert('Failed to add variation. Please try again.');
      throw error;
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    const variation = variations.find(v => v.id === variationId);
    if (!variation) return;

    // Check if variation is used in any sequence (across all users)
    try {
      const { used } = await sequenceService.isVariationUsedInAnySequence(variationId);
      if (used) {
        alert(`Cannot delete variation. It is currently being used in existing sequences.`);
        return;
      }
    } catch (error: any) {
      console.error('Error checking variation usage:', error);
      // If check fails, don't allow deletion - safety first
      const errorMsg = error?.message || 'Unknown error';
      if (errorMsg.includes('function') || errorMsg.includes('check_variation_usage') || errorMsg.includes('permission denied')) {
        alert('Database function not found. Please run the SQL function in Supabase first.\n\nSee: supabase-variation-check-function.sql');
      } else {
        alert(`Cannot verify if variation is safe to delete: ${errorMsg}\n\nDeletion blocked for safety.`);
      }
      return;
    }

    // Don't allow deleting default variation if it's the only one
    const poseVariations = variations.filter(v => v.poseId === variation.poseId);
    if (variation.isDefault && poseVariations.length === 1) {
      alert('Cannot delete the only variation of a pose.');
      return;
    }

    try {
      await poseVariationService.delete(variationId);
      
      // If deleting default variation and there are others, set a new default
      if (variation.isDefault && poseVariations.length > 1) {
        const updatedVariations = variations.filter(v => v.id !== variationId);
        const otherVariation = updatedVariations.find(v => v.poseId === variation.poseId);
        if (otherVariation) {
          await poseVariationService.update(otherVariation.id, { isDefault: true });
          otherVariation.isDefault = true;
        }
        setVariations(updatedVariations);
      } else {
        setVariations(variations.filter(v => v.id !== variationId));
      }
    } catch (error) {
      console.error('Error deleting variation:', error);
      alert('Failed to delete variation. Please try again.');
    }
  };

  const handleSetDefaultVariation = async (poseId: string, variationId: string) => {
    try {
      // Update all variations for this pose to set the correct default
      const poseVariations = variations.filter(v => v.poseId === poseId);
      for (const variation of poseVariations) {
        await poseVariationService.update(variation.id, { 
          isDefault: variation.id === variationId 
        });
      }
      
      const updatedVariations = variations.map(v => {
        if (v.poseId === poseId) {
          return { ...v, isDefault: v.id === variationId };
        }
        return v;
      });
      setVariations(updatedVariations);
    } catch (error) {
      console.error('Error setting default variation:', error);
      alert('Failed to set default variation. Please try again.');
    }
  };

  const handleUpdatePoseName = async (poseId: string, newName: string) => {
    try {
      await poseService.update(poseId, { name: newName });
      setPoses(poses.map(p => p.id === poseId ? { ...p, name: newName } : p));
    } catch (error) {
      console.error('Error updating pose name:', error);
      alert('Failed to update pose name. Please try again.');
    }
  };

  const handleUpdateVariationName = async (variationId: string, newName: string) => {
    try {
      // First, reload the variation from database to get the latest data (including imageUrl)
      const allVariations = await poseVariationService.getAll();
      const currentVariation = allVariations.find(v => v.id === variationId);
      
      if (!currentVariation) {
        console.error('Variation not found:', variationId);
        return;
      }
      
      const updates: Partial<PoseVariation> = { name: newName };
      
      // Always preserve imageUrl from database
      if (currentVariation.imageUrl) {
        updates.imageUrl = currentVariation.imageUrl;
        console.log('Preserving imageUrl from database when updating name:', currentVariation.imageUrl);
      } else {
        console.log('No imageUrl in database for variation:', variationId);
      }
      
      console.log('Updating variation with:', updates);
      const updated = await poseVariationService.update(variationId, updates);
      console.log('Variation name updated, returned data:', updated);
      console.log('Updated variation imageUrl:', updated.imageUrl);
      
      setVariations(prevVariations => 
        prevVariations.map(v => v.id === variationId ? updated : v)
      );
    } catch (error) {
      console.error('Error updating variation name:', error);
      alert('Failed to update variation name. Please try again.');
    }
  };

  const handleUploadVariationImage = async (variationId: string, file: File) => {
    try {
      console.log('Uploading image for variation:', variationId, 'File:', file.name);
      const imageUrl = await poseVariationService.uploadImage(variationId, file);
      console.log('Image uploaded successfully, URL:', imageUrl);
      
      // Reload variations from database to ensure we have the latest data
      try {
        const allVariations = await poseVariationService.getAll();
        const updatedVariation = allVariations.find(v => v.id === variationId);
        if (updatedVariation) {
          console.log('Reloaded variation from database:', updatedVariation);
          setVariations(prevVariations => 
            prevVariations.map(v => v.id === variationId ? updatedVariation : v)
          );
        } else {
          // Fallback to manual update
          setVariations(prevVariations => 
            prevVariations.map(v => v.id === variationId ? { ...v, imageUrl } : v)
          );
        }
      } catch (reloadError) {
        console.error('Error reloading variations, using manual update:', reloadError);
        // Fallback to manual update
        setVariations(prevVariations => 
          prevVariations.map(v => v.id === variationId ? { ...v, imageUrl } : v)
        );
      }
    } catch (error) {
      console.error('Error uploading variation image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to upload image: ${errorMessage}\n\nCheck the browser console for details.`);
      throw error;
    }
  };

  const handleDeleteVariationImage = async (variationId: string, imageUrl: string) => {
    try {
      console.log('Deleting image for variation:', variationId);
      await poseVariationService.deleteImage(variationId, imageUrl);
      console.log('Image deleted successfully');
      setVariations(prevVariations => 
        prevVariations.map(v => v.id === variationId ? { ...v, imageUrl: null } : v)
      );
    } catch (error) {
      console.error('Error deleting variation image:', error);
      alert(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Sequence handlers
  const handleCreateSequence = async (sequence: Omit<Sequence, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    try {
      const newSequence = await sequenceService.create(sequence, user.id);
      setSequences([...sequences, newSequence]);
    } catch (error) {
      console.error('Error creating sequence:', error);
      alert('Failed to create sequence. Please try again.');
    }
  };

  const handleUpdateSequence = async (id: string, updates: Partial<Sequence>) => {
    if (!user) return;
    try {
      const updatedSequence = await sequenceService.update(id, updates, user.id);
      setSequences(sequences.map(s => s.id === id ? updatedSequence : s));
    } catch (error) {
      console.error('Error updating sequence:', error);
      alert('Failed to update sequence. Please try again.');
    }
  };

  const handleDeleteSequence = async (id: string) => {
    if (!user) return;
    try {
      await sequenceService.delete(id, user.id);
      setSequences(sequences.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting sequence:', error);
      alert('Failed to delete sequence. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle />
      <Routes>
        <Route 
          path="/" 
          element={
          !user ? (
            <AuthPage />
          ) : (
            <Navigate to="/sequence-library" replace />
          )
        } 
      />
      <Route
        path="/sequence-builder"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <AppLayout>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <SequenceBuilder
                  sequences={sequences}
                  poses={poses}
                  variations={variations}
                  onCreateSequence={handleCreateSequence}
                  onUpdateSequence={handleUpdateSequence}
                  onDeleteSequence={handleDeleteSequence}
                />
              )}
            </AppLayout>
          )
        }
      />
      <Route
        path="/sequence-library"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <AppLayout>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <SequenceLibrary
                  sequences={sequences}
                  poses={poses}
                  variations={variations}
                />
              )}
            </AppLayout>
          )
        }
      />
      <Route
        path="/sequence-library/:sequenceId"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <AppLayout>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <SequenceView
                  sequences={sequences}
                  poses={poses}
                  variations={variations}
                  onUpdateSequence={handleUpdateSequence}
                />
              )}
            </AppLayout>
          )
        }
      />
      <Route
        path="/pose-library"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <AppLayout>
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : (
                <PoseLibrary
                  poses={poses}
                  variations={variations}
                  onAddPose={handleAddPose}
                  onDeletePose={handleDeletePose}
                  onAddVariation={handleAddVariation}
                  onDeleteVariation={handleDeleteVariation}
                  onSetDefaultVariation={handleSetDefaultVariation}
                  onUpdatePoseName={handleUpdatePoseName}
                  onUpdateVariationName={handleUpdateVariationName}
                  onUpdateVariationCues={async (variationId: string, cues: { cue1?: string | null; cue2?: string | null; cue3?: string | null; breathTransition?: string | null }) => {
                    try {
                      const allVariations = await poseVariationService.getAll();
                      const currentVariation = allVariations.find(v => v.id === variationId);
                      
                      if (!currentVariation) {
                        console.error('Variation not found:', variationId);
                        return;
                      }
                      
                      const updates: Partial<PoseVariation> = {};
                      if (cues.cue1 !== undefined) updates.cue1 = cues.cue1;
                      if (cues.cue2 !== undefined) updates.cue2 = cues.cue2;
                      if (cues.cue3 !== undefined) updates.cue3 = cues.cue3;
                      if (cues.breathTransition !== undefined) updates.breathTransition = cues.breathTransition;
                      
                      // Preserve other fields
                      updates.name = currentVariation.name;
                      updates.isDefault = currentVariation.isDefault;
                      if (currentVariation.imageUrl) {
                        updates.imageUrl = currentVariation.imageUrl;
                      }
                      
                      const updated = await poseVariationService.update(variationId, updates);
                      setVariations(prevVariations => 
                        prevVariations.map(v => v.id === variationId ? updated : v)
                      );
                    } catch (error) {
                      console.error('Error updating variation cues:', error);
                      alert('Failed to update variation cues. Please try again.');
                    }
                  }}
                  onUploadVariationImage={handleUploadVariationImage}
                  onDeleteVariationImage={handleDeleteVariationImage}
                />
              )}
            </AppLayout>
          )
        }
      />
      <Route
        path="/profile"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <ProfileRoute signOut={signOut} userEmail={user?.email || ''} userId={user.id} />
          )
        }
      />
      <Route
        path="/admin"
        element={
          !user ? (
            <Navigate to="/" replace />
          ) : (
            <AppLayout>
              <AdminPage />
            </AppLayout>
          )
        }
      />
      <Route
        path="/profile/:shareId"
        element={<PublicProfileRoute />}
      />
      <Route
        path="/sequence/:id"
        element={<PublicSequenceRoute />}
      />
      </Routes>
    </>
  );
}
