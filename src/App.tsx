import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { PoseLibrary } from './components/PoseLibrary';
import { SequenceBuilder } from './components/SequenceBuilder';
import { SequenceLibrary } from './components/SequenceLibrary';
import { Pose, PoseVariation, Sequence, PoseInstance, GroupBlock } from './types';
import { initialPoses, initialVariations, initialSequences } from './lib/mockData';
import { Dumbbell, ListOrdered, BookOpen } from 'lucide-react';

export default function App() {
  const [poses, setPoses] = useState<Pose[]>(initialPoses);
  const [variations, setVariations] = useState<PoseVariation[]>(initialVariations);
  const [sequences, setSequences] = useState<Sequence[]>(initialSequences);

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

  const handleAddPose = (pose: Pose, defaultVariation: PoseVariation) => {
    setPoses([...poses, pose]);
    setVariations([...variations, defaultVariation]);
  };

  const handleDeletePose = (poseId: string) => {
    // Check if pose is used in any sequence
    const sequencesUsingPose = findSequencesUsingPose(poseId);
    if (sequencesUsingPose.length > 0) {
      alert(`Cannot delete pose. It is currently used in the following sequence(s): ${sequencesUsingPose.join(', ')}`);
      return;
    }

    // Check if pose has any variations
    const poseVariations = variations.filter(v => v.poseId === poseId);
    if (poseVariations.length > 0) {
      alert('Cannot delete pose with variations. Delete all variations first.');
      return;
    }
    setPoses(poses.filter(p => p.id !== poseId));
  };

  const handleAddVariation = (variation: PoseVariation) => {
    setVariations([...variations, variation]);
  };

  const handleDeleteVariation = (variationId: string) => {
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

    // If deleting default variation and there are others, set a new default
    if (variation.isDefault && poseVariations.length > 1) {
      const updatedVariations = variations.filter(v => v.id !== variationId);
      const otherVariation = updatedVariations.find(v => v.poseId === variation.poseId);
      if (otherVariation) {
        otherVariation.isDefault = true;
      }
      setVariations(updatedVariations);
    } else {
      setVariations(variations.filter(v => v.id !== variationId));
    }
  };

  const handleSetDefaultVariation = (poseId: string, variationId: string) => {
    const updatedVariations = variations.map(v => {
      if (v.poseId === poseId) {
        return { ...v, isDefault: v.id === variationId };
      }
      return v;
    });
    setVariations(updatedVariations);
  };

  const handleUpdatePoseName = (poseId: string, newName: string) => {
    setPoses(poses.map(p => p.id === poseId ? { ...p, name: newName } : p));
  };

  const handleUpdateVariationName = (variationId: string, newName: string) => {
    setVariations(variations.map(v => v.id === variationId ? { ...v, name: newName } : v));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto">
        <div className="py-6">
          <h1 className="text-center mb-6">Yoga Sequence Builder</h1>
          
          <Tabs defaultValue="library" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="library">
                <Dumbbell className="h-4 w-4 mr-2" />
                Pose Library
              </TabsTrigger>
              <TabsTrigger value="builder">
                <ListOrdered className="h-4 w-4 mr-2" />
                Sequence Builder
              </TabsTrigger>
              <TabsTrigger value="sequences">
                <BookOpen className="h-4 w-4 mr-2" />
                Sequence Library
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
                onUpdateSequences={setSequences}
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
        </div>
      </div>
    </div>
  );
}
