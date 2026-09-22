/**
 * Reconstruct sequences from HTML print exports and insert into Turso.
 *
 * Usage:
 *   yarn tsx scripts/import-html-sequences.ts
 */

import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
})

const BACKUP_DIR =
  '/Users/ianherdegen/Documents/Sequence Backups and Playlist Baackups/Sequences'
const USER_EMAIL = 'ian.herdegen@gmail.com'

const FILES: Record<string, string> = {
  'Balance & Stability': 'balance___stability.html',
  'Core & Obliques': 'core___obliques.html',
  'Legs & Glutes': 'legs___glutes.html',
}

type PoseTok = { kind: 'pose'; name: string; duration: string }
type GroupTok = {
  kind: 'group'
  sets: number
  items: PoseTok[]
  itemSubstitutes: { round: number; itemIndex: number; name: string; duration: string }[]
  roundOverrides: { round: number; sets: number; items: PoseTok[] }[]
}
type ItemTok = PoseTok | GroupTok

function decode(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function parsePad(style: string) {
  const m = style.match(/padding-left:\s*(\d+)px/)
  return m ? Number(m[1]) : 0
}

function displayLabel(poseName: string, varName: string, isDefault: boolean | number) {
  if (isDefault || String(varName).includes('(Default)')) return poseName
  return `${poseName} (${varName})`
}

function parseLabel(label: string) {
  const m = label.match(/^(.*?)\s*\((.*)\)\s*$/)
  if (m) return { poseName: m[1].trim(), varName: m[2].trim() }
  return { poseName: label.trim(), varName: null as string | null }
}

function parseHtml(html: string) {
  const titleMatch = html.match(/<h1>\s*<span>(.*?)<\/span>/s)
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled'
  const bodyStart = html.indexOf('</h1>')
  const body = html.slice(bodyStart + 5).replace(/<\/body>[\s\S]*$/, '')
  const sectionParts = body.split(/<div class="section-header">/)
  const sections: { name: string; items: ItemTok[] }[] = []

  for (let i = 1; i < sectionParts.length; i++) {
    const part = sectionParts[i]
    const nameMatch = part.match(/<h2>(.*?)<\/h2>/)
    if (!nameMatch) continue
    const content = part.replace(/^[\s\S]*?<\/div>/, '')
    sections.push({ name: nameMatch[1].trim(), items: parseSectionItems(content) })
  }

  return { title, sections }
}

type Token =
  | { type: 'group'; index: number; sets: number; pad: number }
  | { type: 'round_ending'; index: number; round: number; sets: number }
  | { type: 'substitute'; index: number; round: number; name: string; duration: string; pad: number }
  | { type: 'pose'; index: number; name: string; duration: string; pad: number }

function parseSectionItems(content: string): ItemTok[] {
  const tokens: Token[] = []

  for (const m of content.matchAll(
    /style="([^"]*)"[^>]*>\s*<div>\s*<strong>Group:<\/strong>\s*(\d+)\s*sets\s*<\/div>/g
  )) {
    tokens.push({ type: 'group', index: m.index!, sets: Number(m[2]), pad: parsePad(m[1]) })
  }

  for (const m of content.matchAll(/Round\s+(\d+)\s+Ending(?:\s*\((\d+)\s+sets\))?\s*:/g)) {
    tokens.push({
      type: 'round_ending',
      index: m.index!,
      round: Number(m[1]),
      sets: m[2] ? Number(m[2]) : 1,
    })
  }

  for (const m of content.matchAll(
    /style="([^"]*#ea580c[^"]*)"[^>]*>[\s\S]*?<span>\s*Round\s+(\d+):\s*(.*?)\s*<\/span>\s*<span>\s*(\d{1,2}:\d{2})\s*<\/span>/g
  )) {
    tokens.push({
      type: 'substitute',
      index: m.index!,
      round: Number(m[2]),
      name: decode(m[3]),
      duration: m[4],
      pad: parsePad(m[1]),
    })
  }

  for (const m of content.matchAll(
    /style="([^"]*padding-left:\s*\d+px[^"]*)"[^>]*>\s*<div>\s*([^<]+?)\s*<\/div>\s*<div[^>]*>\s*(\d{1,2}:\d{2})\s*<\/div>/g
  )) {
    if (m[1].includes('#ea580c')) continue
    const name = decode(m[2])
    if (name.includes('Group:')) continue
    tokens.push({
      type: 'pose',
      index: m.index!,
      name,
      duration: m[3],
      pad: parsePad(m[1]),
    })
  }

  tokens.sort((a, b) => a.index - b.index)
  return buildItems(tokens, 0)
}

