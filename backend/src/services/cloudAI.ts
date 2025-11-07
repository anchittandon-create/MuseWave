/**
 * Cloud AI Service - Uses Google Gemini (cheapest) and OpenAI for music generation
 * Cost optimization: Gemini Flash 8B is FREE for up to 15 RPM
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Replicate from 'replicate';

// Initialize clients (lazy)
let gemini: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;
let replicate: Replicate | null = null;

function getGemini(): GoogleGenerativeAI {
  if (!gemini && process.env.GOOGLE_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  if (!gemini) throw new Error('Google API key not configured');
  return gemini;
}

function getOpenAI(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  if (!openai) throw new Error('OpenAI API key not configured');
  return openai;
}

function getReplicate(): Replicate {
  if (!replicate && process.env.REPLICATE_API_TOKEN) {
    replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }
  if (!replicate) throw new Error('Replicate API token not configured');
  return replicate;
}

export interface MusicGenerationParams {
  prompt: string;
  duration: number; // seconds
  genres: string[];
  artistInspiration?: string[];
}

export interface VocalGenerationParams {
  text: string;
  language?: string;
  style?: 'singing' | 'speaking';
}

/**
 * Generate music using Replicate's Riffusion model
 * Cost: ~$0.01 per 30 seconds
 */
export async function generateMusic(params: MusicGenerationParams): Promise<{ audioUrl: string; status: string }> {
  const replicateClient = getReplicate();

  const fullPrompt = [
    params.prompt,
    ...params.genres,
    ...(params.artistInspiration || [])
  ].join(', ');

  try {
    const output = await replicateClient.run(
      // Riffusion model - text to music
      "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
      {
        input: {
          prompt_a: fullPrompt,
          denoising: 0.75,
          seed_image_id: "vibes",
          alpha: 0.5,
          num_inference_steps: 50,
          duration: Math.min(params.duration, 120) // Max 2 minutes
        }
      }
    );

    if (output && typeof output === 'object' && 'audio' in output) {
      return { audioUrl: output.audio as string, status: 'success' };
    }

    throw new Error('Invalid output from Riffusion model');
  } catch (error: any) {
    console.error('Music generation error:', error);
    throw new Error(`Music generation failed: ${error.message}`);
  }
}

/**
 * Generate lyrics using Google Gemini Flash 8B (FREE tier)
 * Cost: FREE for up to 15 requests per minute
 */
export async function generateLyrics(params: {
  theme: string;
  genre: string;
  duration: number;
}): Promise<string> {
  const geminiClient = getGemini();
  const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

  const estimatedLines = Math.floor(params.duration / 5); // ~5 seconds per line

  const prompt = `Write song lyrics for a ${params.genre} song about: ${params.theme}
  
Requirements:
- ${estimatedLines} lines total
- Follow verse-chorus structure
- Match ${params.genre} style
- No markdown formatting, just plain text lyrics
- Each line on a new line`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error('Lyrics generation error:', error);
    throw new Error(`Lyrics generation failed: ${error.message}`);
  }
}

/**
 * Generate vocals using OpenAI TTS (affordable)
 * Cost: $15 per 1M characters (~$0.015 per 1000 chars)
 */
export async function generateVocals(params: VocalGenerationParams): Promise<Buffer> {
  const openaiClient = getOpenAI();

  try {
    const response = await openaiClient.audio.speech.create({
      model: 'tts-1', // Cheaper than tts-1-hd
      voice: 'nova', // Female voice, good for singing
      input: params.text,
      speed: 1.0,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer;
  } catch (error: any) {
    console.error('Vocal generation error:', error);
    throw new Error(`Vocal generation failed: ${error.message}`);
  }
}

/**
 * Enhance music prompt using Gemini (helps improve generation quality)
 * Cost: FREE
 */
export async function enhancePrompt(userPrompt: string, genres: string[]): Promise<string> {
  const geminiClient = getGemini();
  const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

  const prompt = `Given this music description: "${userPrompt}" and genres: ${genres.join(', ')}
  
Enhance it into a detailed, vivid music generation prompt that includes:
- Tempo/BPM suggestions
- Instrumentation details
- Mood and atmosphere
- Musical characteristics

Keep it under 200 words. Return ONLY the enhanced prompt, no explanations.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error: any) {
    console.warn('Prompt enhancement failed, using original:', error);
    return `${userPrompt} ${genres.join(' ')}`;
  }
}

/**
 * Analyze music for metadata (BPM, key, etc.) using Gemini
 * Cost: FREE
 */
export async function analyzeMusicMetadata(params: {
  prompt: string;
  genres: string[];
}): Promise<{ bpm: number; key: string; scale: 'major' | 'minor' }> {
  const geminiClient = getGemini();
  const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

  const prompt = `Analyze this music description and genres to determine musical characteristics:
Description: ${params.prompt}
Genres: ${params.genres.join(', ')}

Respond with ONLY a JSON object containing:
{
  "bpm": <number between 60-180>,
  "key": "<note> <major/minor>",
  "scale": "<major or minor>"
}

Example: {"bpm": 120, "key": "C major", "scale": "major"}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    
    const metadata = JSON.parse(jsonMatch[0]);
    
    return {
      bpm: metadata.bpm || 120,
      key: metadata.key || 'C major',
      scale: metadata.scale || 'major',
    };
  } catch (error: any) {
    console.warn('Metadata analysis failed, using defaults:', error);
    // Fallback to genre-based BPM
    const genreBPM: Record<string, number> = {
      lofi: 82,
      hiphop: 90,
      pop: 116,
      rock: 110,
      techno: 128,
      house: 125,
      dnb: 174,
      ambient: 85,
    };
    
    const bpm = genreBPM[params.genres[0]?.toLowerCase()] || 120;
    
    return {
      bpm,
      key: 'C major',
      scale: 'major',
    };
  }
}

/**
 * Cost summary for reference:
 * 
 * - Google Gemini Flash 8B: FREE (15 RPM)
 * - OpenAI TTS: $15/1M characters (~$0.015 per song)
 * - Replicate Riffusion: ~$0.01 per 30 seconds of music
 * 
 * Total cost per generation (60s song with vocals): ~$0.03-0.05
 */
