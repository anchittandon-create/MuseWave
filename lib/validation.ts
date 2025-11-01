interface MusicGenerationRequest {
  musicPrompt: string;
  genres: string[];
  durationSec: number;
  artistInspiration?: string[];
  lyrics?: string;
  vocalLanguages?: string[];
  generateVideo?: boolean;
  videoStyles?: ("Lyric Video" | "Official Music Video" | "Abstract Visualizer")[];
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateInput(input: any): ValidationResult {
  // Check required fields
  if (!input.musicPrompt || typeof input.musicPrompt !== 'string') {
    return { valid: false, error: 'musicPrompt is required and must be a string' };
  }
  
  if (!Array.isArray(input.genres)) {
    return { valid: false, error: 'genres must be an array' };
  }
  
  if (typeof input.durationSec !== 'number' || input.durationSec < 10 || input.durationSec > 300) {
    return { valid: false, error: 'durationSec must be a number between 10 and 300' };
  }
  
  // Validate optional fields
  if (input.artistInspiration && !Array.isArray(input.artistInspiration)) {
    return { valid: false, error: 'artistInspiration must be an array if provided' };
  }
  
  if (input.lyrics && typeof input.lyrics !== 'string') {
    return { valid: false, error: 'lyrics must be a string if provided' };
  }
  
  if (input.vocalLanguages && !Array.isArray(input.vocalLanguages)) {
    return { valid: false, error: 'vocalLanguages must be an array if provided' };
  }
  
  if (input.generateVideo && typeof input.generateVideo !== 'boolean') {
    return { valid: false, error: 'generateVideo must be a boolean if provided' };
  }
  
  if (input.videoStyles) {
    if (!Array.isArray(input.videoStyles)) {
      return { valid: false, error: 'videoStyles must be an array if provided' };
    }
    
    const validStyles = ["Lyric Video", "Official Music Video", "Abstract Visualizer"];
    for (const style of input.videoStyles) {
      if (!validStyles.includes(style)) {
        return { valid: false, error: `Invalid video style: ${style}. Must be one of: ${validStyles.join(', ')}` };
      }
    }
  }
  
  // Validate prompt length
  if (input.musicPrompt.length > 1000) {
    return { valid: false, error: 'musicPrompt must be less than 1000 characters' };
  }
  
  // Validate genres array
  if (input.genres.length === 0) {
    return { valid: false, error: 'At least one genre is required' };
  }
  
  if (input.genres.length > 5) {
    return { valid: false, error: 'Maximum 5 genres allowed' };
  }
  
  // Validate lyrics length if provided
  if (input.lyrics && input.lyrics.length > 5000) {
    return { valid: false, error: 'lyrics must be less than 5000 characters' };
  }
  
  return { valid: true };
}