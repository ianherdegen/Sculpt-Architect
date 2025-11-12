import React from 'react';
import { Sequence, Pose, PoseVariation } from '../types';
import { Clock } from 'lucide-react';
import { calculateSequenceDuration, formatDuration } from '../lib/timeUtils';
import { useIsMobile } from './ui/use-mobile';
import { Card } from './ui/card';
import { useNavigate } from 'react-router-dom';

interface SequenceLibraryProps {
  sequences: Sequence[];
  poses: Pose[];
  variations: PoseVariation[];
}

export function SequenceLibrary({ sequences, poses, variations }: SequenceLibraryProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

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
        {sequences.map(sequence => {
          const totalDuration = calculateSequenceDuration(sequence);
          const sectionCount = sequence.sections.length;
          
          return (
            <Card 
              key={sequence.id} 
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
              onClick={() => navigate(`/sequence-library/${sequence.id}`)}
            >
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
          );
        })}
      </div>
    </div>
  );
}
