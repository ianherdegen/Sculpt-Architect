import React, { useState } from 'react';
import { Sequence, Pose, PoseVariation } from '../types';
import { Clock, GripVertical } from 'lucide-react';
import { calculateSequenceDuration, formatDuration } from '../lib/timeUtils';
import { useIsMobile } from './ui/use-mobile';
import { Card } from './ui/card';
import { useNavigate } from 'react-router-dom';

interface SequenceLibraryProps {
  sequences: Sequence[];
  poses: Pose[];
  variations: PoseVariation[];
  onReorderSequences?: (sequenceIds: string[]) => void;
}

export function SequenceLibrary({ sequences, poses, variations, onReorderSequences }: SequenceLibraryProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [draggedSequenceIndex, setDraggedSequenceIndex] = useState<number | null>(null);
  const [dragOverSequenceIndex, setDragOverSequenceIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedSequenceIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSequenceIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverSequenceIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedSequenceIndex === null || !onReorderSequences || draggedSequenceIndex === targetIndex) {
      setDraggedSequenceIndex(null);
      setDragOverSequenceIndex(null);
      return;
    }

    const reorderedSequences = [...sequences];
    const [removed] = reorderedSequences.splice(draggedSequenceIndex, 1);
    reorderedSequences.splice(targetIndex, 0, removed);

    const sequenceIds = reorderedSequences.map(s => s.id);
    await onReorderSequences(sequenceIds);
    
    setDraggedSequenceIndex(null);
    setDragOverSequenceIndex(null);
  };

  if (sequences.length === 0) {
    return (
      <div className={`${isMobile ? 'p-0' : 'p-4'}`}>
        <h2 className={`mb-4 ${isMobile ? 'text-lg font-semibold' : 'text-xl font-semibold'}`}>Sequence Library</h2>
        <div className="text-center py-12 text-muted-foreground">
          <p>No sequences yet. Create your first sequence to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-0' : 'p-4'} space-y-6`}>
      <h2 className={`${isMobile ? 'text-lg font-semibold' : 'text-xl font-semibold'}`}>Sequence Library</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sequences.map((sequence, index) => {
          const totalDuration = calculateSequenceDuration(sequence);
          const sectionCount = sequence.sections.length;
          const showIndicatorAbove = dragOverSequenceIndex === index && draggedSequenceIndex !== null && draggedSequenceIndex > index;
          const showIndicatorBelow = dragOverSequenceIndex === index && draggedSequenceIndex !== null && draggedSequenceIndex < index;
          
          return (
            <div key={sequence.id}>
              {showIndicatorAbove && (
                <div className="h-1 bg-primary rounded mb-3" />
              )}
              <div
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`${draggedSequenceIndex === index ? 'opacity-50' : ''} transition-opacity`}
              >
                <Card 
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow flex flex-col relative"
                  onClick={() => navigate(`/sequence-library/${sequence.id}`)}
                >
                  {onReorderSequences && !isMobile && (
                    <div 
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      className="absolute top-2 right-2 cursor-move text-muted-foreground hover:text-foreground z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-5 w-5" />
                    </div>
                  )}
                  <div className="flex-1">
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
                  </div>
                </Card>
              </div>
              {showIndicatorBelow && (
                <div className="h-1 bg-primary rounded mt-3" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
