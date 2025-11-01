import { VercelRequest, VercelResponse } from '@vercel/node';

interface EnhanceLyricsRequest {
  context: {
    prompt?: string;
    genre?: string;
    mood?: string;
    language?: string;
    existingLyrics?: string;
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
    const { context }: EnhanceLyricsRequest = req.body;
    
    // Try Gemini enhancement if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const enhanced = await enhanceWithGemini(context);
        res.status(200).json({ lyrics: enhanced });
        return;
      } catch (error) {
        console.warn('Gemini lyrics enhancement failed, using fallback:', error.message);
      }
    }
    
    // Fallback enhancement
    const enhanced = enhanceLyricsFallback(context);
    res.status(200).json({ lyrics: enhanced });
    
  } catch (error) {
    console.error('Lyrics enhancement error:', error);
    res.status(500).json({ 
      error: 'Lyrics enhancement failed',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function enhanceWithGemini(context: any): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `${context.existingLyrics ? 'Enhance and improve these lyrics' : 'Create song lyrics'} for this music context:

${context.existingLyrics ? `EXISTING LYRICS:\n${context.existingLyrics}\n\n` : ''}MUSIC CONTEXT:
Prompt: "${context.prompt || 'Create a song'}"
Genre: ${context.genre || 'Electronic'}
Mood: ${context.mood || 'Not specified'}
Language: ${context.language || 'English'}

${context.existingLyrics ? 
  'Improve the existing lyrics by:\n- Enhancing rhythm and flow\n- Strengthening emotional impact\n- Improving rhyme schemes\n- Adding more vivid imagery\n- Maintaining the original theme and message' :
  'Create original lyrics that:\n- Match the musical genre and mood\n- Have strong rhythm and flow\n- Include memorable hooks and choruses\n- Tell a compelling story or convey emotion\n- Use appropriate language and style'
}

Structure: Verse - Chorus - Verse - Chorus - Bridge - Chorus
Return only the lyrics text, properly formatted with sections labeled.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function enhanceLyricsFallback(context: any): string {
  const genre = (context.genre || 'Electronic').toLowerCase();
  const mood = (context.mood || '').toLowerCase();
  const prompt = context.prompt || 'Create a song';
  
  // If we have existing lyrics, enhance them minimally
  if (context.existingLyrics) {
    const lines = context.existingLyrics.split('\n').filter((line: string) => line.trim());
    const enhanced = lines.map((line: string) => {
      if (line.includes('Verse') || line.includes('Chorus') || line.includes('Bridge')) {
        return line; // Keep section headers
      }
      // Add some enhancement words
      if (Math.random() > 0.7) {
        const enhanceWords = ['bright', 'deep', 'electric', 'flowing', 'dancing', 'soaring'];
        const word = enhanceWords[Math.floor(Math.random() * enhanceWords.length)];
        return line + ` (${word})`;
      }
      return line;
    });
    return enhanced.join('\n');
  }
  
  // Generate new lyrics based on genre and mood
  const themes = {
    house: ['dancing', 'nightlife', 'freedom', 'energy', 'unity'],
    techno: ['technology', 'future', 'rhythm', 'mechanical', 'pulse'],
    ambient: ['peace', 'nature', 'meditation', 'space', 'time'],
    dubstep: ['power', 'bass', 'intensity', 'drop', 'energy'],
    trance: ['journey', 'transcendence', 'elevation', 'dreams', 'escape'],
    trap: ['hustle', 'success', 'struggle', 'street', 'ambition']
  };
  
  const genreThemes = themes[genre as keyof typeof themes] || themes.house;
  const theme = genreThemes[Math.floor(Math.random() * genreThemes.length)];
  
  const moodAdjectives = {
    happy: ['bright', 'joyful', 'uplifting', 'energetic', 'positive'],
    sad: ['melancholy', 'emotional', 'deep', 'reflective', 'moving'],
    dark: ['mysterious', 'intense', 'powerful', 'dramatic', 'haunting'],
    chill: ['relaxed', 'smooth', 'flowing', 'peaceful', 'gentle']
  };
  
  let adjectives = ['electric', 'rhythmic', 'melodic'];
  for (const [moodKey, moodAdjs] of Object.entries(moodAdjectives)) {
    if (mood.includes(moodKey)) {
      adjectives = moodAdjs;
      break;
    }
  }
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  
  return `Verse 1:
In the ${adj} night we find our way
Through the rhythm that will make us stay
${theme.charAt(0).toUpperCase() + theme.slice(1)} calling from the sound
Lost in music, we are found

Chorus:
Feel the beat inside your soul
Let the ${genre} take control
We are dancing through the night
In this ${adj} ${theme} light

Verse 2:
Every note will set us free
In this sonic symphony
${prompt.includes('love') ? 'Hearts connecting' : 'Minds connecting'} through the bass
In this musical embrace

Chorus:
Feel the beat inside your soul
Let the ${genre} take control
We are dancing through the night
In this ${adj} ${theme} light

Bridge:
When the world gets too loud
We find peace in this crowd
Music speaks what words cannot
In this ${adj} ${theme} spot

Final Chorus:
Feel the beat inside your soul
Let the ${genre} take control
We are dancing through the night
In this ${adj} ${theme} light
Forever dancing in the light`;
}