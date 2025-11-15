/**
 * Script to generate transitional cues for all pose variations using LLM
 * 
 * Usage:
 *   npx tsx scripts/generate-transitional-cues.ts
 * 
 * Environment variables required:
 *   VITE_SUPABASE_URL - Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Your Supabase anon key
 *   OPENAI_API_KEY or ANTHROPIC_API_KEY - LLM API key
 *   LLM_PROVIDER - 'openai' or 'anthropic' (default: 'openai')
 *   LLM_MODEL - Optional model name (default: 'gpt-4o-mini' for OpenAI, 'claude-3-haiku-20240307' for Anthropic)
 */

import { createClient } from '@supabase/supabase-js';
import { generateTransitionalCues, batchGenerateCues } from '../src/lib/llmService';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const llmProvider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic';
const llmModel = process.env.LLM_MODEL;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!openaiKey && !anthropicKey) {
  console.error('Error: Missing LLM API key');
  console.error('Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY');
  process.exit(1);
}

const apiKey = llmProvider === 'openai' ? openaiKey! : anthropicKey!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PoseVariation {
  id: string;
  pose_id: string;
  name: string;
  pose_name?: string;
}

async function main() {
  console.log('🚀 Starting transitional cues generation...\n');

  // Fetch all poses and variations
  console.log('📥 Fetching poses and variations from database...');
  const { data: variations, error: variationsError } = await supabase
    .from('pose_variations')
    .select(`
      id,
      pose_id,
      name,
      transitional_cues,
      poses(name)
    `)
    .order('pose_id, name');

  if (variationsError) {
    console.error('Error fetching variations:', variationsError);
    process.exit(1);
  }

  if (!variations || variations.length === 0) {
    console.log('No pose variations found in database.');
    return;
  }

  console.log(`Found ${variations.length} pose variations\n`);

  // Filter out variations that already have cues
  const variationsNeedingCues = variations.filter(
    (v: any) => !v.transitional_cues || (Array.isArray(v.transitional_cues) && v.transitional_cues.length === 0)
  );

  if (variationsNeedingCues.length === 0) {
    console.log('✅ All variations already have transitional cues!');
    return;
  }

  console.log(`Generating cues for ${variationsNeedingCues.length} variations...\n`);

  // Prepare data for batch generation
  const variationsToProcess = variationsNeedingCues.map((v: any) => ({
    poseName: v.poses?.name || 'Unknown Pose',
    variationName: v.name,
    id: v.id,
  }));

  // Generate cues in batches
  const config = {
    provider: llmProvider,
    apiKey,
    model: llmModel,
  };

  let processed = 0;
  const results = await batchGenerateCues(
    variationsToProcess.map(({ poseName, variationName }) => ({ poseName, variationName })),
    config,
    (current, total) => {
      processed = current;
      const percentage = Math.round((current / total) * 100);
      process.stdout.write(`\r⏳ Progress: ${current}/${total} (${percentage}%)`);
    }
  );

  console.log('\n\n💾 Saving cues to database...\n');

  // Update database with generated cues
  let successCount = 0;
  let errorCount = 0;

  for (const variation of variationsToProcess) {
    const key = `${variation.poseName}::${variation.variationName}`;
    const cues = results.get(key);

    if (!cues || cues.length !== 3) {
      console.error(`⚠️  Invalid cues for ${key}, skipping...`);
      errorCount++;
      continue;
    }

    const { error } = await supabase
      .from('pose_variations')
      .update({ transitional_cues: cues })
      .eq('id', variation.id);

    if (error) {
      console.error(`❌ Error updating ${variation.poseName} - ${variation.variationName}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ ${variation.poseName} - ${variation.variationName}`);
      successCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ Generation complete!`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('='.repeat(50));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

