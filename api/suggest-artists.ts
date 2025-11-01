import { VercelRequest, VercelResponse } from '@vercel/node';

interface SuggestArtistsRequest {
  context: {
    prompt?: string;
    genres?: string[];
    mood?: string;
    existingArtists?: string[];
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
        genres: body.genres,
        mood: body.mood,
        existingArtists: body.existingArtists
      };
    }
    
    // Try Gemini suggestions if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const suggestions = await suggestWithGemini(context);
        res.status(200).json({ artists: suggestions });
        return;
      } catch (error) {
        console.warn('Gemini artist suggestion failed, using fallback:', error.message);
      }
    }
    
    // Fallback suggestions
    const suggestions = suggestArtistsFallback(context);
    res.status(200).json({ artists: suggestions });
    
  } catch (error) {
    console.error('Artist suggestion error:', error);
    res.status(500).json({ 
      error: 'Artist suggestion failed',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function suggestWithGemini(context: any): Promise<string[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Suggest 3-5 music artists/producers for this music creation context:

Prompt: "${context.prompt || 'Create a track'}"
Genres: ${context.genres?.join(', ') || 'Electronic'}
Mood: ${context.mood || 'Not specified'}
Current artists: ${context.existingArtists?.join(', ') || 'None'}

Suggest artists that would inspire the creation of similar music. Focus on:
- Contemporary electronic producers
- Artists known for the specified genres
- Innovative sound designers
- Both established and emerging artists
- Avoid duplicating existing artists

Return only a JSON array of artist names, like: ["Skrillex", "Porter Robinson", "Madeon"]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON array from response
  const jsonMatch = text.match(/\[.*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON array found in Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

function suggestArtistsFallback(context: any): string[] {
  const allArtists = [
    'Skrillex', 'Porter Robinson', 'Madeon', 'Flume', 'ODESZA', 'Disclosure',
    'Burial', 'Four Tet', 'Aphex Twin', 'Boards of Canada', 'Autechre',
    'Deadmau5', 'Eric Prydz', 'Above & Beyond', 'Armin van Buuren',
    'Calvin Harris', 'David Guetta', 'Martin Garrix', 'Tiësto',
    'Diplo', 'Major Lazer', 'RL Grime', 'Baauer', 'What So Not',
    'Bonobo', 'Emancipator', 'Tycho', 'Kiasmos', 'Nils Frahm',
    'Jon Hopkins', 'Max Richter', 'Ólafur Arnalds', 'Rival Consoles',
    'Fred again..', 'Anyma', 'Bicep', 'Peggy Gou', 'Charlotte de Witte',
    'Amelie Lens', 'Tale of Us', 'Stephan Bodzin', 'Boris Brejcha',
    'Fisher', 'Chris Lake', 'Walker & Royce', 'Claude VonStroke'
  ];
  
  const existing = context.existingArtists || [];
  const available = allArtists.filter(artist => !existing.includes(artist));
  
  // Genre-based scoring
  const genres = (context.genres || []).map((g: string) => g.toLowerCase());
  const artistScores: Record<string, number> = {};
  
  available.forEach(artist => {
    let score = 0;
    const artistLower = artist.toLowerCase();
    
    // Score based on genre preferences
    if (genres.some(g => ['house', 'techno', 'electronic'].includes(g))) {
      if (['deadmau5', 'eric prydz', 'calvin harris', 'disclosure'].some(a => artistLower.includes(a))) score += 2;
    }
    if (genres.some(g => ['dubstep', 'bass', 'trap'].includes(g))) {
      if (['skrillex', 'flume', 'rl grime', 'baauer'].some(a => artistLower.includes(a))) score += 2;
    }
    if (genres.some(g => ['ambient', 'downtempo', 'chill'].includes(g))) {
      if (['bonobo', 'tycho', 'boards of canada', 'jon hopkins'].some(a => artistLower.includes(a))) score += 2;
    }
    if (genres.some(g => ['trance', 'progressive'].includes(g))) {
      if (['above & beyond', 'armin van buuren', 'eric prydz'].some(a => artistLower.includes(a))) score += 2;
    }
    
    // Prompt keyword scoring
    const prompt = (context.prompt || '').toLowerCase();
    if (prompt.includes('heavy') || prompt.includes('aggressive')) {
      if (['skrillex', 'charlotte de witte', 'amelie lens'].some(a => artistLower.includes(a))) score += 1;
    }
    if (prompt.includes('chill') || prompt.includes('relax')) {
      if (['bonobo', 'tycho', 'emancipator', 'four tet'].some(a => artistLower.includes(a))) score += 1;
    }
    if (prompt.includes('dance') || prompt.includes('club')) {
      if (['fisher', 'chris lake', 'peggy gou', 'disclosure'].some(a => artistLower.includes(a))) score += 1;
    }
    
    // Add random factor for diversity
    score += Math.random();
    artistScores[artist] = score;
  });
  
  // Sort by score and return top 4
  const sorted = available.sort((a, b) => artistScores[b] - artistScores[a]);
  return sorted.slice(0, 4);
}