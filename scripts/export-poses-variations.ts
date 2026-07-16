/**
 * Script to export poses and pose variations as merged data
 *
 * Usage:
 *   yarn export-poses-variations [--format csv|json]
 *
 * Environment variables required:
 *   TURSO_DATABASE_URL
 *   TURSO_AUTH_TOKEN
 */

import fs from 'fs'
import path from 'path'
import { getScriptDb, parseJson } from './db'

const format = process.argv.includes('--format')
  ? process.argv[process.argv.indexOf('--format') + 1] || 'json'
  : 'json'

interface MergedData {
  pose_id: string
  pose_name: string
  variation_id: string
  variation_name: string
  is_default: boolean
  transitional_cues?: string[] | null
  variation_created_at: string
  variation_updated_at: string
  pose_created_at: string
}

async function exportData() {
  console.log('📥 Fetching poses and variations from database...\n')

  const db = getScriptDb()
  const result = await db.execute(`
    SELECT
      pv.id as variation_id,
      pv.pose_id,
      pv.name as variation_name,
      pv.is_default,
      pv.transitional_cues,
      pv.created_at as variation_created_at,
      pv.updated_at as variation_updated_at,
      p.name as pose_name,
      p.created_at as pose_created_at
    FROM pose_variations pv
    JOIN poses p ON p.id = pv.pose_id
    ORDER BY pv.pose_id, pv.is_default DESC, p.name ASC
  `)

  if (result.rows.length === 0) {
    console.log('No pose variations found.')
    return
  }

  const mergedData: MergedData[] = result.rows.map((row) => ({
    pose_id: row.pose_id as string,
    pose_name: row.pose_name as string,
    variation_id: row.variation_id as string,
    variation_name: row.variation_name as string,
    is_default: row.is_default === 1,
    transitional_cues: parseJson<string[] | null>(row.transitional_cues, null),
    variation_created_at: row.variation_created_at as string,
    variation_updated_at: row.variation_updated_at as string,
    pose_created_at: row.pose_created_at as string,
  }))

  console.log(`✅ Found ${mergedData.length} pose variations across ${new Set(mergedData.map(d => d.pose_id)).size} poses\n`)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `poses-variations-export-${timestamp}`

  if (format === 'csv') {
    exportAsCSV(mergedData, filename)
  } else {
    exportAsJSON(mergedData, filename)
  }
}

function exportAsCSV(data: MergedData[], filename: string) {
  const hasCues = data.some(item => item.transitional_cues !== undefined)

  const headers = [
    'Pose ID', 'Pose Name', 'Variation ID', 'Variation Name', 'Is Default',
    ...(hasCues ? ['Cue 1', 'Cue 2', 'Cue 3'] : []),
    'Variation Created', 'Variation Updated', 'Pose Created'
  ]

  const rows = data.map(item => {
    const baseRow = [
      item.pose_id,
      `"${item.pose_name.replace(/"/g, '""')}"`,
      item.variation_id,
      `"${item.variation_name.replace(/"/g, '""')}"`,
      item.is_default ? 'Yes' : 'No',
    ]

    if (hasCues) {
      const cues = item.transitional_cues || []
      baseRow.push(cues[0] || '', cues[1] || '', cues[2] || '')
    }

    baseRow.push(item.variation_created_at, item.variation_updated_at, item.pose_created_at)
    return baseRow.join(',')
  })

  const filepath = path.join(process.cwd(), `${filename}.csv`)
  fs.writeFileSync(filepath, [headers.join(','), ...rows].join('\n'), 'utf-8')
  console.log(`✅ Exported to: ${filepath}`)
}

function exportAsJSON(data: MergedData[], filename: string) {
  const filepath = path.join(process.cwd(), `${filename}.json`)
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`✅ Exported to: ${filepath}`)
  console.log(`   Rows: ${data.length}`)
}

exportData().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
