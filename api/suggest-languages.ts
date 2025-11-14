import { VercelRequest, VercelResponse } from '@vercel/node';

interface SuggestLanguagesRequest {
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
    const { context }: SuggestLanguagesRequest = req.body;
    
    // Try Gemini suggestions if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const suggestions = await suggestWithGemini(context);
        res.status(200).json({ languages: suggestions });
        return;
      } catch (error) {
        console.warn('Gemini language suggestion failed, using fallback:', error instanceof Error ? error.message : String(error));
      }
    }
    
    // Fallback suggestions
    const suggestions = suggestLanguagesFallback(context);
    res.status(200).json({ languages: suggestions });
    
  } catch (error) {
    console.error('Language suggestion error:', error);
    res.status(500).json({ 
      error: 'Language suggestion failed',
      debug: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
}

async function suggestWithGemini(context: any): Promise<string[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const prompt = `Suggest 3-4 vocal languages for this music creation context:

Prompt: "${context.prompt || 'Create a track'}"
Genres: ${context.genres?.join(', ') || 'Electronic'}
Mood: ${context.mood || 'Not specified'}
Artist inspiration: ${context.artistInspiration?.join(', ') || 'None'}

Suggest languages that would complement the musical style and mood. Consider:
- Languages that fit the genre aesthetically
- Cultural associations with the music style
- Vocal quality and rhythm patterns
- Global appeal and accessibility

Return only a JSON array of language names, like: ["English", "Spanish", "French"]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  // Extract JSON array from response
  const jsonMatch = text.match(/\[.*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON array found in Gemini response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

function suggestLanguagesFallback(context: any): string[] {
  const allLanguages = [
    'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
    'Japanese', 'Korean', 'Mandarin', 'Hindi', 'Arabic', 'Russian',
    'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish',
    'Greek', 'Turkish', 'Hebrew', 'Thai', 'Vietnamese', 'Indonesian'
  ];
  
  const languageScores: Record<string, number> = {};
  
  allLanguages.forEach(language => {
    let score = 0;
    const languageLower = language.toLowerCase();
    
    // Genre-based scoring
    const genres = (context.genres || []).map((g: string) => g.toLowerCase());
    
    if (genres.some((g: string) => ['house', 'techno', 'electronic'].includes(g))) {
      if (['english', 'french', 'german'].includes(languageLower)) score += 2;
    }
    if (genres.some((g: string) => ['latin', 'reggaeton', 'tropical'].includes(g))) {
      if (['spanish', 'portuguese'].includes(languageLower)) score += 3;
    }
    if (genres.some((g: string) => ['ambient', 'new age', 'world'].includes(g))) {
      if (['japanese', 'mandarin', 'hindi', 'arabic'].includes(languageLower)) score += 2;
    }
    if (genres.some((g: string) => ['pop', 'mainstream', 'commercial'].includes(g))) {
      if (['english', 'spanish', 'french'].includes(languageLower)) score += 2;
    }
    
    // Mood-based scoring
    const mood = (context.mood || '').toLowerCase();
    if (mood.includes('romantic') || mood.includes('sensual')) {
      if (['french', 'italian', 'spanish', 'portuguese'].includes(languageLower)) score += 1;
    }
    if (mood.includes('energetic') || mood.includes('upbeat')) {
      if (['english', 'spanish', 'portuguese'].includes(languageLower)) score += 1;
    }
    if (mood.includes('mystical') || mood.includes('spiritual')) {
      if (['japanese', 'hindi', 'arabic', 'hebrew'].includes(languageLower)) score += 1;
    }
    
    // Prompt keyword scoring
    const prompt = (context.prompt || '').toLowerCase();
    if (prompt.includes('global') || prompt.includes('world')) {
      score += Math.random() * 2; // Randomize for global appeal
    }
    if (prompt.includes('club') || prompt.includes('dance')) {
      if (['english', 'spanish', 'french'].includes(languageLower)) score += 1;
    }
    
    // Default boost for common languages
    if (['english', 'spanish', 'french'].includes(languageLower)) {
      score += 0.5;
    }
    
    // Add random factor for diversity
    score += Math.random();
    languageScores[language] = score;
  });
  
  // Sort by score and return top 3
  const sorted = allLanguages.sort((a, b) => languageScores[b] - languageScores[a]);
  return sorted.slice(0, 3);
}