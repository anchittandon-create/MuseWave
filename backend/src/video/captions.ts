/**
 * SRT Captions Generator
 * Converts lyrics into SubRip (.srt) subtitle format
 */

export interface CaptionTimestamp {
  start: number; // seconds
  end: number;
  text: string;
}

/**
 * Generate SRT file content from lyrics
 */
export function generateSRT(
  lyrics: string,
  audioDuration: number,
  options: {
    wordsPerLine?: number;
    minDuration?: number;
  } = {}
): string {
  const wordsPerLine = options.wordsPerLine || 8;
  const minDuration = options.minDuration || 2; // seconds
  
  // Split lyrics into lines and words
  const lines = lyrics
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  if (lines.length === 0) {
    return '';
  }
  
  // Calculate timing for each line
  const timestamps: CaptionTimestamp[] = [];
  const totalDuration = audioDuration;
  const durationPerLine = Math.max(minDuration, totalDuration / lines.length);
  
  let currentTime = 0;
  
  lines.forEach((line, index) => {
    const start = currentTime;
    const end = Math.min(currentTime + durationPerLine, totalDuration);
    
    timestamps.push({
      start,
      end,
      text: line,
    });
    
    currentTime = end;
  });
  
  // Generate SRT format
  return timestamps.map((ts, index) => {
    return `${index + 1}
${formatSRTTime(ts.start)} --> ${formatSRTTime(ts.end)}
${ts.text}

`;
  }).join('');
}

/**
 * Format time in SRT format: HH:MM:SS,mmm
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  
  return `${padZero(hours, 2)}:${padZero(minutes, 2)}:${padZero(secs, 2)},${padZero(millis, 3)}`;
}

/**
 * Pad number with leading zeros
 */
function padZero(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

/**
 * Split lyrics into timed segments with better rhythm
 */
export function generateTimedLyrics(
  lyrics: string,
  audioDuration: number,
  bpm?: number
): CaptionTimestamp[] {
  const lines = lyrics
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  if (lines.length === 0) {
    return [];
  }
  
  const timestamps: CaptionTimestamp[] = [];
  
  // If BPM is provided, sync to beat
  if (bpm) {
    const beatDuration = 60 / bpm;
    const beatsPerLine = 4; // 4 beats per line (one bar)
    const lineDuration = beatDuration * beatsPerLine;
    
    let currentTime = 0;
    
    lines.forEach(line => {
      timestamps.push({
        start: currentTime,
        end: Math.min(currentTime + lineDuration, audioDuration),
        text: line,
      });
      currentTime += lineDuration;
    });
  } else {
    // Fallback to even distribution
    const durationPerLine = audioDuration / lines.length;
    let currentTime = 0;
    
    lines.forEach(line => {
      timestamps.push({
        start: currentTime,
        end: Math.min(currentTime + durationPerLine, audioDuration),
        text: line,
      });
      currentTime += durationPerLine;
    });
  }
  
  return timestamps;
}

/**
 * Validate SRT content
 */
export function validateSRT(content: string): boolean {
  const lines = content.split('\n').filter(l => l.trim());
  
  // Check basic structure
  if (lines.length < 3) return false;
  
  // Check first subtitle number
  if (!lines[0].match(/^\d+$/)) return false;
  
  // Check timestamp format
  if (!lines[1].match(/\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/)) {
    return false;
  }
  
  return true;
}
