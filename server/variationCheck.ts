// @ts-nocheck
// Recursively check if a sequence item contains a variation ID
function itemContainsVariation(item: unknown, variationId: string): boolean {
  if (!item || typeof item !== 'object') return false
  const obj = item as Record<string, unknown>

  if (obj.type === 'pose_instance') {
    return obj.poseVariationId === variationId
  }

  if (obj.type === 'group_block') {
    const items = obj.items
    if (Array.isArray(items)) {
      for (const subItem of items) {
        if (itemContainsVariation(subItem, variationId)) return true
      }
    }

    const roundOverrides = obj.roundOverrides
    if (Array.isArray(roundOverrides)) {
      for (const override of roundOverrides) {
        if (override && typeof override === 'object') {
          const overrideItems = (override as Record<string, unknown>).items
          if (Array.isArray(overrideItems)) {
            for (const subItem of overrideItems) {
              if (itemContainsVariation(subItem, variationId)) return true
            }
          }
        }
      }
    }
  }

  return false
}

export function checkVariationUsage(
  sections: unknown,
  variationId: string
): boolean {
  if (!Array.isArray(sections)) return false

  for (const section of sections) {
    if (!section || typeof section !== 'object') continue
    const items = (section as Record<string, unknown>).items
    if (!Array.isArray(items)) continue

    for (const item of items) {
      if (itemContainsVariation(item, variationId)) return true
    }
  }

  return false
}

export function findSequencesUsingVariation(
  sequences: Array<{ name: string; sections: unknown }>,
  variationId: string
): string[] {
  const names: string[] = []
  for (const seq of sequences) {
    if (checkVariationUsage(seq.sections, variationId)) {
      names.push(seq.name)
    }
  }
  return names
}
