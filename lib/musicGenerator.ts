import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface MusicGenerationRequest {
  musicPrompt: string;
  genres: string[];
  durationSec: number;
  artistInspiration?: string[];
  lyrics?: string;
  vocalLanguages?: string[];
  generateVideo?: boolean;
  videoStyles?: ("Lyric Video" | "Official Music Video" | "Abstract Visualizer")[];
}

export interface MusicPlan {
  bpm: number;
  key: string;
  scale: "minor" | "major";
  durationSec: number;
  sections: Array<{
    name: string;
    startBeat: number;
    endBeat: number;
    chords: string[];
  }>;
  chordsBySection: Record<string, string[]>;
}

export interface GenerationResult {
  bpm: number;
  key: string;
  scale: "minor" | "major";
  assets: {
    previewUrl: string;
    mixUrl: string;
    videoUrl?: string;
  };
  debug: {
    mode: "cli" | "wasm";
    duration: number;
    warnings?: string[];
  };
}

export async function generateMusic(input: MusicGenerationRequest): Promise<GenerationResult> {
  const startTime = Date.now();
  const jobId = uuidv4();
  const warnings: string[] = [];
  
  // Create output directory
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const outputDir = join(process.cwd(), 'public', 'assets', String(year), month, jobId);
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Step 1: Generate music plan
    console.log('🎵 Generating music plan...');
    const plan = await generateMusicPlan(input);
    
    // Step 2: Check ffmpeg availability
    const ffmpegMode = await checkFFmpegAvailability();
    
    // Step 3: Generate audio stems
    console.log('🔊 Generating audio stems...');
    await generateAudioStems(plan, outputDir, ffmpegMode);
    
    // Step 4: Create mix
    console.log('🎛️ Creating final mix...');
    await createFinalMix(outputDir, ffmpegMode);
    
    // Step 5: Generate vocals if lyrics provided
    if (input.lyrics) {
      console.log('🎤 Generating vocals...');
      await generateVocals(input.lyrics, plan.durationSec, outputDir, ffmpegMode);
      await createVocalMix(outputDir, ffmpegMode);
    }
    
    // Step 6: Generate video if requested
    let videoUrl: string | undefined;
    if (input.generateVideo && input.videoStyles && input.videoStyles.length > 0) {
      console.log('🎬 Generating video...');
      videoUrl = await generateVideo(input.videoStyles[0], input.lyrics, outputDir, ffmpegMode);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      bpm: plan.bpm,
      key: plan.key,
      scale: plan.scale,
      assets: {
        previewUrl: `/assets/${year}/${month}/${jobId}/preview.wav`,
        mixUrl: `/assets/${year}/${month}/${jobId}/mix.wav`,
        videoUrl: videoUrl ? `/assets/${year}/${month}/${jobId}/${videoUrl}` : undefined
      },
      debug: {
        mode: ffmpegMode,
        duration,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    };
    
  } catch (error) {
    console.error('Generation failed:', error);
    throw new Error(`Music generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function generateMusicPlan(input: MusicGenerationRequest): Promise<MusicPlan> {
  // Try Gemini first if API key available
  if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
    try {
      return await generatePlanWithGemini(input);
    } catch (error) {
      console.warn('Gemini plan generation failed, using fallback:', error instanceof Error ? error.message : String(error));
    }
  }
  
  // Deterministic fallback
  return generateDeterministicPlan(input);
}

async function generatePlanWithGemini(input: MusicGenerationRequest): Promise<MusicPlan> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

  const prompt = `Generate a music plan for: "${input.musicPrompt}"
Genres: ${input.genres.join(', ')}
Duration: ${input.durationSec} seconds
Artist inspiration: ${input.artistInspiration?.join(', ') || 'None'}

Return ONLY valid JSON with this exact schema:
{
  "bpm": number (60-180),
  "key": string (like "A minor", "C major"),
  "scale": "minor" | "major",
  "durationSec": ${input.durationSec},
  "sections": [
    {"name": "intro", "startBeat": 0, "endBeat": 16, "chords": ["Am", "F", "C", "G"]},
    {"name": "verse", "startBeat": 16, "endBeat": 48, "chords": ["Am", "F", "C", "G"]},
    {"name": "chorus", "startBeat": 48, "endBeat": 80, "chords": ["F", "C", "G", "Am"]},
    {"name": "outro", "startBeat": 80, "endBeat": 96, "chords": ["Am", "F", "C", "G"]}
  ],
  "chordsBySection": {
    "intro": ["Am", "F", "C", "G"],
    "verse": ["Am", "F", "C", "G"],
    "chorus": ["F", "C", "G", "Am"],
    "outro": ["Am", "F", "C", "G"]
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

function generateDeterministicPlan(input: MusicGenerationRequest): MusicPlan {
  // BPM based on genres
  const genreBpmMap: Record<string, number> = {
    'lo-fi': 82, 'lofi': 82, 'ambient': 85, 'downtempo': 95,
    'house': 120, 'techno': 128, 'trance': 132, 'garage': 134,
    'drum and bass': 174, 'dnb': 174, 'dubstep': 140
  };
  
  const avgBpm = input.genres.length > 0 
    ? input.genres.reduce((sum, genre) => sum + (genreBpmMap[genre.toLowerCase()] || 120), 0) / input.genres.length
    : 120;
  
  const bpm = Math.round(avgBpm);
  
  // Key based on prompt hash
  const keys = ["A minor", "C minor", "D minor", "E minor", "G minor"];
  const promptHash = input.musicPrompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const key = keys[promptHash % keys.length];
  
  // Calculate beats and sections
  const totalBeats = Math.round((input.durationSec * bpm) / 60);
  const introBeets = Math.min(16, Math.round(totalBeats * 0.15));
  const outroBeets = Math.min(16, Math.round(totalBeats * 0.15));
  const middleBeats = totalBeats - introBeets - outroBeets;
  const verseBeets = Math.round(middleBeats * 0.4);
  const chorusBeats = middleBeats - verseBeets;
  
  const sections = [
    { name: "intro", startBeat: 0, endBeat: introBeets, chords: ["Am", "F", "C", "G"] },
    { name: "verse", startBeat: introBeets, endBeat: introBeets + verseBeets, chords: ["Am", "F", "C", "G"] },
    { name: "chorus", startBeat: introBeets + verseBeets, endBeat: introBeets + verseBeets + chorusBeats, chords: ["F", "C", "G", "Am"] },
    { name: "outro", startBeat: introBeets + verseBeets + chorusBeats, endBeat: totalBeats, chords: ["Am", "F", "C", "G"] }
  ];
  
  return {
    bpm,
    key,
    scale: "minor",
    durationSec: input.durationSec,
    sections,
    chordsBySection: {
      intro: ["Am", "F", "C", "G"],
      verse: ["Am", "F", "C", "G"], 
      chorus: ["F", "C", "G", "Am"],
      outro: ["Am", "F", "C", "G"]
    }
  };
}

async function checkFFmpegAvailability(): Promise<"cli" | "wasm"> {
  try {
    await execAsync('ffmpeg -version');
    return "cli";
  } catch {
    return "wasm";
  }
}

async function generateAudioStems(plan: MusicPlan, outputDir: string, mode: "cli" | "wasm"): Promise<void> {
  if (mode === "cli") {
    await generateStemsWithCLI(plan, outputDir);
  } else {
    await generateStemsWithWasm(plan, outputDir);
  }
}

async function generateStemsWithCLI(plan: MusicPlan, outputDir: string): Promise<void> {
  const beatDuration = 60 / plan.bpm; // seconds per beat
  const eighthDuration = beatDuration / 2; // 1/8 note duration
  
  // Generate basic segments
  console.log('Generating kick segment...');
  await execAsync(`ffmpeg -f lavfi -i "sine=f=56:d=0.06" -af "afade=t=out:st=0.03:d=0.03,alimiter=limit=0.95" -y "${join(outputDir, 'kick_seg.wav')}"`);
  
  console.log('Generating snare segment...');
  await execAsync(`ffmpeg -f lavfi -i "anoisesrc=color=white:amplitude=0.3:d=0.11" -af "bandpass=f=1800:w=2,aecho=0.3:0.4:60:0.3,afade=t=out:st=0.07:d=0.04" -y "${join(outputDir, 'snare_seg.wav')}"`);
  
  console.log('Generating hat segment...');
  await execAsync(`ffmpeg -f lavfi -i "anoisesrc=color=white:amplitude=0.15:d=0.04" -af "highpass=f=6000,afade=t=out:st=0.02:d=0.02" -y "${join(outputDir, 'hat_seg.wav')}"`);
  
  console.log('Generating bass segment...');
  await execAsync(`ffmpeg -f lavfi -i "sine=f=110:d=0.25" -af "acompressor=threshold=-18dB:ratio=2,afade=t=out:st=0.20:d=0.05" -y "${join(outputDir, 'bass_seg.wav')}"`);
  
  console.log('Generating lead segment...');
  await execAsync(`ffmpeg -f lavfi -i "sine=f=440:d=0.25" -af "vibrato=f=5:d=0.4,aphaser=type=t:speed=0.5,afade=t=out:st=0.22:d=0.03" -y "${join(outputDir, 'lead_seg.wav')}"`);
  
  // Create silence segment
  await execAsync(`ffmpeg -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=44100:d=${eighthDuration}" -y "${join(outputDir, 'silence.wav')}"`);
  
  // Build rhythm patterns
  const totalBeats = Math.round((plan.durationSec * plan.bpm) / 60);
  const totalEighths = totalBeats * 2;
  
  // Kick pattern (every beat)
  let kickList = '';
  for (let i = 0; i < totalEighths; i++) {
    if (i % 2 === 0) { // Every beat
      kickList += `file '${join(outputDir, 'kick_seg.wav')}'\\n`;
    } else {
      kickList += `file '${join(outputDir, 'silence.wav')}'\\n`;
    }
  }
  writeFileSync(join(outputDir, 'kick_list.txt'), kickList);
  
  // Snare pattern (beats 2 & 4)
  let snareList = '';
  for (let i = 0; i < totalEighths; i++) {
    const beat = Math.floor(i / 2) + 1;
    if (beat % 4 === 2 || beat % 4 === 0) { // Beats 2 & 4
      snareList += `file '${join(outputDir, 'snare_seg.wav')}'\\n`;
    } else {
      snareList += `file '${join(outputDir, 'silence.wav')}'\\n`;
    }
  }
  writeFileSync(join(outputDir, 'snare_list.txt'), snareList);
  
  // Hat pattern (every eighth)
  let hatList = '';
  for (let i = 0; i < totalEighths; i++) {
    hatList += `file '${join(outputDir, 'hat_seg.wav')}'\\n`;
  }
  writeFileSync(join(outputDir, 'hat_list.txt'), hatList);
  
  // Bass pattern (beats 1 & 3)
  let bassList = '';
  for (let i = 0; i < totalEighths; i++) {
    const beat = Math.floor(i / 2) + 1;
    if (beat % 4 === 1 || beat % 4 === 3) { // Beats 1 & 3
      bassList += `file '${join(outputDir, 'bass_seg.wav')}'\\n`;
    } else {
      bassList += `file '${join(outputDir, 'silence.wav')}'\\n`;
    }
  }
  writeFileSync(join(outputDir, 'bass_list.txt'), bassList);
  
  // Lead pattern (every eighth with arpeggio)
  let leadList = '';
  for (let i = 0; i < totalEighths; i++) {
    leadList += `file '${join(outputDir, 'lead_seg.wav')}'\\n`;
  }
  writeFileSync(join(outputDir, 'lead_list.txt'), leadList);
  
  // Concatenate stems
  console.log('Building full-length stems...');
  await execAsync(`ffmpeg -f concat -safe 0 -i "${join(outputDir, 'kick_list.txt')}" -ar 44100 -ac 1 -y "${join(outputDir, 'kick.wav')}"`);
  await execAsync(`ffmpeg -f concat -safe 0 -i "${join(outputDir, 'snare_list.txt')}" -ar 44100 -ac 1 -y "${join(outputDir, 'snare.wav')}"`);
  await execAsync(`ffmpeg -f concat -safe 0 -i "${join(outputDir, 'hat_list.txt')}" -ar 44100 -ac 1 -y "${join(outputDir, 'hats.wav')}"`);
  await execAsync(`ffmpeg -f concat -safe 0 -i "${join(outputDir, 'bass_list.txt')}" -ar 44100 -ac 1 -y "${join(outputDir, 'bass.wav')}"`);
  await execAsync(`ffmpeg -f concat -safe 0 -i "${join(outputDir, 'lead_list.txt')}" -ar 44100 -ac 1 -y "${join(outputDir, 'lead.wav')}"`);
}

async function generateStemsWithWasm(plan: MusicPlan, outputDir: string): Promise<void> {
  // Fallback implementation using Web Audio API concepts
  // This would require additional WASM modules - for now, create simple files
  const duration = plan.durationSec;
  const sampleRate = 44100;
  const samples = duration * sampleRate;
  
  // Create simple sine wave stems (placeholder)
  const createSimpleWav = (frequency: number, amplitude: number, filename: string) => {
    const buffer = Buffer.alloc(44 + samples * 2);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples * 2, 40);
    
    // Generate samples
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * amplitude * 32767;
      buffer.writeInt16LE(sample, 44 + i * 2);
    }
    
    writeFileSync(join(outputDir, filename), buffer);
  };
  
  createSimpleWav(56, 0.8, 'kick.wav');
  createSimpleWav(1800, 0.3, 'snare.wav');
  createSimpleWav(8000, 0.2, 'hats.wav');
  createSimpleWav(110, 0.6, 'bass.wav');
  createSimpleWav(440, 0.5, 'lead.wav');
}

async function createFinalMix(outputDir: string, mode: "cli" | "wasm"): Promise<void> {
  if (mode === "cli") {
    console.log('Mixing stems...');
    await execAsync(`ffmpeg -i "${join(outputDir, 'kick.wav')}" -i "${join(outputDir, 'snare.wav')}" -i "${join(outputDir, 'hats.wav')}" -i "${join(outputDir, 'bass.wav')}" -i "${join(outputDir, 'lead.wav')}" -filter_complex "[0:a][1:a][2:a][3:a][4:a]amix=inputs=5:normalize=0,dynaudnorm[out]" -map "[out]" -y "${join(outputDir, 'preview.wav')}"`);
  } else {
    // Simple mix for WASM mode - copy first stem as placeholder
    const fs = await import('fs/promises');
    await fs.copyFile(join(outputDir, 'kick.wav'), join(outputDir, 'preview.wav'));
  }
}

async function generateVocals(lyrics: string, duration: number, outputDir: string, mode: "cli" | "wasm"): Promise<void> {
  if (mode === "cli") {
    // Generate simple vocal tone
    await execAsync(`ffmpeg -f lavfi -i "sine=f=440:d=${duration}" -af "anequalizer=f=700:width_type=h:width=150:g=6,anequalizer=f=1200:width_type=h:width=180:g=4,anequalizer=f=2600:width_type=h:width=250:g=3,afade=t=out:st=${duration-0.04}:d=0.04" -y "${join(outputDir, 'vocals.wav')}"`);
    
    // Create captions.srt
    const words = lyrics.split(' ');
    const wordsPerMinute = 190;
    const wordsPerSecond = wordsPerMinute / 60;
    const secondsPerWord = 1 / wordsPerSecond;
    
    let srtContent = '';
    let currentTime = 0;
    let lineIndex = 1;
    
    for (let i = 0; i < words.length; i += 8) { // 8 words per subtitle
      const lineWords = words.slice(i, i + 8);
      const lineDuration = lineWords.length * secondsPerWord;
      const startTime = formatSRTTime(currentTime);
      const endTime = formatSRTTime(currentTime + lineDuration);
      
      srtContent += `${lineIndex}\n${startTime} --> ${endTime}\n${lineWords.join(' ')}\n\n`;
      
      currentTime += lineDuration;
      lineIndex++;
    }
    
    writeFileSync(join(outputDir, 'captions.srt'), srtContent);
  }
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

async function createVocalMix(outputDir: string, mode: "cli" | "wasm"): Promise<void> {
  if (mode === "cli") {
    await execAsync(`ffmpeg -i "${join(outputDir, 'kick.wav')}" -i "${join(outputDir, 'snare.wav')}" -i "${join(outputDir, 'hats.wav')}" -i "${join(outputDir, 'bass.wav')}" -i "${join(outputDir, 'lead.wav')}" -i "${join(outputDir, 'vocals.wav')}" -filter_complex "[0:a]volume=0.9[d];[1:a]volume=0.9[s];[2:a]volume=0.7[h];[3:a]volume=0.7[b];[4:a]volume=0.7[l];[5:a]volume=0.8[v];[d][s][h][b][l][v]amix=inputs=6:normalize=0,alimiter=limit=0.95,dynaudnorm,loudnorm=I=-14:TP=-1.0:LRA=11[out]" -map "[out]" -ar 44100 -ac 2 -y "${join(outputDir, 'mix.wav')}"`);
  }
}

async function generateVideo(style: string, lyrics: string | undefined, outputDir: string, mode: "cli" | "wasm"): Promise<string | undefined> {
  if (mode !== "cli") return undefined;
  
  const audioFile = existsSync(join(outputDir, 'mix.wav')) ? 'mix.wav' : 'preview.wav';
  
  try {
    switch (style) {
      case "Lyric Video":
        if (lyrics && existsSync(join(outputDir, 'captions.srt'))) {
          await execAsync(`ffmpeg -i "${join(outputDir, audioFile)}" -vf "subtitles=${join(outputDir, 'captions.srt')},format=yuv420p,scale=1280:720" -r 30 -shortest -y "${join(outputDir, 'final.mp4')}"`);
          return 'final.mp4';
        }
        break;
        
      case "Official Music Video":
        await execAsync(`ffmpeg -i "${join(outputDir, audioFile)}" -filter_complex "[0:a]showspectrum=s=1280x720:mode=combined:color=rainbow,tmix=frames=3,eq=contrast=1.12[v]" -map "[v]" -map 0:a -r 30 -shortest -pix_fmt yuv420p -y "${join(outputDir, 'final.mp4')}"`);
        return 'final.mp4';
        
      case "Abstract Visualizer":
        await execAsync(`ffmpeg -i "${join(outputDir, audioFile)}" -filter_complex "[0:a]showwaves=s=1280x720:mode=cline,eq=contrast=1.2:brightness=0.02,format=yuv420p[v]" -map "[v]" -map 0:a -r 30 -shortest -y "${join(outputDir, 'final.mp4')}"`);
        return 'final.mp4';
    }
  } catch (error) {
    console.error('Video generation failed:', error);
    return undefined;
  }
  
  return undefined;
}