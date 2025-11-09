import { VercelRequest, VercelResponse } from '@vercel/node';

interface EnhanceLyricsRequest {
  context: {
    prompt?: string;
    genre?: string;
    genres?: string[];
    mood?: string;
    language?: string;
    languages?: string[];
    duration?: number;
    artists?: string[];
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
        console.warn('Gemini lyrics enhancement failed, using fallback:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Fallback enhancement
    const enhanced = enhanceLyricsFallback(context);
    res.status(200).json({ lyrics: enhanced });
    
  } catch (error) {
    console.error('Lyrics enhancement error:', error);
    res.status(500).json({ 
      error: 'Lyrics enhancement failed',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

async function enhanceWithGemini(context: any): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Determine target language from languages array or single language field
  const targetLanguage = Array.isArray(context.languages) && context.languages.length > 0 
    ? context.languages[0] 
    : context.language || 'English';
  
  // Get genres (support both single genre and genres array)
  const genres = Array.isArray(context.genres) && context.genres.length > 0
    ? context.genres
    : context.genre ? [context.genre] : ['Electronic'];
  
  // Get duration for structure guidance
  const duration = context.duration || 180;
  const durationNote = duration < 90 
    ? 'Short track (under 90s): Keep it concise with 1-2 verses and chorus'
    : duration < 180
    ? 'Medium track (90-180s): Standard structure with 2 verses, chorus, and optional bridge'
    : 'Long track (180s+): Full structure with multiple verses, chorus repetition, and bridge';
  
  // Get artists for inspiration
  const artists = Array.isArray(context.artists) && context.artists.length > 0
    ? context.artists.join(', ')
    : 'Not specified';

  const prompt = `${context.existingLyrics ? 'Enhance and improve these lyrics' : 'Create song lyrics'} for this music context:

${context.existingLyrics ? `EXISTING LYRICS:\n${context.existingLyrics}\n\n` : ''}MUSIC CONTEXT:
Prompt: "${context.prompt || 'Create a song'}"
Genres: ${genres.join(', ')}
Mood: ${context.mood || 'Not specified'}
Artists/Inspiration: ${artists}
Duration: ${duration} seconds (${durationNote})
**CRITICAL REQUIREMENT: Generate lyrics ENTIRELY in ${targetLanguage} language**

${context.existingLyrics ? 
  `Improve the existing lyrics by:
- Enhancing rhythm and flow
- Strengthening emotional impact
- Improving rhyme schemes (appropriate for ${targetLanguage})
- Adding more vivid imagery
- Maintaining the original theme and message
- MUST remain in ${targetLanguage} language
- Match the ${genres.join('/')} genre style` :
  `Create original lyrics that:
- Match the ${genres.join('/')} genre and mood
- Have strong rhythm and flow appropriate for ${targetLanguage}
- Include memorable hooks and choruses
- Tell a compelling story or convey emotion
- Use language style appropriate for ${genres.join('/')} music
- **ABSOLUTELY MUST be written entirely in ${targetLanguage} language**
- Match the duration (${duration}s): ${durationNote}
- Draw inspiration from artists like: ${artists}`
}

Structure guidance: ${duration < 90 ? 'Verse - Chorus' : duration < 180 ? 'Verse - Chorus - Verse - Chorus' : 'Verse - Chorus - Verse - Chorus - Bridge - Final Chorus'}
Return only the lyrics text in ${targetLanguage}, properly formatted with sections labeled.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function enhanceLyricsFallback(context: any): string {
  const genre = (context.genre || 'Electronic').toLowerCase();
  const mood = (context.mood || '').toLowerCase();
  const prompt = context.prompt || 'Create a song';
  
  // Determine target language
  const targetLanguage = Array.isArray(context.languages) && context.languages.length > 0 
    ? context.languages[0] 
    : context.language || 'English';
  
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
    return enhanced.join('\n') + `\n\n[Note: Lyrics should be translated to ${targetLanguage}]`;
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
  
  const languageNote = targetLanguage.toLowerCase() !== 'english' 
    ? `\n\n[Note: These lyrics are generated in English. For ${targetLanguage} lyrics, please use the Gemini AI enhancement by providing an API key, or manually translate these lyrics.]`
    : '';
  
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
Forever dancing in the light${languageNote}`;
}