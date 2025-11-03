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

/**
 * Count the number of individual unlocked exercises in a section
 * This counts each pose instance as a separate exercise, accounting for sets and round overrides
 */
function countUnlockedExercises(section: Section): number {
  let count = 0;
  
  for (const item of section.items) {
    if (item.type === 'pose_instance') {
      // Skip locked pose instances
      if (item.locked) {
        continue;
      }
      // Each pose instance counts as 1 exercise
      count += 1;
    } else if (item.type === 'group_block') {
      const groupBlock = item;
      // Always count exercises in group blocks (groups themselves can't be locked)
      for (let round = 1; round <= groupBlock.sets; round++) {
        const effectiveItems = getEffectiveItemsForRound(groupBlock, round);
        // Count each item in this round (only if not locked)
        for (const effectiveItem of effectiveItems) {
          if (effectiveItem.type === 'pose_instance' && !effectiveItem.locked) {
            count += 1;
          }
          // Nested group blocks aren't fully supported yet, skip for now
        }
        
        // Count round override items (only if not locked)
        const override = groupBlock.roundOverrides.find(o => o.round === round);
        if (override) {
          for (const overrideItem of override.items) {
            if (overrideItem.type === 'pose_instance' && !overrideItem.locked) {
              count += (override.sets || 1);
            }
          }
        }
      }
    }
  }
  
  return count;
}

/**
 * Calculate total duration of locked items in a section
 * This includes locked items at the section level and locked items within group blocks
 * For group blocks: locked items are counted once per set/round
 * For round overrides: locked items are multiplied by override.sets
 */
function calculateLockedDuration(section: Section): number {
  let total = 0;
  
  for (const item of section.items) {
    if (item.type === 'pose_instance') {
      // Only pose instances can be locked
      if (item.locked) {
        total += parseDuration(item.duration);
      }
    } else if (item.type === 'group_block') {
      // Groups themselves can't be locked, but check for locked items within
      const groupBlock = item;
      // Each round/set counts separately, so locked items appear once per round
      for (let round = 1; round <= groupBlock.sets; round++) {
        const effectiveItems = getEffectiveItemsForRound(groupBlock, round);
        // Count locked items in base items (each round counts separately)
        for (const effectiveItem of effectiveItems) {
          if (effectiveItem.type === 'pose_instance' && effectiveItem.locked) {
            // Count once per round (since we're iterating through rounds)
            total += parseDuration(effectiveItem.duration);
          }
        }
        
        // Check round override items - these are multiplied by override.sets
        const override = groupBlock.roundOverrides.find(o => o.round === round);
        if (override) {
          const overrideSets = override.sets || 1;
          for (const overrideItem of override.items) {
            if (overrideItem.type === 'pose_instance' && overrideItem.locked) {
              // Round override items are repeated 'overrideSets' times
              // So if an item has 10 seconds and overrideSets=4, that's 40 seconds total
              total += parseDuration(overrideItem.duration) * overrideSets;
            }
          }
        }
      }
    }
  }
  
  return total;
}

/**
 * Apply autofit time to a section, distributing time evenly among unlocked exercises
 * 1. Discount locked items (with all multipliers: group sets × round override sets if in both)
 * 2. Extra time = target - locked time
 * 3. Distribute extra time evenly among unlocked exercises
 * 4. If perfect, great. If over, make it under. If under, add bit by bit to items in order
 * Returns { section, warning } where warning is a string if exact allocation isn't possible
 */
