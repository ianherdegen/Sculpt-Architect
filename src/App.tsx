import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { PoseLibrary } from './components/PoseLibrary';
import { SequenceBuilder } from './components/SequenceBuilder';
import { SequenceLibrary } from './components/SequenceLibrary';
import { Pose, PoseVariation, Sequence, PoseInstance, GroupBlock } from './types';
import { poseService, poseVariationService, sequenceService } from './lib/supabaseService';
import { Dumbbell, ListOrdered, BookOpen } from 'lucide-react';
import { useIsMobile } from './components/ui/use-mobile';

export default function App() {
  const [poses, setPoses] = useState<Pose[]>([]);
  const [variations, setVariations] = useState<PoseVariation[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  // Load data from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [posesData, variationsData, sequencesData] = await Promise.all([
          poseService.getAll(),
          poseVariationService.getAll(),
          sequenceService.getAll()
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
  }, []);

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
        pose_id: newPose.id
      });
      
      setPoses([...poses, newPose]);
      setVariations([...variations, newVariation]);
    } catch (error) {
      console.error('Error adding pose:', error);
      alert('Failed to add pose. Please try again.');
    }
  };

  const handleDeletePose = async (poseId: string) => {
    // Check if pose is used in any sequence
    const sequencesUsingPose = findSequencesUsingPose(poseId);
    if (sequencesUsingPose.length > 0) {
      alert(`Cannot delete pose. It is currently used in the following sequence(s): ${sequencesUsingPose.join(', ')}`);
      return;
    }

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

    // Check if variation is used in any sequence
    const sequencesUsingVariation = findSequencesUsingVariation(variationId);
    if (sequencesUsingVariation.length > 0) {
      alert(`Cannot delete variation. It is currently used in the following sequence(s): ${sequencesUsingVariation.join(', ')}`);
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
  const handleCreateSequence = async (sequence: Omit<Sequence, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newSequence = await sequenceService.create(sequence);
      setSequences([...sequences, newSequence]);
    } catch (error) {
      console.error('Error creating sequence:', error);
      alert('Failed to create sequence. Please try again.');
    }
  };

  const handleUpdateSequence = async (id: string, updates: Partial<Sequence>) => {
    try {
      const updatedSequence = await sequenceService.update(id, updates);
      setSequences(sequences.map(s => s.id === id ? updatedSequence : s));
    } catch (error) {
      console.error('Error updating sequence:', error);
      alert('Failed to update sequence. Please try again.');
    }
  };

  const handleDeleteSequence = async (id: string) => {
    try {
      await sequenceService.delete(id);
      setSequences(sequences.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting sequence:', error);
      alert('Failed to delete sequence. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={`${isMobile ? 'px-4' : 'container mx-auto max-w-4xl px-6'}`}>
        <div className={`${isMobile ? 'py-4' : 'py-6'}`}>
          <h1 className={`text-center ${isMobile ? 'mb-4 text-xl font-semibold' : 'mb-6 text-2xl font-semibold'}`}>Yoga Sequence Builder</h1>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <Tabs defaultValue="library" className="w-full">
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 h-10' : 'grid-cols-3'}`}>
              <TabsTrigger value="library" className={isMobile ? 'text-xs px-2' : ''}>
                <Dumbbell className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                {isMobile ? 'Poses' : 'Pose Library'}
              </TabsTrigger>
              <TabsTrigger value="builder" className={isMobile ? 'text-xs px-2' : ''}>
                <ListOrdered className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                {isMobile ? 'Builder' : 'Sequence Builder'}
              </TabsTrigger>
              <TabsTrigger value="sequences" className={isMobile ? 'text-xs px-2' : ''}>
                <BookOpen className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                {isMobile ? 'Sequences' : 'Sequence Library'}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="library" className="mt-0">
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
            </TabsContent>
            
            <TabsContent value="builder" className="mt-0">
              <SequenceBuilder
                sequences={sequences}
                poses={poses}
                variations={variations}
                onCreateSequence={handleCreateSequence}
                onUpdateSequence={handleUpdateSequence}
                onDeleteSequence={handleDeleteSequence}
              />
            </TabsContent>

            <TabsContent value="sequences" className="mt-0">
              <SequenceLibrary
                sequences={sequences}
                poses={poses}
                variations={variations}
              />
            </TabsContent>
          </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
