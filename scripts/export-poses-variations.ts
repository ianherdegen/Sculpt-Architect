/**
 * Script to export poses and pose variations as merged data
 * 
 * Usage:
 *   yarn export-poses-variations [--format csv|json]
 * 
 * Environment variables required:
 *   VITE_SUPABASE_URL - Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY - Your Supabase anon key
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const format = process.argv.includes('--format') 
  ? process.argv[process.argv.indexOf('--format') + 1] || 'json'
  : 'json';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface MergedData {
  pose_id: string;
  pose_name: string;
  variation_id: string;
  variation_name: string;
  is_default: boolean;
  transitional_cues?: string[] | null;  // Optional - only if column exists
  variation_created_at: string;
  variation_updated_at: string;
  pose_created_at: string;
}

async function exportData() {
  console.log('📥 Fetching poses and variations from database...\n');

  // Fetch poses and variations with join
  // Note: transitional_cues is optional - will be null if column doesn't exist
  const { data: variations, error } = await supabase
    .from('pose_variations')
    .select(`
      id,
      pose_id,
      name,
      is_default,
      created_at,
      updated_at,
      poses (
        id,
        name,
        created_at
      )
    `)
    .order('pose_id, is_default', { ascending: [true, false] })
    .order('name', { foreignTable: 'poses', ascending: true });

  if (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }

  if (!variations || variations.length === 0) {
    console.log('No pose variations found.');
    return;
  }

  // Transform data to merged format
  const mergedData: MergedData[] = variations.map((v: any) => {
    const data: MergedData = {
      pose_id: v.pose_id,
      pose_name: v.poses?.name || 'Unknown',
      variation_id: v.id,
      variation_name: v.name,
      is_default: v.is_default,
      variation_created_at: v.created_at,
      variation_updated_at: v.updated_at,
      pose_created_at: v.poses?.created_at || '',
    };
    
    // Only include transitional_cues if it exists in the response
    if (v.transitional_cues !== undefined) {
      data.transitional_cues = v.transitional_cues || null;
    }
    
    return data;
  });

  console.log(`✅ Found ${mergedData.length} pose variations across ${new Set(mergedData.map(d => d.pose_id)).size} poses\n`);

  // Export based on format
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `poses-variations-export-${timestamp}`;

  if (format === 'csv') {
    exportAsCSV(mergedData, filename);
  } else {
    exportAsJSON(mergedData, filename);
  }
}

function exportAsCSV(data: MergedData[], filename: string) {
  // Check if transitional_cues exists in any record
  const hasCues = data.some(item => item.transitional_cues !== undefined);
  
  // CSV Header
  const headers = [
    'Pose ID',
    'Pose Name',
    'Variation ID',
    'Variation Name',
    'Is Default',
    ...(hasCues ? ['Cue 1', 'Cue 2', 'Cue 3'] : []),
    'Variation Created',
    'Variation Updated',
    'Pose Created'
  ];

  // CSV Rows
  const rows = data.map(item => {
    const baseRow = [
      item.pose_id,
      `"${item.pose_name.replace(/"/g, '""')}"`,
      item.variation_id,
      `"${item.variation_name.replace(/"/g, '""')}"`,
      item.is_default ? 'Yes' : 'No',
    ];
    
    if (hasCues) {
      const cues = item.transitional_cues || [];
      baseRow.push(
        cues[0] || '',
        cues[1] || '',
        cues[2] || ''
      );
    }
    
    baseRow.push(
      item.variation_created_at,
      item.variation_updated_at,
      item.pose_created_at
    );
    
    return baseRow.join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const filepath = path.join(process.cwd(), `${filename}.csv`);
  
  fs.writeFileSync(filepath, csvContent, 'utf-8');
  console.log(`✅ Exported to: ${filepath}`);
  console.log(`   Format: CSV`);
  console.log(`   Rows: ${data.length}`);
}

function exportAsJSON(data: MergedData[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const filepath = path.join(process.cwd(), `${filename}.json`);
  
  fs.writeFileSync(filepath, jsonContent, 'utf-8');
  console.log(`✅ Exported to: ${filepath}`);
  console.log(`   Format: JSON`);
  console.log(`   Rows: ${data.length}`);
  
  // Also show summary
  console.log('\n📊 Summary:');
  const posesCount = new Set(data.map(d => d.pose_id)).size;
  const hasCuesColumn = data.some(d => d.transitional_cues !== undefined);
  
  console.log(`   Total Poses: ${posesCount}`);
  console.log(`   Total Variations: ${data.length}`);
  
  if (hasCuesColumn) {
    const variationsWithCues = data.filter(d => d.transitional_cues && d.transitional_cues.length > 0).length;
    console.log(`   Variations with Cues: ${variationsWithCues}`);
    console.log(`   Variations without Cues: ${data.length - variationsWithCues}`);
  } else {
    console.log(`   Note: Transitional cues column not found in database`);
  }
}

exportData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