function buildItems(tokens: Token[], basePad: number): ItemTok[] {
  const items: ItemTok[] = []
  let i = 0

  while (i < tokens.length) {
    const t = tokens[i]

    if (t.type === 'pose' && t.pad === basePad) {
      items.push({ kind: 'pose', name: t.name, duration: t.duration })
      i++
      continue
    }

    if (t.type === 'group' && t.pad === basePad) {
      i++
      const group: GroupTok = {
        kind: 'group',
        sets: t.sets,
        items: [],
        itemSubstitutes: [],
        roundOverrides: [],
      }

      while (i < tokens.length) {
        const cur = tokens[i]
        if (cur.type === 'round_ending') break
        if (cur.type === 'group' && cur.pad === basePad) break
        if (cur.type === 'pose' && cur.pad === basePad) break

        if (cur.type === 'pose') {
          group.items.push({ kind: 'pose', name: cur.name, duration: cur.duration })
          i++
        } else if (cur.type === 'substitute') {
          const itemIndex = group.items.length - 1
          if (itemIndex >= 0) {
            group.itemSubstitutes.push({
              round: cur.round,
              itemIndex,
              name: cur.name,
              duration: cur.duration,
            })
          }
          i++
        } else {
          i++
        }
      }

      while (i < tokens.length && tokens[i].type === 'round_ending') {
        const ending = tokens[i] as Extract<Token, { type: 'round_ending' }>
        i++
        const override = { round: ending.round, sets: ending.sets, items: [] as PoseTok[] }
        while (i < tokens.length) {
          const cur = tokens[i]
          if (cur.type === 'round_ending') break
          if (cur.type === 'group' && cur.pad === basePad) break
          if (cur.type === 'pose' && cur.pad === basePad) break
          if (cur.type === 'pose') {
            override.items.push({ kind: 'pose', name: cur.name, duration: cur.duration })
            i++
          } else {
            i++
          }
        }
        group.roundOverrides.push(override)
      }

      items.push(group)
      continue
    }

    if (t.type === 'pose') {
      items.push({ kind: 'pose', name: t.name, duration: t.duration })
    }
    i++
  }

  return items
}

type Catalog = {
  byLabel: Map<string, { var_id: string; pose_id: string; pose_name: string; var_name: string }>
  posesByName: Map<string, { id: string; name: string }>
}

async function loadCatalog(): Promise<Catalog> {
  const r = await db.execute(`
    SELECT p.id as pose_id, p.name as pose_name, v.id as var_id, v.name as var_name, v.is_default
    FROM poses p LEFT JOIN pose_variations v ON v.pose_id = p.id
  `)
  const byLabel = new Map<string, { var_id: string; pose_id: string; pose_name: string; var_name: string }>()
  const posesByName = new Map<string, { id: string; name: string }>()

  for (const row of r.rows) {
    posesByName.set(String(row.pose_name).toLowerCase(), {
      id: String(row.pose_id),
      name: String(row.pose_name),
    })
    if (!row.var_id) continue
    const label = displayLabel(String(row.pose_name), String(row.var_name), row.is_default as number)
    byLabel.set(label.toLowerCase(), {
      var_id: String(row.var_id),
      pose_id: String(row.pose_id),
      pose_name: String(row.pose_name),
      var_name: String(row.var_name),
    })
  }

  return { byLabel, posesByName }
}

async function ensureVariation(catalog: Catalog, label: string, authorId: string) {
  const key = label.toLowerCase()
  if (catalog.byLabel.has(key)) return catalog.byLabel.get(key)!.var_id

  const { poseName, varName } = parseLabel(label)
  let pose = catalog.posesByName.get(poseName.toLowerCase())

  if (!pose) {
    const poseId = randomUUID()
    await db.execute({
      sql: `INSERT INTO poses (id, name, created_at, updated_at, author_id)
            VALUES (?, ?, datetime('now'), datetime('now'), ?)`,
      args: [poseId, poseName, authorId],
    })
    const defId = randomUUID()
    const defName = `${poseName} (Default)`
    await db.execute({
      sql: `INSERT INTO pose_variations
            (id, pose_id, name, is_default, created_at, updated_at, author_id, transitional_cues)
            VALUES (?, ?, ?, 1, datetime('now'), datetime('now'), ?, '[]')`,
      args: [defId, poseId, defName, authorId],
    })
    pose = { id: poseId, name: poseName }
    catalog.posesByName.set(poseName.toLowerCase(), pose)
    catalog.byLabel.set(poseName.toLowerCase(), {
      var_id: defId,
      pose_id: poseId,
      pose_name: poseName,
      var_name: defName,
    })
    console.log(`  + pose: ${poseName}`)
    if (!varName) return defId
  }

  if (!varName) {
    const existing = catalog.byLabel.get(poseName.toLowerCase())
    if (existing) return existing.var_id
  }

  const varId = randomUUID()
  await db.execute({
    sql: `INSERT INTO pose_variations
          (id, pose_id, name, is_default, created_at, updated_at, author_id, transitional_cues)
          VALUES (?, ?, ?, 0, datetime('now'), datetime('now'), ?, '[]')`,
    args: [varId, pose.id, varName, authorId],
  })
  const fullLabel = displayLabel(pose.name, varName!, false)
  catalog.byLabel.set(fullLabel.toLowerCase(), {
    var_id: varId,
    pose_id: pose.id,
    pose_name: pose.name,
    var_name: varName!,
  })
  console.log(`  + variation: ${fullLabel}`)
  return varId
}

