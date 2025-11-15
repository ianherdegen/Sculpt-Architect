# Transitional Cues Setup Guide

This guide explains how to add and generate transitional cues for pose variations using LLM models.

## Overview

Transitional cues are 3 bottom-to-top instructions that help yoga instructors guide students into each pose variation. These cues are:
- Generated using AI (OpenAI or Anthropic Claude)
- Stored in the database as a JSONB array
- Automatically associated with each pose variation

## Setup Steps

### 1. Run Database Migration

First, add the `transitional_cues` column to your `pose_variations` table:

```sql
-- Run this in your Supabase SQL Editor
-- File: sql/supabase-add-transitional-cues-migration.sql
```

Or execute the migration file:
```bash
# Copy the SQL from sql/supabase-add-transitional-cues-migration.sql
# and run it in your Supabase dashboard SQL editor
```

### 2. Configure Environment Variables

Add LLM API credentials to your `.env.local` file:

```bash
# Required: Supabase credentials
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required: Choose one LLM provider

# Option 1: OpenAI (recommended - cost-effective)
OPENAI_API_KEY=sk-your-openai-api-key
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini  # Optional

# Option 2: Anthropic Claude
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
# LLM_PROVIDER=anthropic
# LLM_MODEL=claude-3-haiku-20240307  # Optional
```

**Getting API Keys:**
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/settings/keys

### 3. Install Dependencies

```bash
yarn install
# or
npm install
```

This will install `tsx` which is needed to run the TypeScript script.

### 4. Generate Cues for Existing Variations

Run the generation script to populate cues for all existing pose variations:

```bash
yarn generate-cues
# or
npm run generate-cues
```

The script will:
- Fetch all pose variations from your database
- Generate 3 transitional cues for each variation using the LLM
- Save the cues back to the database
- Show progress and results

**Note**: The script includes rate limiting (500ms delay between requests) to avoid API rate limits.

### 5. Verify Results

Check your database to see the generated cues:

```sql
SELECT 
  p.name as pose_name,
  pv.name as variation_name,
  pv.transitional_cues
FROM pose_variations pv
JOIN poses p ON p.id = pv.pose_id
WHERE pv.transitional_cues IS NOT NULL
LIMIT 10;
```

## How It Works

### Database Schema

The `transitional_cues` column is a JSONB array that stores exactly 3 strings:

```json
[
  "Place your feet hip-width apart",
  "Engage your core and lengthen your spine",
  "Reach your arms overhead"
]
```

### LLM Generation

The system uses AI to generate contextually appropriate cues based on:
- The pose name (e.g., "Downward Dog")
- The variation name (e.g., "Default" or "Modified")
- Yoga instruction best practices (bottom-to-top progression)

### API Costs

**OpenAI (gpt-4o-mini)**:
- ~$0.15 per 1M input tokens
- ~$0.60 per 1M output tokens
- Estimated cost: ~$0.001-0.002 per pose variation

**Anthropic (claude-3-haiku)**:
- ~$0.25 per 1M input tokens
- ~$1.25 per 1M output tokens
- Estimated cost: ~$0.002-0.003 per pose variation

For 100 pose variations, expect to pay approximately $0.10-0.30 total.

## Usage in Application

Once cues are generated, they're automatically available in your TypeScript code:

```typescript
import { poseVariationService } from './lib/supabaseService';

const variations = await poseVariationService.getAll();
variations.forEach(variation => {
  if (variation.transitionalCues) {
    console.log(`${variation.name} cues:`, variation.transitionalCues);
    // Output: ["Cue 1", "Cue 2", "Cue 3"]
  }
});
```

## Regenerating Cues

To regenerate cues for specific variations or update existing ones:

1. Update the script to filter variations as needed
2. Or manually update via Supabase:

```sql
-- Clear cues for a specific variation
UPDATE pose_variations 
SET transitional_cues = NULL 
WHERE id = 'variation-id';

-- Then re-run the generation script
```

## Troubleshooting

### "Missing LLM API key" error
- Ensure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` is set in `.env.local`
- Restart your terminal/IDE after adding environment variables

### "Invalid response format" error
- The LLM might return malformed JSON
- Check the API key is valid and has credits
- Try switching to a different model

### Rate limiting errors
- The script includes delays, but if you hit limits:
  - Reduce batch size in the script
  - Add longer delays between requests
  - Use a different API key

### Database connection errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check your Supabase project is active
- Ensure RLS policies allow reading pose_variations

## Future Enhancements

Potential improvements:
- UI to regenerate cues for individual variations
- Manual editing of cues in the admin interface
- Cue templates for common pose types
- Multi-language support for cues

