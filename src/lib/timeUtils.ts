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
 * Calculate total duration for items in a group block
 * Takes into account sets and round overrides
 */
export function calculateGroupBlockDuration(groupBlock: GroupBlock): number {
  // Calculate base items duration for one round
  const baseItemsDuration = groupBlock.items.reduce((total, item) => {
    if (item.type === 'pose_instance') {
      return total + parseDuration(item.duration);
    } else {
      // Nested group block
      return total + calculateGroupBlockDuration(item);
    }
  }, 0);
  
  // Start with base duration multiplied by number of sets
  let totalDuration = baseItemsDuration * groupBlock.sets;
  
  // Add round override durations
  groupBlock.roundOverrides.forEach(override => {
    const overrideDuration = override.items.reduce((total, item) => {
      if (item.type === 'pose_instance') {
        return total + parseDuration(item.duration);
      } else {
        return total + calculateGroupBlockDuration(item);
      }
    }, 0);
    totalDuration += overrideDuration;
  });
  
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
