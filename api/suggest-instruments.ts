import { VercelRequest, VercelResponse } from '@vercel/node';

interface SuggestInstrumentsRequest {
  context: {
    prompt?: string;
    genres?: string[];
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
    const { context }: SuggestInstrumentsRequest = req.body;
    
    // Try Gemini suggestions if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const suggestions = await suggestWithGemini(context);
        res.status(200).json({ instruments: suggestions });
        return;
      } catch (error) {
        console.warn('Gemini instrument suggestion failed, using fallback:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Fallback suggestions
    const suggestions = suggestInstrumentsFallback(context);
    res.status(200).json({ instruments: suggestions });
    
  } catch (error) {
    console.error('Instrument suggestion error:', error);
    res.status(500).json({ 
      error: 'Instrument suggestion failed',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

async function suggestWithGemini(context: any): Promise<string[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const prompt = `Suggest 4-5 musical instruments/sounds for this music creation context:

Prompt: "${context.prompt || 'Create a track'}"
Genres: ${context.genres?.join(', ') || 'Electronic'}
Mood: ${context.mood || 'Not specified'}
Artist inspiration: ${context.artistInspiration?.join(', ') || 'None'}

Suggest instruments that would create the perfect sonic palette. Consider:
- Genre-appropriate instruments and synthesizers
- Both traditional and electronic/digital instruments
- Unique textures and sound design elements
- Instruments that complement each other harmonically
- Modern production techniques and tools

Return only a JSON array of instrument/sound names, like: ["Analog Moog", "808 Drums", "Vocal Chops", "Reverb Pad"]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON array from response
  const jsonMatch = text.match(/\[.*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON array found in Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

function suggestInstrumentsFallback(context: any): string[] {
  const instrumentCategories = {
    synthesis: [
      'Analog Moog', 'FM Synthesis', 'Wavetable Synth', 'Granular Pad',
      'Modular Rack', 'Vintage Prophet', 'Digital Polysynth', 'Acid Bass'
    ],
    drums: [
      '808 Drums', 'TR-909 Kit', 'Acoustic Drums', 'Trap Kit',
      'Vintage Breaks', 'Live Percussion', 'Electronic Beats', 'Ethnic Drums'
    ],
    texture: [
      'Vocal Chops', 'Ambient Textures', 'Field Recordings', 'Vinyl Crackle',
      'Glitch Effects', 'Reverse Swells', 'White Noise', 'Atmospheric Pads'
    ],
    melodic: [
      'Electric Piano', 'Acoustic Guitar', 'String Section', 'Brass Ensemble',
      'Harmonica', 'Saxophone', 'Violin Solo', 'Music Box'
    ],
    bass: [
      'Sub Bass', 'Acid Bass', 'Fretless Bass', 'Vintage Bass',
      'Reese Bass', 'Distorted Bass', 'Funk Bass', 'Deep House Bass'
    ]
  };
  
  const allInstruments = Object.values(instrumentCategories).flat();
  const instrumentScores: Record<string, number> = {};
  
  allInstruments.forEach(instrument => {
    let score = 0;
    const instrumentLower = instrument.toLowerCase();
    
    // Genre-based scoring
    const genres = (context.genres || []).map((g: string) => g.toLowerCase());
    
    if (genres.some((g: string) => ['house', 'techno', 'electronic'].includes(g))) {
      if (instrumentCategories.synthesis.concat(instrumentCategories.drums).some(i => i.toLowerCase() === instrumentLower)) {
        score += 3;
      }
    }
    
    if (genres.some((g: string) => ['dubstep', 'bass', 'trap'].includes(g))) {
      if ([...instrumentCategories.bass, ...instrumentCategories.drums].some(i => i.toLowerCase() === instrumentLower)) {
        score += 3;
      }
    }
    
    if (genres.some((g: string) => ['ambient', 'downtempo', 'chill'].includes(g))) {
      if ([...instrumentCategories.texture, ...instrumentCategories.melodic].some(i => i.toLowerCase() === instrumentLower)) {
        score += 3;
      }
    }
    
    if (genres.some((g: string) => ['trance', 'progressive'].includes(g))) {
      if ([...instrumentCategories.synthesis, 'String Section', 'Brass Ensemble'].some(i => i.toLowerCase() === instrumentLower)) {
        score += 2;
      }
    }
    
    // Mood-based scoring
    const mood = (context.mood || '').toLowerCase();
    if (mood.includes('dark') || mood.includes('aggressive')) {
      if (['Distorted Bass', 'Glitch Effects', '808 Drums', 'Acid Bass'].some(i => i.toLowerCase() === instrumentLower)) {
        score += 1;
      }
    }
    
    if (mood.includes('peaceful') || mood.includes('calm')) {
      if (['Ambient Textures', 'String Section', 'Electric Piano', 'Atmospheric Pads'].some(i => i.toLowerCase() === instrumentLower)) {
        score += 1;
      }
    }
    
    if (mood.includes('energetic') || mood.includes('uplifting')) {
      if (['Brass Ensemble', 'TR-909 Kit', 'Analog Moog', 'Vocal Chops'].some(i => i.toLowerCase() === instrumentLower)) {
        score += 1;
      }
    }
    
    // Prompt keyword scoring
    const prompt = (context.prompt || '').toLowerCase();
    if (prompt.includes('vintage') || prompt.includes('retro')) {
      if (['Vintage Prophet', 'TR-909 Kit', 'Vintage Bass', 'Vinyl Crackle'].some(i => i.toLowerCase() === instrumentLower)) {
        score += 1;
      }
    }
    
    if (prompt.includes('orchestral') || prompt.includes('cinematic')) {
      if (['String Section', 'Brass Ensemble', 'Violin Solo'].some(i => i.toLowerCase() === instrumentLower)) {
        score += 2;
      }
    }
    
    if (prompt.includes('vocal') || prompt.includes('singing')) {
      if (['Vocal Chops'].includes(instrument)) {
        score += 2;
      }
    }
    
    // Add random factor for diversity
    score += Math.random();
    instrumentScores[instrument] = score;
  });
  
  // Sort by score and return top 4, ensuring diversity across categories
  const sorted = allInstruments.sort((a, b) => instrumentScores[b] - instrumentScores[a]);
  
  // Ensure we get instruments from different categories
  const result: string[] = [];
  const usedCategories = new Set<string>();
  
  for (const instrument of sorted) {
    if (result.length >= 4) break;
    
    // Find which category this instrument belongs to
    const category = Object.entries(instrumentCategories).find(([_, instruments]) => 
      instruments.includes(instrument)
    )?.[0];
    
    // Add instrument if we haven't used this category yet, or if we need to fill slots
    if (!category || !usedCategories.has(category) || result.length < 2) {
      result.push(instrument);
      if (category) usedCategories.add(category);
    }
  }
  
  // Fill remaining slots if needed
  while (result.length < 4 && result.length < sorted.length) {
    const next = sorted.find(i => !result.includes(i));
    if (next) result.push(next);
    else break;
  }
  
  return result;
}