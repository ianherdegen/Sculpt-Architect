/**
 * LLM Service for generating transitional cues for yoga poses
 * Supports OpenAI and Anthropic Claude APIs
 */

interface LLMConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
}

interface GenerateCuesOptions {
  poseName: string;
  variationName: string;
  config: LLMConfig;
}

/**
 * Generate 3 bottom-to-top transitional cues for a pose variation using LLM
 */
export async function generateTransitionalCues({
  poseName,
  variationName,
  config
}: GenerateCuesOptions): Promise<string[]> {
  const fullPoseName = variationName === 'Default' || variationName === poseName
    ? poseName
    : `${poseName} - ${variationName}`;

  const prompt = `You are an expert yoga instructor. Generate exactly 3 VERY CONCISE transitional cues for guiding students into the yoga pose "${fullPoseName}". 

CRITICAL REQUIREMENTS:
- Each cue MUST follow the structure: "[Action verb] your [body part]"
- Maximum 3 words per cue (verb + "your" + body part)
- Be extremely concise and action-oriented

The cues should be:
1. Bottom-to-top progression (feet/legs → core/torso → arms/shoulders)
2. Format: "[Verb] your [body part]" (e.g., "Ground your feet", "Engage your core", "Lift your arms")
3. Each cue focuses on one body region
4. Use simple, direct action verbs

Return ONLY a JSON array of exactly 3 strings, no other text. Example format:
["Ground your feet", "Engage your core", "Lift your arms"]

Pose: ${fullPoseName}`;

  try {
    if (config.provider === 'openai') {
      return await generateWithOpenAI(prompt, config);
    } else {
      return await generateWithAnthropic(prompt, config);
    }
  } catch (error) {
    console.error(`Error generating cues for ${fullPoseName}:`, error);
    // Fallback to generic cues if LLM fails
    return generateFallbackCues(fullPoseName);
  }
}

/**
 * Generate cues using OpenAI API
 */
async function generateWithOpenAI(
  prompt: string,
  config: LLMConfig
): Promise<string[]> {
  const model = config.model || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that returns only valid JSON arrays. Each cue must follow the format "[Verb] your [body part]" - maximum 3 words.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim();
  
  if (!content) {
    throw new Error('No content returned from OpenAI');
  }

  // Parse JSON array from response (handle markdown code blocks if present)
  const jsonMatch = content.match(/\[.*\]/s);
  const jsonString = jsonMatch ? jsonMatch[0] : content;
  const cues = JSON.parse(jsonString);

  if (!Array.isArray(cues) || cues.length !== 3) {
    throw new Error('Invalid response format: expected array of 3 strings');
  }

  // Ensure cues follow "X your X" format and are concise
  return cues.map((cue: any) => {
    const trimmed = String(cue).trim();
    const words = trimmed.split(/\s+/);
    
    // If cue doesn't follow "X your X" format, try to fix it
    if (words.length >= 3 && words[1]?.toLowerCase() === 'your') {
      // Already in correct format, limit to 3 words max
      return words.slice(0, 3).join(' ');
    }
    
    // If cue is too long or wrong format, take first 3 words
    return words.slice(0, 3).join(' ');
  });
}

/**
 * Generate cues using Anthropic Claude API
 */
async function generateWithAnthropic(
  prompt: string,
  config: LLMConfig
): Promise<string[]> {
  const model = config.model || 'claude-3-haiku-20240307';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text?.trim();

  if (!content) {
    throw new Error('No content returned from Anthropic');
  }

  // Parse JSON array from response (handle markdown code blocks if present)
  const jsonMatch = content.match(/\[.*\]/s);
  const jsonString = jsonMatch ? jsonMatch[0] : content;
  const cues = JSON.parse(jsonString);

  if (!Array.isArray(cues) || cues.length !== 3) {
    throw new Error('Invalid response format: expected array of 3 strings');
  }

  // Ensure cues follow "X your X" format and are concise
  return cues.map((cue: any) => {
    const trimmed = String(cue).trim();
    const words = trimmed.split(/\s+/);
    
    // If cue doesn't follow "X your X" format, try to fix it
    if (words.length >= 3 && words[1]?.toLowerCase() === 'your') {
      // Already in correct format, limit to 3 words max
      return words.slice(0, 3).join(' ');
    }
    
    // If cue is too long or wrong format, take first 3 words
    return words.slice(0, 3).join(' ');
  });
}

/**
 * Fallback generic cues if LLM generation fails
 */
function generateFallbackCues(poseName: string): string[] {
  return [
    `Ground your feet`,
    `Engage your core`,
    `Lift your arms`
  ];
}

/**
 * Batch generate cues for multiple pose variations
 */
export async function batchGenerateCues(
  variations: Array<{ poseName: string; variationName: string }>,
  config: LLMConfig,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();
  const total = variations.length;

  for (let i = 0; i < variations.length; i++) {
    const { poseName, variationName } = variations[i];
    const key = `${poseName}::${variationName}`;
    
    try {
      const cues = await generateTransitionalCues({
        poseName,
        variationName,
        config,
      });
      results.set(key, cues);
      
      // Add small delay to avoid rate limiting
      if (i < variations.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to generate cues for ${key}:`, error);
      results.set(key, generateFallbackCues(poseName));
    }

    onProgress?.(i + 1, total);
  }

  return results;
}