async function toPoseInstance(catalog: Catalog, pose: PoseTok, authorId: string) {
  const varId = await ensureVariation(catalog, pose.name, authorId)
  return {
    id: randomUUID(),
    type: 'pose_instance',
    duration: pose.duration,
    poseVariationId: varId,
  }
}

async function toItems(catalog: Catalog, items: ItemTok[], authorId: string): Promise<any[]> {
  const out: any[] = []
  for (const it of items) {
    if (it.kind === 'pose') {
      out.push(await toPoseInstance(catalog, it, authorId))
    } else {
      const group: any = {
        id: randomUUID(),
        type: 'group_block',
        sets: it.sets,
        items: await toItems(catalog, it.items, authorId),
        roundOverrides: [] as any[],
        itemSubstitutes: [] as any[],
      }
      for (const sub of it.itemSubstitutes) {
        group.itemSubstitutes.push({
          round: sub.round,
          itemIndex: sub.itemIndex,
          substituteItem: await toPoseInstance(
            catalog,
            { kind: 'pose', name: sub.name, duration: sub.duration },
            authorId
          ),
        })
      }
      for (const o of it.roundOverrides) {
        group.roundOverrides.push({
          round: o.round,
          sets: o.sets,
          items: await toItems(catalog, o.items, authorId),
        })
      }
      out.push(group)
    }
  }
  return out
}

function collectLabels(items: ItemTok[], set: Set<string>) {
  for (const it of items) {
    if (it.kind === 'pose') set.add(it.name)
    else {
      collectLabels(it.items, set)
      for (const s of it.itemSubstitutes) set.add(s.name)
      for (const o of it.roundOverrides) collectLabels(o.items, set)
    }
  }
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error('Missing TURSO_DATABASE_URL')
    process.exit(1)
  }

  const userRow = await db.execute({
    sql: `SELECT id FROM users WHERE email = ?`,
    args: [USER_EMAIL],
  })
  if (!userRow.rows.length) {
    console.error(`User not found: ${USER_EMAIL}`)
    process.exit(1)
  }
  const userId = String(userRow.rows[0].id)
  const catalog = await loadCatalog()

  const orderR = await db.execute({
    sql: `SELECT COALESCE(MAX(display_order), -1) as m FROM sequences WHERE user_id = ?`,
    args: [userId],
  })
  let nextOrder = Number(orderR.rows[0].m) + 1

  console.log('=== Creating any missing poses/variations ===')
  for (const [name, file] of Object.entries(FILES)) {
    const parsed = parseHtml(readFileSync(join(BACKUP_DIR, file), 'utf8'))
    const needed = new Set<string>()
    for (const s of parsed.sections) collectLabels(s.items, needed)
    for (const label of [...needed].sort()) {
      if (!catalog.byLabel.has(label.toLowerCase())) {
        await ensureVariation(catalog, label, userId)
      }
    }

    const existing = await db.execute({
      sql: `SELECT id FROM sequences WHERE user_id = ? AND name = ?`,
      args: [userId, name],
    })
    if (existing.rows.length) {
      console.log(`skip (exists): ${name}`)
      continue
    }

    const sections = []
    for (const s of parsed.sections) {
      sections.push({
        id: randomUUID(),
        name: s.name,
        type: 'section',
        items: await toItems(catalog, s.items, userId),
      })
    }

    const id = randomUUID()
    await db.execute({
      sql: `INSERT INTO sequences
            (id, user_id, name, sections, created_at, updated_at, display_order, published_to_profile)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?, 0)`,
      args: [id, userId, name, JSON.stringify(sections), nextOrder++],
    })
    console.log(`inserted: ${name} (${sections.length} sections, ${JSON.stringify(sections).length} chars)`)
  }

  const final = await db.execute({
    sql: `SELECT name, length(sections) as len, display_order
          FROM sequences WHERE user_id = ? ORDER BY display_order, name`,
    args: [userId],
  })
  console.log("\n=== Ian's sequences ===")
  for (const r of final.rows) {
    console.log(`  [${r.display_order}] ${r.name} (${r.len} chars)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
