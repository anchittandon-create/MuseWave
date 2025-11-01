import { VercelRequest, VercelResponse } from '@vercel/node';

interface GenerateMusicPlanRequest {
  prompt: string;
  genre: string;
  duration: number;
  mood?: string;
  artistInspiration?: string[];
}

interface MusicPlan {
  structure: {
    section: string;
    startTime: number;
    duration: number;
    description: string;
  }[];
  arrangement: {
    instruments: string[];
    tempo: number;
    key: string;
    timeSignature: string;
  };
  production: {
    effects: string[];
    mixing: string[];
    mastering: string[];
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
    const { prompt, genre, duration, mood, artistInspiration }: GenerateMusicPlanRequest = req.body;
    
    if (!prompt || !genre || !duration) {
      res.status(400).json({ error: 'Missing required fields: prompt, genre, duration' });
      return;
    }
    
    // Try Gemini planning if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const plan = await generatePlanWithGemini({ prompt, genre, duration, mood, artistInspiration });
        res.status(200).json({ plan });
        return;
      } catch (error) {
        console.warn('Gemini plan generation failed, using fallback:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Fallback plan generation
    const plan = generatePlanFallback({ prompt, genre, duration, mood, artistInspiration });
    res.status(200).json({ plan });
    
  } catch (error) {
    console.error('Music plan generation error:', error);
    res.status(500).json({ 
      error: 'Music plan generation failed',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

async function generatePlanWithGemini(request: GenerateMusicPlanRequest): Promise<MusicPlan> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Create a detailed music production plan for:

Prompt: "${request.prompt}"
Genre: ${request.genre}
Duration: ${request.duration} seconds
Mood: ${request.mood || 'Not specified'}
Artist Inspiration: ${request.artistInspiration?.join(', ') || 'None'}

Generate a comprehensive music plan with:

1. STRUCTURE: Break down the song into sections (intro, verse, chorus, bridge, outro, etc.) with precise timing
2. ARRANGEMENT: Specify instruments, tempo (BPM), musical key, and time signature
3. PRODUCTION: List effects, mixing techniques, and mastering approaches

Return ONLY a valid JSON object in this exact format:

{
  "structure": [
    {
      "section": "Intro",
      "startTime": 0,
      "duration": 16,
      "description": "Atmospheric pad intro with filtered drums"
    }
  ],
  "arrangement": {
    "instruments": ["Kick", "Snare", "Hi-hats", "Bass", "Lead Synth", "Pad"],
    "tempo": 128,
    "key": "Am",
    "timeSignature": "4/4"
  },
  "production": {
    "effects": ["Reverb", "Delay", "Filter", "Compression"],
    "mixing": ["EQ", "Sidechain", "Stereo Width"],
    "mastering": ["Limiter", "EQ", "Stereo Enhancement"]
  }
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

function generatePlanFallback(request: GenerateMusicPlanRequest): MusicPlan {
  const { genre, duration } = request;
  
  // Genre-specific defaults
  const genreDefaults: Record<string, any> = {
    'House': { tempo: 128, key: 'Am', instruments: ['Kick', 'Clap', 'Hi-hats', 'Bass', 'Piano', 'Vocal Chops'] },
    'Techno': { tempo: 132, key: 'Gm', instruments: ['Kick', 'Snare', 'Hi-hats', 'Bass', 'Lead', 'Arp'] },
    'Dubstep': { tempo: 140, key: 'Em', instruments: ['Kick', 'Snare', 'Hi-hats', 'Sub Bass', 'Lead', 'FX'] },
    'Ambient': { tempo: 80, key: 'F', instruments: ['Pad', 'Texture', 'Drone', 'Field Recording', 'Bells'] },
    'Trap': { tempo: 140, key: 'Cm', instruments: ['808', 'Snare', 'Hi-hats', 'Bass', 'Lead', 'Vocal'] },
    'Trance': { tempo: 138, key: 'A', instruments: ['Kick', 'Bass', 'Lead', 'Arp', 'Pad', 'FX'] }
  };
  
  const defaults = genreDefaults[genre] || genreDefaults['House'];
  
  // Generate structure based on duration
  const structure = [];
  let currentTime = 0;
  
  if (duration >= 30) {
    structure.push({ section: 'Intro', startTime: currentTime, duration: 16, description: 'Opening atmospheric section' });
    currentTime += 16;
  }
  
  if (duration >= 60) {
    structure.push({ section: 'Build Up', startTime: currentTime, duration: 16, description: 'Energy building section' });
    currentTime += 16;
    structure.push({ section: 'Drop', startTime: currentTime, duration: 32, description: 'Main energy section' });
    currentTime += 32;
  } else {
    structure.push({ section: 'Main', startTime: currentTime, duration: Math.min(32, duration - currentTime), description: 'Main section' });
    currentTime += Math.min(32, duration - currentTime);
  }
  
  if (duration >= 90) {
    structure.push({ section: 'Breakdown', startTime: currentTime, duration: 16, description: 'Reduced energy section' });
    currentTime += 16;
    structure.push({ section: 'Build Up 2', startTime: currentTime, duration: 16, description: 'Second build section' });
    currentTime += 16;
    structure.push({ section: 'Drop 2', startTime: currentTime, duration: 32, description: 'Final energy section' });
    currentTime += 32;
  }
  
  if (currentTime < duration) {
    structure.push({ 
      section: 'Outro', 
      startTime: currentTime, 
      duration: duration - currentTime, 
      description: 'Closing section' 
    });
  }
  
  return {
    structure,
    arrangement: {
      instruments: defaults.instruments,
      tempo: defaults.tempo,
      key: defaults.key,
      timeSignature: '4/4'
    },
    production: {
      effects: ['Reverb', 'Delay', 'Compression', 'EQ'],
      mixing: ['Volume Balance', 'Panning', 'EQ', 'Compression'],
      mastering: ['EQ', 'Compression', 'Limiter', 'Stereo Enhancement']
    }
  };
}