import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import { PoseLibrary } from './components/PoseLibrary';
import { SequenceBuilder } from './components/SequenceBuilder';
import { SequenceLibrary } from './components/SequenceLibrary';
import { AuthPage } from './components/AuthPage';
import { Profile } from './components/Profile';
import { PublicProfile } from './components/PublicProfile';
import { Pose, PoseVariation, Sequence, PoseInstance, GroupBlock } from './types';
import { poseService, poseVariationService, sequenceService } from './lib/supabaseService';
import { useAuth } from './lib/auth';
import { Dumbbell, ListOrdered, BookOpen, User, Home } from 'lucide-react';
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
    document.title = title;
    
    // Update or create Open Graph title meta tag
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', title);
    
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
    if (location.pathname === '/sequence-library') return 'sequences';
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

  return (
    <div className="min-h-screen bg-background">
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
      <div className="container max-w-2xl mx-auto">
        <div className={`${isSmallScreen ? 'py-4 px-4' : 'py-6'}`}>
          {/* Navigation */}
          {!isProfilePage && (
            <NavTabs location={location} isSmallScreen={isSmallScreen} />
          )}
          {children}
        </div>
      </div>
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

  const handleAddVariation = async (variation: Omit<PoseVariation, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newVariation = await poseVariationService.create(variation);
      setVariations([...variations, newVariation]);
    } catch (error) {
      console.error('Error adding variation:', error);
      alert('Failed to add variation. Please try again.');
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
      await poseVariationService.update(variationId, { name: newName });
      setVariations(variations.map(v => v.id === variationId ? { ...v, name: newName } : v));
    } catch (error) {
      console.error('Error updating variation name:', error);
      alert('Failed to update variation name. Please try again.');
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
        path="/profile/:shareId"
        element={<PublicProfileRoute />}
      />
      </Routes>
    </>
  );
}
