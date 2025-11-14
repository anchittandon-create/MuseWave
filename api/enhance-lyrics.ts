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
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  // Get all target languages from languages array
  const languages = Array.isArray(context.languages) && context.languages.length > 0 
    ? context.languages 
    : (context.language ? [context.language] : ['English']);
  
  const isMultiLanguage = languages.length > 1;
  
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

  // Create multi-language instruction
  const languageInstructions = isMultiLanguage
    ? `**CRITICAL MULTI-LANGUAGE REQUIREMENT:**
- The user has selected ${languages.length} languages: ${languages.join(', ')}
- You MUST use ALL of these languages in the lyrics
- Use one of these approaches:
  1. VERSE-BY-VERSE: Write each verse in a different language (Verse 1 in ${languages[0]}, Verse 2 in ${languages[1]}, etc.)
  2. CODE-SWITCHING: Mix languages naturally within verses (like real multilingual songs)
  3. PARALLEL STRUCTURE: Repeat key lines or chorus in each language
- The chorus can be in the primary language (${languages[0]}) or mix all languages
- Make it feel natural and musical, not forced or awkward
- Label each section clearly (e.g., "Verse 1 (${languages[0]}):", "Verse 2 (${languages[1]}):")

Example structure for ${languages.join('/')}:
Verse 1 (${languages[0]}):
[Lyrics in ${languages[0]}]

Chorus (${languages[0]}):
[Main chorus in ${languages[0]}]

Verse 2 (${languages[1] || languages[0]}):
[Lyrics in ${languages[1] || languages[0]}]

${languages[2] ? `Verse 3 (${languages[2]}):\n[Lyrics in ${languages[2]}]\n\n` : ''}Chorus (Mixed):
[Chorus with phrases from ${languages.slice(0, 2).join(' and ')}]`
    : `**CRITICAL REQUIREMENT: Generate lyrics ENTIRELY in ${languages[0]} language**`;

  const prompt = `${context.existingLyrics ? 'Enhance and improve these lyrics' : 'Create song lyrics'} for this music context:

${context.existingLyrics ? `EXISTING LYRICS:\n${context.existingLyrics}\n\n` : ''}MUSIC CONTEXT:
Prompt: "${context.prompt || 'Create a song'}"
Genres: ${genres.join(', ')}
Mood: ${context.mood || 'Not specified'}
Artists/Inspiration: ${artists}
Duration: ${duration} seconds (${durationNote})

${languageInstructions}

${context.existingLyrics ? 
  `Improve the existing lyrics by:
- Enhancing rhythm and flow
- Strengthening emotional impact
- Improving rhyme schemes (appropriate for ${languages.join('/')})
- Adding more vivid imagery
- Maintaining the original theme and message
- ${isMultiLanguage ? `MUST use ALL ${languages.length} languages: ${languages.join(', ')}` : `MUST remain in ${languages[0]} language`}
- Match the ${genres.join('/')} genre style` :
  `Create original lyrics that:
- Match the ${genres.join('/')} genre and mood
- Have strong rhythm and flow appropriate for ${languages.join('/')}
- Include memorable hooks and choruses
- Tell a compelling story or convey emotion
- Use language style appropriate for ${genres.join('/')} music
- **ABSOLUTELY MUST use ALL languages: ${languages.join(', ')}**
- Match the duration (${duration}s): ${durationNote}
- Draw inspiration from artists like: ${artists}`
}

Structure guidance: ${duration < 90 ? 'Verse - Chorus' : duration < 180 ? 'Verse - Chorus - Verse - Chorus' : 'Verse - Chorus - Verse - Chorus - Bridge - Final Chorus'}
${isMultiLanguage 
  ? `Return the lyrics with clear language labels for each section (e.g., "Verse 1 (${languages[0]}):", "Chorus (Mixed):").` 
  : `Return only the lyrics text in ${languages[0]}, properly formatted with sections labeled.`}`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function enhanceLyricsFallback(context: any): string {
  const genre = (context.genre || 'Electronic').toLowerCase();
  const mood = (context.mood || '').toLowerCase();
  const prompt = context.prompt || 'Create a song';
  
  // Get all target languages
  const languages = Array.isArray(context.languages) && context.languages.length > 0 
    ? context.languages 
    : (context.language ? [context.language] : ['English']);
  
  const isMultiLanguage = languages.length > 1;
  const primaryLanguage = languages[0];
  
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
    
    const multilangNote = isMultiLanguage
      ? `\n\n[Note: To generate lyrics in all ${languages.length} languages (${languages.join(', ')}), please provide a Gemini API key or manually translate the verses.]`
      : primaryLanguage.toLowerCase() !== 'english'
      ? `\n\n[Note: Lyrics should be translated to ${primaryLanguage}. Use the AI enhancement feature with a Gemini API key for automatic translation.]`
      : '';
    
    return enhanced.join('\n') + multilangNote;
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
  
  // Multi-language support in fallback (basic English template with notes)
  const multiLangNote = isMultiLanguage
    ? `\n\n[Multi-Language Note: You selected ${languages.length} languages (${languages.join(', ')}). The fallback generator only creates English lyrics. For true multi-language lyrics, please:
1. Click the sparkle icon next to the lyrics field
2. Provide a Gemini API key (VITE_GEMINI_API_KEY)
3. The AI will generate verse-by-verse lyrics in ${languages.join(', ')}]`
    : primaryLanguage.toLowerCase() !== 'english'
    ? `\n\n[Language Note: These lyrics are in English. For ${primaryLanguage} lyrics, use the AI enhancement feature (sparkle icon) with a Gemini API key, or manually translate these lyrics.]`
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
Forever dancing in the light${multiLangNote}`;
}