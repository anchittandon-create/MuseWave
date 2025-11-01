import { VercelRequest, VercelResponse } from '@vercel/node';

interface SuggestGenresRequest {
  context: {
    prompt?: string;
    existingGenres?: string[];
    mood?: string;
    artistInspiration?: string[];
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
      // New format: { context: { ... } }
      context = body.context;
    } else {
      // Legacy format: direct properties
      context = {
        prompt: body.prompt,
        existingGenres: body.existingGenres,
        mood: body.mood,
        artistInspiration: body.artistInspiration
      };
    }
    
    // Try Gemini suggestions if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const suggestions = await suggestWithGemini(context);
        res.status(200).json({ genres: suggestions });
        return;
      } catch (error) {
        console.warn('Gemini genre suggestion failed, using fallback:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Fallback suggestions
    const suggestions = suggestGenresFallback(context);
    res.status(200).json({ genres: suggestions });
    
  } catch (error) {
    console.error('Genre suggestion error:', error);
    res.status(500).json({ 
      error: 'Genre suggestion failed',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

async function suggestWithGemini(context: any): Promise<string[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Suggest 3-5 music genres for this music creation context:

Prompt: "${context.prompt || 'Create a track'}"
Current genres: ${context.existingGenres?.join(', ') || 'None'}
Mood: ${context.mood || 'Not specified'}
Artist inspiration: ${context.artistInspiration?.join(', ') || 'None'}

Suggest genres that would complement the prompt and create interesting musical diversity. Focus on:
- Modern genres and subgenres
- Electronic music styles
- Fusion genres
- Avoid duplicating existing genres

Return only a JSON array of genre names, like: ["Future Bass", "Ambient Techno", "Downtempo"]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON array from response
  const jsonMatch = text.match(/\[.*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON array found in Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

function suggestGenresFallback(context: any): string[] {
  const allGenres = [
    'Techno', 'House', 'Ambient', 'Drum and Bass', 'Dubstep', 'Trance',
    'Future Bass', 'Trap', 'Lo-fi Hip Hop', 'Synthwave', 'Downtempo',
    'Progressive House', 'Deep House', 'Minimal Techno', 'Garage',
    'Breakbeat', 'IDM', 'Liquid DnB', 'Hardstyle', 'Psytrance',
    'Chillwave', 'Vaporwave', 'Tropical House', 'UK Garage', 'Jersey Club'
  ];
  
  const existing = context.existingGenres || [];
  const available = allGenres.filter(genre => !existing.includes(genre));
  
  // Simple scoring based on prompt keywords
  const prompt = (context.prompt || '').toLowerCase();
  const genreScores: Record<string, number> = {};
  
  available.forEach(genre => {
    let score = 0;
    const genreLower = genre.toLowerCase();
    
    // Score based on prompt keywords
    if (prompt.includes('electronic') || prompt.includes('synth')) {
      if (['techno', 'house', 'synthwave', 'trance'].some(g => genreLower.includes(g))) score += 2;
    }
    if (prompt.includes('chill') || prompt.includes('relax')) {
      if (['ambient', 'downtempo', 'lo-fi', 'chillwave'].some(g => genreLower.includes(g))) score += 2;
    }
    if (prompt.includes('bass') || prompt.includes('heavy')) {
      if (['dubstep', 'drum and bass', 'future bass', 'trap'].some(g => genreLower.includes(g))) score += 2;
    }
    if (prompt.includes('dance') || prompt.includes('club')) {
      if (['house', 'techno', 'garage', 'hardstyle'].some(g => genreLower.includes(g))) score += 2;
    }
    
    // Add random factor for diversity
    score += Math.random();
    genreScores[genre] = score;
  });
  
  // Sort by score and return top 4
  const sorted = available.sort((a, b) => genreScores[b] - genreScores[a]);
  return sorted.slice(0, 4);
}