export function autofitSectionTime(section: Section, targetTotalSeconds: number): { section: Section; warning?: string } {
  // Step 1: Calculate locked duration with all multipliers
  const lockedDuration = calculateLockedDuration(section);
  
  // Step 2: Calculate extra time (remaining time to distribute)
  const extraTime = targetTotalSeconds - lockedDuration;
  
  if (extraTime <= 0) {
    return { 
      section, 
      warning: `Cannot autofit: locked items use ${formatDuration(lockedDuration)}, which exceeds or equals target of ${formatDuration(targetTotalSeconds)}.` 
    };
  }
  
  // Step 3: Count unlocked exercises
  const unlockedExerciseCount = countUnlockedExercises(section);
  
  if (unlockedExerciseCount === 0) {
    return { section };
  }
  
  // Step 4: Distribute extra time evenly (use floor to go under if needed)
  const baseTimePerExercise = Math.floor(extraTime / unlockedExerciseCount);
  const remainderSeconds = extraTime % unlockedExerciseCount;
  
  // Step 5: Apply times to unlocked items in order
  // Track which exercise we're on
  let exerciseIndex = 0;
  
  // Helper to get next time (base + 1 if we're in the first remainderSeconds exercises)
  const getNextTime = (): number => {
    const time = baseTimePerExercise + (exerciseIndex < remainderSeconds ? 1 : 0);
    exerciseIndex++;
    return time;
  };
  
  // Helper to apply time to a pose instance
  const applyTimeToPoseInstance = (poseInstance: PoseInstance): PoseInstance => {
    if (poseInstance.locked) {
      return poseInstance;
    }
    return {
      ...poseInstance,
      duration: formatDuration(getNextTime()),
    };
  };
  
  // Apply autofit to section items
  const updatedItems = section.items.map(item => {
    if (item.type === 'pose_instance') {
      return applyTimeToPoseInstance(item);
    } 
    
    if (item.type === 'group_block') {
      const groupBlock = item;
      
      // Process base items
      // Base items appear in each round, so collect allocations for all rounds
      // Use average (rounded) to get closest to total allocated
      const updatedBaseItems = groupBlock.items.map(subItem => {
        if (subItem.type === 'pose_instance') {
          if (subItem.locked) {
            return subItem;
          }
          // Collect all allocations for this item across all rounds
          let totalAllocated = 0;
          for (let round = 0; round < groupBlock.sets; round++) {
            totalAllocated += getNextTime();
          }
          // Use average (rounded) - this minimizes error when multiplied by sets
          const averageTime = Math.round(totalAllocated / groupBlock.sets);
          return {
            ...subItem,
            duration: formatDuration(averageTime),
          };
        }
        return subItem;
      });
      
      // Process round overrides
      const updatedRoundOverrides = groupBlock.roundOverrides.map(override => {
        const overrideSets = override.sets || 1;
        
        // For round override items, collect allocations for all sets
        // then distribute flexibly across items
        const unlockedItems = override.items.filter(item => 
          item.type === 'pose_instance' && !item.locked
        ) as PoseInstance[];
        
        if (unlockedItems.length === 0) {
          return override;
        }
        
        // Collect total allocated time for all sets of all items
        let totalAllocated = 0;
        for (let i = 0; i < unlockedItems.length; i++) {
          for (let s = 0; s < overrideSets; s++) {
            totalAllocated += getNextTime();
          }
        }
        
        // Distribute totalAllocated across items flexibly
        // Total = sum(itemDuration × overrideSets for each item)
        // So sum(itemDuration) = totalAllocated / overrideSets
        const targetSumOfDurations = totalAllocated / overrideSets;
        const baseDuration = Math.floor(targetSumOfDurations / unlockedItems.length);
        const remainderForItems = Math.floor(targetSumOfDurations - (baseDuration * unlockedItems.length));
        
        // Apply durations to items
        let itemIndex = 0;
        const updatedOverrideItems = override.items.map(overrideItem => {
          if (overrideItem.type === 'pose_instance') {
            if (overrideItem.locked) {
              return overrideItem;
            }
            // Give baseDuration to all, +1 to first remainderForItems
            const duration = baseDuration + (itemIndex < remainderForItems ? 1 : 0);
            itemIndex++;
            return {
              ...overrideItem,
              duration: formatDuration(duration),
            };
          }
          return overrideItem;
        });
        
        return {
          ...override,
          items: updatedOverrideItems,
        };
      });
      
      // Process item substitutes
      const updatedItemSubstitutes = groupBlock.itemSubstitutes?.map(substitute => ({
        ...substitute,
        substituteItem: substitute.substituteItem.type === 'pose_instance'
          ? applyTimeToPoseInstance(substitute.substituteItem)
          : substitute.substituteItem,
      }));
      
      return {
        ...groupBlock,
        items: updatedBaseItems,
        roundOverrides: updatedRoundOverrides,
        itemSubstitutes: updatedItemSubstitutes,
      };
    }
    
    return item;
  });
  
  let updatedSection: Section = {
    ...section,
    items: updatedItems,
  };
  
  // Verify the result and try to fix small differences
  let actualTotal = calculateSectionDuration(updatedSection);
  let difference = targetTotalSeconds - actualTotal;
  
  // Try to adjust if we're off by a small amount (up to a few seconds)
  if (Math.abs(difference) > 0 && Math.abs(difference) <= 5) {
    // Try to add/subtract seconds from appropriate items
    if (difference > 0) {
      // We're under - try to add seconds
      updatedSection = tryAddSeconds(updatedSection, difference);
      actualTotal = calculateSectionDuration(updatedSection);
      difference = targetTotalSeconds - actualTotal;
    } else {
      // We're over - try to subtract seconds
      updatedSection = trySubtractSeconds(updatedSection, Math.abs(difference));
      actualTotal = calculateSectionDuration(updatedSection);
      difference = targetTotalSeconds - actualTotal;
    }
  }
  
  let warning: string | undefined;
  if (Math.abs(difference) > 0) {
    warning = `Autofit completed but total time is ${formatDuration(actualTotal)} instead of ${formatDuration(targetTotalSeconds)} (difference: ${difference > 0 ? '+' : ''}${difference} seconds).`;
  }
  
  return { section: updatedSection, warning };
}

