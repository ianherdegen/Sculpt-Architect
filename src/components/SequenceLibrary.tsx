import React from 'react';
import { Sequence, Pose, PoseVariation, GroupBlock, PoseInstance } from '../types';
import { Clock } from 'lucide-react';
import { calculateSequenceDuration, formatDuration, calculateGroupBlockDuration, calculateSectionDuration } from '../lib/timeUtils';
import { useIsMobile } from './ui/use-mobile';

interface SequenceLibraryProps {
  sequences: Sequence[];
  poses: Pose[];
  variations: PoseVariation[];
}

export function SequenceLibrary({ sequences, poses, variations }: SequenceLibraryProps) {
  const isMobile = useIsMobile();
  
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

  // Helper function to get effective items for a specific round
  const getEffectiveItemsForRound = (groupBlock: GroupBlock, round: number): Array<PoseInstance | GroupBlock> => {
    const itemSubstitutes = groupBlock.itemSubstitutes || [];
    const roundSubstitutes = itemSubstitutes.filter(s => s.round === round);
    
    // Start with base items
    const effectiveItems = [...groupBlock.items];
    
    // Apply substitutions for this round
    roundSubstitutes.forEach(substitute => {
      if (substitute.itemIndex >= 0 && substitute.itemIndex < effectiveItems.length) {
        effectiveItems[substitute.itemIndex] = substitute.substituteItem;
      }
    });
    
    return effectiveItems;
  };

  const renderGroupBlock = (groupBlock: GroupBlock, indent: number = 0) => {
    const itemSubstitutes = groupBlock.itemSubstitutes || [];
    const roundOverrides = groupBlock.roundOverrides || [];
    
    return (
      <div key={groupBlock.id} className="my-2">
        <div className="flex items-baseline justify-between gap-2 py-1" style={{ paddingLeft: `${indent * 12}px` }}>
          <div className="flex-1">
            <span className="text-sm">
              <span className="text-muted-foreground">Group:</span> {groupBlock.sets} sets
            </span>
          </div>
          <span className="text-sm text-black dark:text-white whitespace-nowrap flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(calculateGroupBlockDuration(groupBlock))}
          </span>
        </div>
        
        {/* Base items with inline substitutions */}
        <div style={{ paddingLeft: `${(indent + 1) * 12}px` }}>
          {groupBlock.items.map((item, idx) => {
            const substitutionsForThisItem = itemSubstitutes.filter(s => s.itemIndex === idx);
            
            return (
              <div key={`${item.id}-${idx}`} className="my-1">
                {/* Base item */}
                {item.type === 'pose_instance' ? (
                  <div>{renderPoseInstance(item, indent + 1)}</div>
                ) : (
                  <div>{renderGroupBlock(item, indent + 1)}</div>
                )}
                
                {/* Inline substitutions for this item */}
                {substitutionsForThisItem.length > 0 && (
                  <div className="ml-4">
                    {substitutionsForThisItem.map((substitute) => {
                  if (substitute.substituteItem.type === 'pose_instance') {
                    const poseInstance = substitute.substituteItem;
                    const variation = poseInstance.poseVariationId ? variations.find(v => v.id === poseInstance.poseVariationId) : null;
                    const pose = variation ? poses.find(p => p.id === variation.poseId) : null;
                    const displayName = variation ? `${pose?.name || 'Unknown'} (${variation.name})` : 'Unknown';
                    
                    return (
                      <div key={`${substitute.round}-${substitute.itemIndex}`} className="ml-8 flex items-baseline justify-between gap-2 py-1">
                        <span className="text-xs text-orange-600 dark:text-orange-400">
                          Round {substitute.round}: {displayName}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {poseInstance.duration}
                        </span>
                      </div>
                    );
                  } else {
                    const groupBlock = substitute.substituteItem;
                    const duration = formatDuration(calculateGroupBlockDuration(groupBlock));
                    
                    return (
                      <div key={`${substitute.round}-${substitute.itemIndex}`} className="ml-8 flex items-baseline justify-between gap-2 py-1">
                        <span className="text-xs text-orange-600 dark:text-orange-400">
                          Round {substitute.round}: Group Block
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {duration}
                        </span>
                      </div>
                    );
                  }
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Round overrides */}
        {roundOverrides.map((override) => (
          <div key={override.round} className="mt-2" style={{ paddingLeft: `${(indent + 1) * 12}px` }}>
            <div className="text-xs text-muted-foreground mb-1">
              Round {override.round} Ending{override.sets && override.sets > 1 ? ` (${override.sets} sets)` : ''}:
            </div>
            {override.items.map((item, idx) => {
              if (item.type === 'pose_instance') {
                return <div key={`${item.id}-${idx}`} className="ml-2">{renderPoseInstance(item, indent + 2)}</div>;
              } else {
                return <div key={`${item.id}-${idx}`} className="ml-2">{renderGroupBlock(item, indent + 2)}</div>;
              }
            })}
          </div>
        ))}
      </div>
    );
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
      
      {sequences.map(sequence => (
        <div key={sequence.id} className="border rounded-lg p-4 space-y-3">
          {/* Sequence Header */}
          <div className="border-b pb-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-black dark:text-white"><strong>{sequence.name}</strong></h3>
              <span className="text-sm text-black dark:text-white whitespace-nowrap flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <strong>{formatDuration(calculateSequenceDuration(sequence))}</strong>
              </span>
            </div>
          </div>

          {/* Sections */}
          {sequence.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No sections</p>
          ) : (
            sequence.sections.map((section, sectionIndex) => (
              <div key={section.id} className="space-y-1">
                {/* Section Divider */}
                {sectionIndex > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                )}
                
                {/* Section Header */}
                <div className="flex items-baseline justify-between gap-2 pt-2">
                  <h4 className="text-sm"><strong>{section.name}</strong></h4>
          <span className="text-sm text-black dark:text-white whitespace-nowrap flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <strong>{formatDuration(calculateSectionDuration(section))}</strong>
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
