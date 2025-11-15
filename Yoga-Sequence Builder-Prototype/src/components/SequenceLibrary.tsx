import { Sequence, Pose, PoseVariation, GroupBlock, PoseInstance } from '../types';
import { Clock } from 'lucide-react';
import { calculateSequenceDuration, formatDuration, calculateGroupBlockDuration, calculateSectionDuration } from '../lib/timeUtils';

interface SequenceLibraryProps {
  sequences: Sequence[];
  poses: Pose[];
  variations: PoseVariation[];
}

export function SequenceLibrary({ sequences, poses, variations }: SequenceLibraryProps) {
  const getPoseInfo = (variationId: string) => {
    const variation = variations.find(v => v.id === variationId);
    const pose = variation ? poses.find(p => p.id === variation.poseId) : null;
    return { pose, variation };
  };

  const renderPoseInstance = (poseInstance: PoseInstance, indent: number = 0) => {
    const { pose, variation } = getPoseInfo(poseInstance.poseVariationId);
    
    return (
      <div key={poseInstance.id} className="flex items-baseline justify-between gap-2 py-1" style={{ paddingLeft: `${indent * 12}px` }}>
        <div className="flex-1 min-w-0">
          <span className="text-sm">{pose?.name || 'Unknown'}</span>
          {variation && !variation.name.includes('(Default)') && (
            <span className="text-xs text-muted-foreground ml-2">({variation.name})</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {poseInstance.duration}
        </span>
      </div>
    );
  };

  const renderGroupBlock = (groupBlock: GroupBlock, indent: number = 0) => {
    return (
      <div key={groupBlock.id} className="my-2">
        <div className="flex items-baseline justify-between gap-2 py-1" style={{ paddingLeft: `${indent * 12}px` }}>
          <div className="flex-1">
            <span className="text-sm">
              <span className="text-muted-foreground">Group:</span> {groupBlock.sets} sets
            </span>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(calculateGroupBlockDuration(groupBlock, variations))}
          </span>
        </div>
        
        {/* Base Items */}
        {groupBlock.items.map((item, idx) => {
          if (item.type === 'pose_instance') {
            return <div key={`${item.id}-${idx}`}>{renderPoseInstance(item, indent + 1)}</div>;
          } else {
            return <div key={`${item.id}-${idx}`}>{renderGroupBlock(item, indent + 1)}</div>;
          }
        })}

        {/* Round Overrides */}
        {groupBlock.roundOverrides && groupBlock.roundOverrides.length > 0 && groupBlock.roundOverrides.map((override) => (
          <div key={override.round} className="mt-1" style={{ paddingLeft: `${(indent + 1) * 12}px` }}>
            <div className="text-xs text-muted-foreground mb-0.5">
              Round {override.round} additions:
            </div>
            {override.items.map((item, idx) => {
              if (item.type === 'pose_instance') {
                return <div key={`${item.id}-${idx}`}>{renderPoseInstance(item, indent + 2)}</div>;
              } else {
                return <div key={`${item.id}-${idx}`}>{renderGroupBlock(item, indent + 2)}</div>;
              }
            })}
          </div>
        ))}
      </div>
    );
  };

  if (sequences.length === 0) {
    return (
      <div className="p-4">
        <h2 className="mb-4">Sequence Library</h2>
        <div className="text-center py-12 text-muted-foreground">
          <p>No sequences yet. Create your first sequence to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h2>Sequence Library</h2>
      
      {sequences.map(sequence => (
        <div key={sequence.id} className="border rounded-lg p-4 space-y-3">
          {/* Sequence Header */}
          <div className="border-b pb-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3>{sequence.name}</h3>
              <span className="text-sm text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(calculateSequenceDuration(sequence))}
              </span>
            </div>
          </div>

          {/* Sections */}
          {sequence.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No sections</p>
          ) : (
            sequence.sections.map(section => (
              <div key={section.id} className="space-y-1">
                {/* Section Header */}
                <div className="flex items-baseline justify-between gap-2 pt-2">
                  <h4 className="text-sm">{section.name}</h4>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(calculateSectionDuration(section))}
                  </span>
                </div>

                {/* Section Items */}
                {section.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-3">Empty section</p>
                ) : (
                  <div className="pl-3">
                    {section.items.map((item, idx) => {
                      if (item.type === 'pose_instance') {
                        return <div key={`${item.id}-${idx}`}>{renderPoseInstance(item, 0)}</div>;
                      } else {
                        return <div key={`${item.id}-${idx}`}>{renderGroupBlock(item, 0)}</div>;
                      }
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