/**
 * Try to add seconds to unlocked items, prioritizing items that don't multiply
 * (e.g., round override items with 1 set, or regular pose instances)
 * Accounts for multipliers: group sets and round override sets
 */
function tryAddSeconds(section: Section, secondsToAdd: number): Section {
  if (secondsToAdd <= 0) return section;
  
  // Find candidates with their multipliers
  // multiplier = how much total time changes when we add 1 second to the item
  const candidates: Array<{ 
    item: PoseInstance; 
    path: string; 
    multiplier: number;
    priority: number; // Lower is better
    currentDuration: number;
  }> = [];
  
  // Regular pose instances (multiplier = 1, priority = 1)
  section.items.forEach((item, idx) => {
    if (item.type === 'pose_instance' && !item.locked) {
      candidates.push({ 
        item, 
        path: `items[${idx}]`, 
        multiplier: 1,
        priority: 1,
        currentDuration: parseDuration(item.duration)
      });
    } else if (item.type === 'group_block') {
      const groupBlock = item;
      const groupSets = groupBlock.sets;
      
      // Base items in group blocks (multiply by group sets)
      groupBlock.items.forEach((subItem, subIdx) => {
        if (subItem.type === 'pose_instance' && !subItem.locked) {
          candidates.push({ 
            item: subItem, 
            path: `items[${idx}].items[${subIdx}]`, 
            multiplier: groupSets,
            priority: groupSets === 1 ? 1 : 2,
            currentDuration: parseDuration(subItem.duration)
          });
        }
      });
      
      // Round override items - prioritize those with 1 set
      groupBlock.roundOverrides.forEach((override, overrideIdx) => {
        const overrideSets = override.sets || 1;
        override.items.forEach((overrideItem, itemIdx) => {
          if (overrideItem.type === 'pose_instance' && !overrideItem.locked) {
            // Round override items multiply by override sets
            candidates.push({ 
              item: overrideItem, 
              path: `items[${idx}].roundOverrides[${overrideIdx}].items[${itemIdx}]`, 
              multiplier: overrideSets,
              priority: overrideSets === 1 ? 1 : 3,
              currentDuration: parseDuration(overrideItem.duration)
            });
          }
        });
      });
      
      // Item substitutes (appear in specific rounds, multiply by 1 per appearance)
      // These are trickier - they appear in specific rounds only, so multiplier varies
      // For simplicity, treat them like base items
      groupBlock.itemSubstitutes?.forEach((substitute, subIdx) => {
        if (substitute.substituteItem.type === 'pose_instance' && !substitute.substituteItem.locked) {
          candidates.push({ 
            item: substitute.substituteItem, 
            path: `items[${idx}].itemSubstitutes[${subIdx}].substituteItem`, 
            multiplier: 1, // Appears once in the specified round
            priority: 1,
            currentDuration: parseDuration(substitute.substituteItem.duration)
          });
        }
      });
    }
  });
  
  // Sort by priority, then by multiplier (lower is better for precision), then by duration
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.multiplier !== b.multiplier) return a.multiplier - b.multiplier;
    return a.currentDuration - b.currentDuration;
  });
  
  // Try to add seconds, accounting for multipliers
  let remaining = secondsToAdd;
  const updatedSection = JSON.parse(JSON.stringify(section)) as Section; // Deep clone
  
  for (const candidate of candidates) {
    if (remaining <= 0) break;
    
    // Check if adding to this item would help
    // We want to add seconds such that multiplier × 1 <= remaining
    if (candidate.multiplier > remaining) {
      continue; // Skip if multiplier would exceed remaining
    }
    
    // Parse path and update
    const pathParts = candidate.path.split(/[\[\]\.]+/).filter(p => p);
    let target: any = updatedSection;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (part.match(/^\d+$/)) {
        target = target[parseInt(part)];
      } else {
        target = target[part];
      }
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    const currentDuration = parseDuration(target[lastPart].duration);
    target[lastPart] = {
      ...target[lastPart],
      duration: formatDuration(currentDuration + 1),
    };
    remaining -= candidate.multiplier; // Account for the multiplier
  }
  
  return updatedSection;
}

