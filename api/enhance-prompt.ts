import { VercelRequest, VercelResponse } from '@vercel/node';

interface EnhancePromptRequest {
  context: {
    prompt?: string;
    genres?: string[];
    artistInspiration?: string[];
    mood?: string;
  };
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
    const body = req.body;
    
    // Handle both request formats for backward compatibility
    let context;
    if (body.context) {
      // New format: { context: { prompt: "..." } }
      context = body.context;
    } else if (body.prompt) {
      // Legacy format: { prompt: "..." }
      context = { prompt: body.prompt };
    } else {
      // Extract from direct properties
      context = {
        prompt: body.prompt || 'Create a track',
        genres: body.genres,
        artistInspiration: body.artistInspiration,
        mood: body.mood
      };
    }
    
    // Try Gemini enhancement if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const enhancedPrompt = await enhanceWithGemini(context);
        res.status(200).json({ prompt: enhancedPrompt });
        return;
      } catch (error) {
        console.warn('Gemini enhancement failed, using fallback:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Fallback enhancement
    const enhancedPrompt = enhancePromptFallback(context);
    res.status(200).json({ prompt: enhancedPrompt });
    
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    res.status(500).json({ 
      error: 'Enhancement failed',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

async function enhanceWithGemini(context: any): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const prompt = `Enhance this music creation prompt to be more vivid and specific:

Current prompt: "${context.prompt || 'Create a track'}"
Genres: ${context.genres?.join(', ') || 'Electronic'}
Artist inspiration: ${context.artistInspiration?.join(', ') || 'None'}
Mood: ${context.mood || 'Energetic'}

Create a single enhanced prompt (1-2 sentences) that's creative, specific, and inspiring for music generation. Focus on:
- Emotional atmosphere
- Musical elements (rhythm, melody, harmony)
- Production style
- Sonic textures

Return only the enhanced prompt, no explanation.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function enhancePromptFallback(context: any): string {
  const basePrompt = context.prompt || 'Create a track';
  const genres = context.genres || ['Electronic'];
  const mood = context.mood || 'energetic';
  
  const moodWords = {
    energetic: ['driving', 'pulsating', 'dynamic', 'powerful'],
    relaxed: ['smooth', 'flowing', 'mellow', 'dreamy'],
    dark: ['atmospheric', 'brooding', 'mysterious', 'intense'],
    uplifting: ['soaring', 'bright', 'euphoric', 'inspiring'],
    ambient: ['ethereal', 'spacious', 'textural', 'immersive']
  };
  
  const productionWords = ['crisp', 'warm', 'punchy', 'lush', 'tight', 'expansive'];
  const rhythmWords = ['groove', 'pulse', 'beat', 'rhythm', 'flow'];
  
  const selectedMoodWords = moodWords[mood.toLowerCase() as keyof typeof moodWords] || moodWords.energetic;
  const moodWord = selectedMoodWords[Math.floor(Math.random() * selectedMoodWords.length)];
  const productionWord = productionWords[Math.floor(Math.random() * productionWords.length)];
  const rhythmWord = rhythmWords[Math.floor(Math.random() * rhythmWords.length)];
  
  const genreText = genres.length > 1 ? `${genres.slice(0, -1).join(', ')} and ${genres.slice(-1)}` : genres[0];
  
  return `${basePrompt} - A ${moodWord} ${genreText} track with ${productionWord} production and an infectious ${rhythmWord} that builds emotional depth through dynamic layering.`;
}