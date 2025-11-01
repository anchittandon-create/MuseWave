import { VercelRequest, VercelResponse } from '@vercel/node';

interface GenerateCreativeAssetsRequest {
  musicPlan: {
    title: string;
    genre: string;
    bpm: number;
    sections: Array<{
      name: string;
      durationBars: number;
    }>;
  };
  videoStyles: string[];
  lyrics: string;
}

interface CreativeAssets {
  lyricsAlignment: Array<{
    time: string;
    line: string;
  }>;
  videoStoryboard: Record<string, string>;
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
    const { musicPlan, videoStyles, lyrics }: GenerateCreativeAssetsRequest = req.body;
    
    if (!musicPlan) {
      res.status(400).json({ error: 'Missing required field: musicPlan' });
      return;
    }
    
    // Try Gemini generation if available
    if (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY) {
      try {
        const assets = await generateWithGemini({ musicPlan, videoStyles, lyrics });
        res.status(200).json(assets);
        return;
      } catch (error) {
        console.warn('Gemini creative assets generation failed, using fallback:', error.message);
      }
    }
    
    // Fallback generation
    const assets = generateAssetsFallback({ musicPlan, videoStyles, lyrics });
    res.status(200).json(assets);
    
  } catch (error) {
    console.error('Creative assets generation error:', error);
    res.status(500).json({ 
      error: 'Creative assets generation failed',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function generateWithGemini(request: GenerateCreativeAssetsRequest): Promise<CreativeAssets> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Generate creative assets for this music production:

MUSIC PLAN:
Title: ${request.musicPlan.title}
Genre: ${request.musicPlan.genre}
BPM: ${request.musicPlan.bpm}
Sections: ${request.musicPlan.sections.map(s => `${s.name} (${s.durationBars} bars)`).join(', ')}

VIDEO STYLES: ${request.videoStyles?.join(', ') || 'None specified'}

LYRICS:
${request.lyrics || 'Instrumental track'}

Generate:

1. LYRICS ALIGNMENT: Break down lyrics into timed segments that align with the music structure
2. VIDEO STORYBOARD: Create visual concepts for each requested video style

Return ONLY a valid JSON object in this exact format:

{
  "lyricsAlignment": [
    {
      "time": "0:00-0:16",
      "line": "First verse line here"
    }
  ],
  "videoStoryboard": {
    "Lyric Video": "Visual concept description",
    "Official Music Video": "Video concept description"
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

function generateAssetsFallback(request: GenerateCreativeAssetsRequest): CreativeAssets {
  const { musicPlan, videoStyles, lyrics } = request;
  
  // Generate lyrics alignment based on song structure
  const lyricsAlignment: Array<{ time: string; line: string }> = [];
  
  if (lyrics && lyrics.trim()) {
    const lines = lyrics.split('\n').filter(line => line.trim() && 
      !line.includes('Verse') && 
      !line.includes('Chorus') && 
      !line.includes('Bridge') &&
      !line.includes('Outro'));
    
    // Calculate timing based on BPM and structure
    const beatsPerMinute = musicPlan.bpm;
    const secondsPerBeat = 60 / beatsPerMinute;
    const barsPerSection = 8; // Average bars per section
    const beatsPerBar = 4;
    const secondsPerSection = barsPerSection * beatsPerBar * secondsPerBeat;
    
    let currentTime = 0;
    let lineIndex = 0;
    
    for (const section of musicPlan.sections) {
      const sectionDuration = section.durationBars * beatsPerBar * secondsPerBeat;
      const linesInSection = Math.min(4, lines.length - lineIndex); // Max 4 lines per section
      
      for (let i = 0; i < linesInSection; i++) {
        if (lineIndex < lines.length) {
          const lineStart = currentTime + (i * sectionDuration / linesInSection);
          const lineEnd = currentTime + ((i + 1) * sectionDuration / linesInSection);
          
          lyricsAlignment.push({
            time: `${Math.floor(lineStart / 60)}:${String(Math.floor(lineStart % 60)).padStart(2, '0')}-${Math.floor(lineEnd / 60)}:${String(Math.floor(lineEnd % 60)).padStart(2, '0')}`,
            line: lines[lineIndex].trim()
          });
          
          lineIndex++;
        }
      }
      
      currentTime += sectionDuration;
    }
  }
  
  // Generate video storyboard concepts
  const videoStoryboard: Record<string, string> = {};
  
  if (videoStyles && videoStyles.length > 0) {
    videoStyles.forEach(style => {
      switch (style.toLowerCase()) {
        case 'lyric video':
          videoStoryboard[style] = `Animated typography displaying lyrics with ${musicPlan.genre}-inspired visual effects. Features kinetic text, particle systems, and color schemes that match the ${musicPlan.bpm} BPM energy. Lyrics appear and animate in sync with the vocal delivery, with special emphasis on chorus sections.`;
          break;
          
        case 'official music video':
          if (musicPlan.genre.toLowerCase().includes('house') || musicPlan.genre.toLowerCase().includes('techno')) {
            videoStoryboard[style] = `Underground club atmosphere with strobe lighting, DJ performance shots, and crowd dancing. Features intimate close-ups during verses, wide shots of the dancefloor during drops, and artistic lighting that pulses with the ${musicPlan.bpm} BPM rhythm.`;
          } else if (musicPlan.genre.toLowerCase().includes('ambient')) {
            videoStoryboard[style] = `Cinematic nature scenes with time-lapse photography, flowing water, and ethereal lighting. Slow, meditative camera movements that complement the ambient soundscape, featuring abstract visual metaphors for the musical journey.`;
          } else {
            videoStoryboard[style] = `Artist performance in a visually striking location, with creative cinematography that matches the ${musicPlan.genre} genre. Incorporates dynamic lighting, interesting camera angles, and visual effects that enhance the emotional impact of the music.`;
          }
          break;
          
        case 'abstract visualizer':
          videoStoryboard[style] = `Computer-generated abstract visuals that react to the music's frequency spectrum. Features geometric shapes, particle systems, and fluid simulations that pulse and morph with the ${musicPlan.bpm} BPM rhythm. Color palette evolves throughout the track sections, creating a hypnotic audio-visual experience.`;
          break;
          
        case 'performance video':
          videoStoryboard[style] = `Live performance capture featuring the artist and band in a studio or intimate venue setting. Multiple camera angles showcase the musical performance, with focus on instrument details and artist expressions. Lighting designed to enhance the ${musicPlan.genre} aesthetic.`;
          break;
          
        default:
          videoStoryboard[style] = `Creative visual interpretation of "${musicPlan.title}" in ${style} style. Combines artistic cinematography with ${musicPlan.genre} music aesthetic, featuring dynamic visuals that complement the ${musicPlan.bpm} BPM energy and emotional tone of the track.`;
      }
    });
  }
  
  return {
    lyricsAlignment,
    videoStoryboard
  };
}