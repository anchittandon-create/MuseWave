import { VercelRequest, VercelResponse } from '@vercel/node';
import { generateMusic } from '../lib/musicGenerator';
import { validateInput } from '../lib/validation';

interface MusicGenerationRequest {
  musicPrompt: string;
  genres: string[];
  durationSec: number;
  artistInspiration?: string[];
  lyrics?: string;
  vocalLanguages?: string[];
  generateVideo?: boolean;
  videoStyles?: ("Lyric Video" | "Official Music Video" | "Abstract Visualizer")[];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const input: MusicGenerationRequest = req.body;
    // Validate input
    const validation = validateInput(input);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    // Generate music
    const result = await generateMusic(input);

    // Usage tracking (post-execution)
    // Assume userId is passed in req.headers["x-user-id"] or fallback to "anonymous"
    const userId = (req.headers["x-user-id"] as string) || "anonymous";
    // Import usageTracker dynamically to avoid top-level import in browser
    const { usageTracker, RATE_LIMIT_TIERS } = await import("../lib/usageTracking");
    usageTracker.trackAudioGeneration(userId, input.durationSec);
    if (input.generateVideo) {
      usageTracker.trackVideoGeneration(userId, input.durationSec);
    }

    // Enforce quota only after execution
    const tier = RATE_LIMIT_TIERS["free"];
    if (usageTracker.isOverLimit(userId, tier.dailyBudgetINR)) {
      // Optionally, add a flag to the response
      res.status(200).json({ ...result, quotaExceeded: true, quotaMessage: `Quota exceeded for user ${userId}. Further generations may be blocked.` });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Music generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}