/**
 * Try to subtract seconds from unlocked items, accounting for multipliers
 */
function trySubtractSeconds(section: Section, secondsToSubtract: number): Section {
  if (secondsToSubtract <= 0) return section;
  
  // Find candidates with duration > 1 (can't go below 1 second)
  const candidates: Array<{ 
    item: PoseInstance; 
    path: string; 
    multiplier: number;
    currentDuration: number;
  }> = [];
  
  section.items.forEach((item, idx) => {
    if (item.type === 'pose_instance' && !item.locked) {
      const duration = parseDuration(item.duration);
      if (duration > 1) {
        candidates.push({ 
          item, 
          path: `items[${idx}]`, 
          multiplier: 1,
          currentDuration: duration 
        });
      }
    } else if (item.type === 'group_block') {
      const groupBlock = item;
      const groupSets = groupBlock.sets;
      
      groupBlock.items.forEach((subItem, subIdx) => {
        if (subItem.type === 'pose_instance' && !subItem.locked) {
          const duration = parseDuration(subItem.duration);
          if (duration > 1) {
            candidates.push({ 
              item: subItem, 
              path: `items[${idx}].items[${subIdx}]`, 
              multiplier: groupSets,
              currentDuration: duration 
            });
          }
        }
      });
      
      groupBlock.roundOverrides.forEach((override, overrideIdx) => {
        const overrideSets = override.sets || 1;
        override.items.forEach((overrideItem, itemIdx) => {
          if (overrideItem.type === 'pose_instance' && !overrideItem.locked) {
            const duration = parseDuration(overrideItem.duration);
            if (duration > 1) {
              candidates.push({ 
                item: overrideItem, 
                path: `items[${idx}].roundOverrides[${overrideIdx}].items[${itemIdx}]`, 
                multiplier: overrideSets,
                currentDuration: duration 
              });
            }
          }
        });
      });
      
      groupBlock.itemSubstitutes?.forEach((substitute, subIdx) => {
        if (substitute.substituteItem.type === 'pose_instance' && !substitute.substituteItem.locked) {
          const duration = parseDuration(substitute.substituteItem.duration);
          if (duration > 1) {
            candidates.push({ 
              item: substitute.substituteItem, 
              path: `items[${idx}].itemSubstitutes[${subIdx}].substituteItem`, 
              multiplier: 1,
              currentDuration: duration 
            });
          }
        }
      });
    }
  });
  
  // Sort by multiplier descending (prefer reducing items with higher multipliers), then by duration descending
  candidates.sort((a, b) => {
    if (a.multiplier !== b.multiplier) return b.multiplier - a.multiplier;
    return b.currentDuration - a.currentDuration;
  });
  
  // Subtract seconds from candidates, accounting for multipliers
  let remaining = secondsToSubtract;
  const updatedSection = JSON.parse(JSON.stringify(section)) as Section; // Deep clone
  
  for (const candidate of candidates) {
    if (remaining <= 0) break;
    
    const pathParts = candidate.path.split(/[\[\]\.]+/).filter(p => p);
    let target: any = updatedSection;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (part.match(/^\d+$/)) {
        target = target[parseInt(part)];
      } else {
        target = target[part];
      }
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    const currentDuration = parseDuration(target[lastPart].duration);
    const newDuration = Math.max(1, currentDuration - 1); // Don't go below 1 second
    target[lastPart] = {
      ...target[lastPart],
      duration: formatDuration(newDuration),
    };
    remaining -= candidate.multiplier; // Account for the multiplier
  }
  
  return updatedSection;
}
