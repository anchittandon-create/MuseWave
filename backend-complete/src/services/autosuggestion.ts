import { execa } from 'execa';
import { env } from '../config/env.js';

/**
 * Call Python suggestion engine for AI-powered autocomplete
 */
export async function generateAutosuggestions(
  field: 'genres' | 'artistInspiration' | 'vocalLanguages',
  input: string,
  context: {
    musicPrompt?: string;
    genres?: string[];
    artistInspiration?: string[];
    vocalLanguages?: string[];
    lyrics?: string;
  }
): Promise<string[]> {
  try {
    const pythonCmd = env.PYTHON_VENV ? `${env.PYTHON_VENV}/bin/python3` : 'python3';
    
    const scriptPath = new URL('../python/suggestion_engine.py', import.meta.url).pathname;
    
    const inputData = JSON.stringify({
      field,
      input: input.trim(),
      context,
    });
    
    const { stdout, stderr } = await execa(pythonCmd, [scriptPath], {
      input: inputData,
      timeout: 5000, // 5 second timeout for fast response
    });
    
    if (stderr) {
      console.warn('[Suggestion Engine] Warning:', stderr);
    }
    
    const result = JSON.parse(stdout);
    return result.suggestions || [];
    
  } catch (error: any) {
    console.error('[Suggestion Engine] Error:', error.message);
    
    // Fallback to simple prefix matching if Python fails
    return fallbackSuggestions(field, input, context);
  }
}

/**
 * Fallback suggestion logic if Python model unavailable
 */
function fallbackSuggestions(
  field: 'genres' | 'artistInspiration' | 'vocalLanguages',
  input: string,
  context: any
): string[] {
  const lowerInput = input.toLowerCase();
  
  if (field === 'genres') {
    const genres = [
      'Cinematic', 'Electronic', 'Ambient', 'Techno', 'House', 'EDM',
      'Synthwave', 'Trance', 'Hip Hop', 'Lofi', 'Jazz', 'Rock',
      'Alternative', 'Indie', 'Pop', 'Classical', 'Orchestral'
    ];
    return genres
      .filter(g => g.toLowerCase().includes(lowerInput))
      .filter(g => !context.genres?.includes(g))
      .slice(0, 5);
  }
  
  if (field === 'artistInspiration') {
    // Disable for regional languages
    const languages = context.vocalLanguages || [];
    if (languages.some((l: string) => ['Hindi', 'Tamil', 'Telugu'].includes(l))) {
      return [];
    }
    
    const artists = [
      'Hans Zimmer', 'Daft Punk', 'Tycho', 'BT', 'Aphex Twin',
      'Brian Eno', 'J Dilla', 'Nujabes', 'The Weeknd'
    ];
    return artists
      .filter(a => a.toLowerCase().includes(lowerInput))
      .filter(a => !context.artistInspiration?.includes(a))
      .slice(0, 5);
  }
  
  if (field === 'vocalLanguages') {
    const languages = [
      'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean',
      'Chinese', 'Hindi', 'Arabic', 'Russian', 'Italian', 'Portuguese'
    ];
    return languages
      .filter(l => l.toLowerCase().includes(lowerInput))
      .filter(l => !context.vocalLanguages?.includes(l))
      .slice(0, 5);
  }
  
  return [];
}
