import { VercelRequest, VercelResponse } from '@vercel/node';

interface SuggestRequest {
  field: 'genres' | 'artistInspiration' | 'vocalLanguages';
  input: string;
  context: {
    musicPrompt?: string;
    genres?: string[];
    artistInspiration?: string[];
    vocalLanguages?: string[];
    lyrics?: string;
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
    const { field, input, context } = req.body as SuggestRequest;

    // Validate input
    if (!field || !input || typeof input !== 'string') {
      res.status(400).json({ error: 'Invalid request: field and input are required' });
      return;
    }

    // Check if Hindi/regional language is selected - disable artist suggestions
    if (field === 'artistInspiration') {
      const languages = context.vocalLanguages || [];
      const regionalLanguages = ['hindi', 'tamil', 'telugu', 'bengali', 'marathi', 'punjabi', 'gujarati', 'kannada', 'malayalam'];
      
      const hasRegionalLanguage = languages.some(lang => 
        regionalLanguages.includes(lang.toLowerCase())
      );
      
      if (hasRegionalLanguage) {
        // Return empty suggestions for regional languages
        res.status(200).json({
          field,
          input,
          suggestions: [],
          cached: false,
          timestamp: new Date().toISOString(),
          message: 'Artist suggestions disabled for regional languages'
        });
        return;
      }
    }

    let suggestions: string[] = [];

    // Try ML-powered suggestions first (if backend-complete is available)
    if (process.env.USE_ML_SUGGESTIONS === 'true') {
      try {
        suggestions = await fetchMLSuggestions(field, input, context);
      } catch (error) {
        console.warn('[ML Suggestions] Failed, falling back to AI:', error instanceof Error ? error.message : String(error));
      }
    }

    // Fallback to Gemini AI if ML failed or not enabled
    if (suggestions.length === 0 && (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)) {
      try {
        suggestions = await fetchGeminiSuggestions(field, input, context);
      } catch (error) {
        console.warn('[Gemini] Failed, using fallback:', error instanceof Error ? error.message : String(error));
      }
    }

    // Final fallback to simple keyword matching
    if (suggestions.length === 0) {
      suggestions = getFallbackSuggestions(field, input, context);
    }

    // Filter out already selected items
    const currentValues = context[field] || [];
    const filteredSuggestions = suggestions
      .filter(s => !currentValues.includes(s))
      .slice(0, 5); // Max 5 suggestions

    res.status(200).json({
      field,
      input,
      suggestions: filteredSuggestions,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Suggest API] Error:', error);
    res.status(500).json({ 
      error: 'Suggestion generation failed',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

/**
 * Fetch ML-powered suggestions from backend-complete (sentence-transformers)
 */
async function fetchMLSuggestions(
  field: string,
  input: string,
  context: any
): Promise<string[]> {
  const backendUrl = process.env.BACKEND_ML_URL || 'http://localhost:4001';
  
  const response = await fetch(`${backendUrl}/api/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field, input, context }),
    signal: AbortSignal.timeout(5000), // 5 second timeout
  });

  if (!response.ok) {
    throw new Error(`ML backend returned ${response.status}`);
  }

  const data = await response.json();
  return data.suggestions || [];
}

/**
 * Fetch AI suggestions using Gemini
 */
async function fetchGeminiSuggestions(
  field: string,
  input: string,
  context: any
): Promise<string[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let prompt = '';

  if (field === 'genres') {
    prompt = `Suggest 5 music genres that match the search term "${input}" and complement this music context:

Music Prompt: "${context.musicPrompt || 'Not specified'}"
Current Genres: ${context.genres?.join(', ') || 'None'}
Artists: ${context.artistInspiration?.join(', ') || 'None'}

Requirements:
- Must be related to the input term "${input}"
- Focus on electronic, modern, and fusion genres
- Avoid duplicating existing genres
- Be creative and diverse

Return ONLY a JSON array of genre names, like: ["Future Bass", "Ambient Techno", "Downtempo"]`;
  } else if (field === 'artistInspiration') {
    prompt = `Suggest 5 music artists that match the search term "${input}" and fit this music context:

Music Prompt: "${context.musicPrompt || 'Not specified'}"
Genres: ${context.genres?.join(', ') || 'Electronic'}
Current Artists: ${context.artistInspiration?.join(', ') || 'None'}
Languages: ${context.vocalLanguages?.join(', ') || 'English'}

Requirements:
- Must be related to the input term "${input}"
- Match the genres and style
- Include both mainstream and underground artists
- Avoid duplicating existing artists

Return ONLY a JSON array of artist names, like: ["Brian Eno", "Aphex Twin", "Boards of Canada"]`;
  } else if (field === 'vocalLanguages') {
    prompt = `Suggest 5 vocal languages that match the search term "${input}" and fit this music context:

Music Prompt: "${context.musicPrompt || 'Not specified'}"
Genres: ${context.genres?.join(', ') || 'Electronic'}
Artists: ${context.artistInspiration?.join(', ') || 'None'}
Current Languages: ${context.vocalLanguages?.join(', ') || 'None'}

Requirements:
- Must be related to the input term "${input}"
- Consider global and regional languages
- Match the music style and cultural context
- Avoid duplicating existing languages

Return ONLY a JSON array of language names, like: ["English", "Spanish", "Japanese"]`;
  }

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON array from response
  const jsonMatch = text.match(/\[.*?\]/s);
  if (!jsonMatch) {
    throw new Error('No valid JSON array found in Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

/**
 * Simple fallback suggestions based on keyword matching
 */
function getFallbackSuggestions(
  field: string,
  input: string,
  context: any
): string[] {
  const inputLower = input.toLowerCase();

  if (field === 'genres') {
    const allGenres = [
      'Techno', 'House', 'Ambient', 'Drum and Bass', 'Dubstep', 'Trance',
      'Future Bass', 'Trap', 'Lo-fi Hip Hop', 'Synthwave', 'Downtempo',
      'Progressive House', 'Deep House', 'Minimal Techno', 'Garage',
      'Breakbeat', 'IDM', 'Liquid DnB', 'Hardstyle', 'Psytrance',
      'Chillwave', 'Vaporwave', 'Tropical House', 'UK Garage', 'Jersey Club',
      'Cinematic', 'Orchestral', 'Electronic', 'Pop', 'Rock', 'Jazz',
      'Classical', 'Folk', 'Indie', 'Alternative', 'Experimental'
    ];

    return allGenres
      .filter(genre => genre.toLowerCase().includes(inputLower))
      .slice(0, 5);
  } else if (field === 'artistInspiration') {
    const allArtists = [
      'Brian Eno', 'Aphex Twin', 'Boards of Canada', 'Daft Punk', 'Deadmau5',
      'Jon Hopkins', 'Nils Frahm', 'Ólafur Arnalds', 'Max Richter', 'Hans Zimmer',
      'Four Tet', 'Caribou', 'Moderat', 'Bonobo', 'Tycho',
      'The Chemical Brothers', 'Underworld', 'Massive Attack', 'Portishead',
      'Flying Lotus', 'Jamie xx', 'Nicolas Jaar', 'Ben Böhmer', 'Lane 8'
    ];

    return allArtists
      .filter(artist => artist.toLowerCase().includes(inputLower))
      .slice(0, 5);
  } else if (field === 'vocalLanguages') {
    const allLanguages = [
      'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
      'Japanese', 'Korean', 'Mandarin', 'Cantonese', 'Arabic', 'Hebrew',
      'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Punjabi',
      'Russian', 'Polish', 'Turkish', 'Greek', 'Swedish', 'Dutch',
      'Instrumental', 'Vocoder', 'Wordless Vocals'
    ];

    return allLanguages
      .filter(lang => lang.toLowerCase().includes(inputLower))
      .slice(0, 5);
  }

  return [];
}
