import { GENRE_BPM_MAP, KEY_MODES, SCALES, MOOD_KEYWORDS } from '../config/ai-ontology.js';
import { env } from '../config/env.js';

/**
 * Music Planning Service
 * Derives BPM, key, scale, and structure from input parameters
 */

export interface MusicPlan {
  bpm: number;
  key: string;
  scale: string;
  structure: string[];
  mood: string;
  estimatedDuration: number;
  tempoChanges?: Array<{ at: number; bpm: number }>;
}

interface PlanInput {
  musicPrompt: string;
  genres: string[];
  durationSec: number;
  artistInspiration?: string[];
  seed?: number;
}

/**
 * Determine BPM from genres with weighted average
 */
function calculateBPM(genres: string[], seed?: number): number {
  if (genres.length === 0) {
    return env.DEFAULT_BPM;
  }

  // Get BPM for each genre
  const bpms = genres
    .map(g => GENRE_BPM_MAP[g.toLowerCase()] || GENRE_BPM_MAP[g.split('-')[0]?.toLowerCase()])
    .filter(Boolean);

  if (bpms.length === 0) {
    return env.DEFAULT_BPM;
  }

  // Weighted average (first genre has more weight)
  const weights = bpms.map((_, i) => 1 / (i + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = bpms.reduce((sum, bpm, i) => sum + bpm * weights[i], 0);
  
  let bpm = Math.round(weightedSum / totalWeight);

  // Add slight randomization based on seed
  if (seed !== undefined) {
    const variation = ((seed % 20) - 10) / 2; // ±5 BPM
    bpm = Math.max(60, Math.min(200, bpm + variation));
  }

  return bpm;
}

/**
 * Determine musical key based on mood and prompt keywords
 */
function determineKey(prompt: string, genres: string[], seed?: number): string {
  const keywords = prompt.toLowerCase().split(/\s+/);

  // Mood-based key preferences
  const moodKeyMap: Record<string, string[]> = {
    uplifting: ['C major', 'G major', 'D major', 'A major'],
    melancholic: ['A minor', 'E minor', 'D minor', 'B minor'],
    aggressive: ['E minor', 'C minor', 'F# minor', 'Bb minor'],
    dreamy: ['Ab major', 'Eb major', 'Db major', 'F major'],
    cinematic: ['A minor', 'C major', 'D minor', 'G minor'],
    dark: ['C minor', 'Eb minor', 'F# minor', 'Bb minor'],
    chill: ['F major', 'Bb major', 'C major', 'G major'],
  };

  // Detect mood from keywords
  let detectedMood = 'chill';
  let maxMatches = 0;

  for (const [mood, moodWords] of Object.entries(MOOD_KEYWORDS)) {
    const matches = keywords.filter(kw => 
      moodWords.some(mw => kw.includes(mw) || mw.includes(kw))
    ).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      detectedMood = mood;
    }
  }

  // Select key from mood preferences
  const preferredKeys = moodKeyMap[detectedMood] || KEY_MODES;
  
  // Use seed for deterministic selection
  const index = seed !== undefined 
    ? seed % preferredKeys.length 
    : Math.floor(Math.random() * preferredKeys.length);

  return preferredKeys[index];
}

/**
 * Determine scale based on key and genre
 */
function determineScale(key: string, genres: string[]): string {
  // Major/minor from key
  if (key.includes('major')) return 'major';
  if (key.includes('minor')) return 'minor';

  // Genre preferences
  const hasBlues = genres.some(g => g.includes('blues') || g.includes('jazz'));
  const hasPentatonic = genres.some(g => ['lofi', 'hip-hop', 'ambient'].includes(g));

  if (hasBlues) return 'blues';
  if (hasPentatonic) return 'pentatonic';

  return 'minor'; // Default
}

/**
 * Generate song structure based on duration
 */
function generateStructure(durationSec: number, bpm: number): string[] {
  const structure: string[] = [];

  // Calculate bar durations (assuming 4/4 time)
  const beatsPerBar = 4;
  const secondsPerBar = (60 / bpm) * beatsPerBar;

  // Section lengths in bars
  const sectionLengths = {
    intro: 8,
    verse: 16,
    chorus: 8,
    bridge: 8,
    breakdown: 8,
    outro: 8,
  };

  let remainingSec = durationSec;

  // Always start with intro
  structure.push('intro');
  remainingSec -= sectionLengths.intro * secondsPerBar;

  // Build structure based on remaining time
  if (remainingSec > 0) {
    structure.push('verse');
    remainingSec -= sectionLengths.verse * secondsPerBar;
  }

  if (remainingSec > 0) {
    structure.push('chorus');
    remainingSec -= sectionLengths.chorus * secondsPerBar;
  }

  if (remainingSec > 30) {
    structure.push('verse');
    remainingSec -= sectionLengths.verse * secondsPerBar;
  }

  if (remainingSec > 0) {
    structure.push('chorus');
    remainingSec -= sectionLengths.chorus * secondsPerBar;
  }

  if (remainingSec > 30) {
    structure.push('bridge');
    remainingSec -= sectionLengths.bridge * secondsPerBar;
  }

  if (remainingSec > 20) {
    structure.push('breakdown');
    remainingSec -= sectionLengths.breakdown * secondsPerBar;
  }

  if (remainingSec > 0) {
    structure.push('chorus');
    remainingSec -= sectionLengths.chorus * secondsPerBar;
  }

  // Always end with outro
  structure.push('outro');

  return structure;
}

/**
 * Main planning function
 */
export function createMusicPlan(input: PlanInput): MusicPlan {
  const { musicPrompt, genres, durationSec, seed } = input;

  const bpm = calculateBPM(genres, seed);
  const key = determineKey(musicPrompt, genres, seed);
  const scale = determineScale(key, genres);
  const structure = generateStructure(durationSec, bpm);

  // Detect mood
  const keywords = musicPrompt.toLowerCase().split(/\s+/);
  let mood = 'energetic';
  let maxMatches = 0;

  for (const [moodName, moodWords] of Object.entries(MOOD_KEYWORDS)) {
    const matches = keywords.filter(kw =>
      moodWords.some(mw => kw.includes(mw) || mw.includes(kw))
    ).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      mood = moodName;
    }
  }

  return {
    bpm,
    key,
    scale,
    structure,
    mood,
    estimatedDuration: durationSec,
  };
}

/**
 * Generate timing markers for sections
 */
export function generateTimingMarkers(plan: MusicPlan): Array<{ section: string; startSec: number; endSec: number }> {
  const { bpm, structure, estimatedDuration } = plan;

  const beatsPerBar = 4;
  const secondsPerBar = (60 / bpm) * beatsPerBar;

  const sectionDurations = {
    intro: 8 * secondsPerBar,
    verse: 16 * secondsPerBar,
    chorus: 8 * secondsPerBar,
    bridge: 8 * secondsPerBar,
    breakdown: 8 * secondsPerBar,
    outro: 8 * secondsPerBar,
  };

  const markers: Array<{ section: string; startSec: number; endSec: number }> = [];
  let currentTime = 0;

  for (const section of structure) {
    const duration = sectionDurations[section as keyof typeof sectionDurations] || 8 * secondsPerBar;
    const endTime = Math.min(currentTime + duration, estimatedDuration);

    markers.push({
      section,
      startSec: Math.round(currentTime * 10) / 10,
      endSec: Math.round(endTime * 10) / 10,
    });

    currentTime = endTime;

    if (currentTime >= estimatedDuration) break;
  }

  return markers;
}
