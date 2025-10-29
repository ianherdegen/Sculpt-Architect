import { PoseInstance, GroupBlock, Section, Sequence } from '../types';

/**
 * Parse a duration string in format "HH:MM:SS" or "MM:SS" to total seconds
 */
export function parseDuration(duration: string): number {
  const parts = duration.split(':').map(p => parseInt(p, 10));
  
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
}

/**
 * Format total seconds to "HH:MM:SS" or "MM:SS" format
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Calculate duration for a list of items
 */
function calculateItemsDuration(items: Array<{ type: string; duration?: string } | GroupBlock>): number {
  return items.reduce((total, item) => {
    if (item.type === 'pose_instance') {
      return total + parseDuration((item as any).duration);
    } else if (item.type === 'group_block') {
      return total + calculateGroupBlockDuration(item as GroupBlock);
    }
    return total;
  }, 0);
}

/**
 * Get the effective items for a specific round, taking into account item substitutions
 */
function getEffectiveItemsForRound(groupBlock: GroupBlock, round: number): Array<PoseInstance | GroupBlock> {
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
}

/**
 * Calculate total duration for items in a group block
 * Takes into account sets, item substitutions, and round overrides
 */
export function calculateGroupBlockDuration(groupBlock: GroupBlock): number {
  const roundOverrides = groupBlock.roundOverrides || [];
  
  let totalDuration = 0;
  
  // Calculate duration for each round
  for (let round = 1; round <= groupBlock.sets; round++) {
    // Get effective items for this round (with substitutions applied)
    const effectiveItems = getEffectiveItemsForRound(groupBlock, round);
    totalDuration += calculateItemsDuration(effectiveItems);
    
    // Add round override items if present (always appended)
    const override = roundOverrides.find(o => o.round === round);
    if (override) {
      const overrideDuration = calculateItemsDuration(override.items);
      totalDuration += overrideDuration * (override.sets || 1);
    }
  }
  
  return totalDuration;
}

/**
 * Calculate total duration for all items in a section
 */
export function calculateSectionDuration(section: Section): number {
  return section.items.reduce((total, item) => {
    if (item.type === 'pose_instance') {
      return total + parseDuration(item.duration);
    } else {
      return total + calculateGroupBlockDuration(item);
    }
  }, 0);
}

/**
 * Calculate total duration for an entire sequence
 */
export function calculateSequenceDuration(sequence: Sequence): number {
  return sequence.sections.reduce((total, section) => {
    return total + calculateSectionDuration(section);
  }, 0);
}
