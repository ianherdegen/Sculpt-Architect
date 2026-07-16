/**
 * Script to generate transitional cues for all pose variations using LLM
 *
 * Usage:
 *   yarn generate-transitional-cues
 *
 * Environment variables required:
 *   TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 *   OPENAI_API_KEY or ANTHROPIC_API_KEY
 */

import { getScriptDb, parseJson } from './db'
import { batchGenerateCues } from '../src/lib/llmService'

const openaiKey = process.env.OPENAI_API_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY
const llmProvider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic'
const llmModel = process.env.LLM_MODEL

if (!openaiKey && !anthropicKey) {
  console.error('Error: Missing LLM API key')
  process.exit(1)
}

const apiKey = llmProvider === 'openai' ? openaiKey! : anthropicKey!

async function main() {
  console.log('🚀 Starting transitional cues generation...\n')

  const db = getScriptDb()
  const result = await db.execute(`
    SELECT pv.id, pv.pose_id, pv.name, pv.transitional_cues, p.name as pose_name
    FROM pose_variations pv
    JOIN poses p ON p.id = pv.pose_id
    ORDER BY pv.pose_id, pv.name
  `)

  if (result.rows.length === 0) {
    console.log('No pose variations found in database.')
    return
  }

  const variations = result.rows.map((row) => ({
    id: row.id as string,
    pose_id: row.pose_id as string,
    name: row.name as string,
    pose_name: row.pose_name as string,
    transitional_cues: parseJson<string[]>(row.transitional_cues, []),
  }))

  console.log(`Found ${variations.length} pose variations\n`)

  const variationsNeedingCues = variations.filter(
    (v) => !v.transitional_cues || v.transitional_cues.length === 0
  )

  if (variationsNeedingCues.length === 0) {
    console.log('✅ All variations already have transitional cues!')
    return
  }

  console.log(`Generating cues for ${variationsNeedingCues.length} variations...\n`)

  const variationsToProcess = variationsNeedingCues.map((v) => ({
    poseName: v.pose_name,
    variationName: v.name,
    id: v.id,
  }))

  const config = { provider: llmProvider, apiKey, model: llmModel }

  const results = await batchGenerateCues(
    variationsToProcess.map(({ poseName, variationName }) => ({ poseName, variationName })),
    config,
    (current, total) => {
      const percentage = Math.round((current / total) * 100)
      process.stdout.write(`\r⏳ Progress: ${current}/${total} (${percentage}%)`)
    }
  )

  console.log('\n\n💾 Saving cues to database...\n')

  let successCount = 0
  let errorCount = 0

  for (const variation of variationsToProcess) {
    const key = `${variation.poseName}::${variation.variationName}`
    const cues = results.get(key)

    if (!cues || cues.length !== 3) {
      console.error(`⚠️  Invalid cues for ${key}, skipping...`)
      errorCount++
      continue
    }

    try {
      await db.execute({
        sql: `UPDATE pose_variations SET transitional_cues = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [JSON.stringify(cues), variation.id],
      })
      console.log(`✅ ${variation.poseName} - ${variation.variationName}`)
      successCount++
    } catch (error) {
      console.error(`❌ Error updating ${variation.poseName} - ${variation.variationName}:`, error)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`✨ Generation complete! Success: ${successCount}, Errors: ${errorCount}`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
