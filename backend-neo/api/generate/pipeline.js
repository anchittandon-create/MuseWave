import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

// In-memory job tracking (use database in production)
const jobs = new Map();

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    musicPrompt, 
    genres, 
    duration, 
    durationSec,
    artistInspiration, 
    lyrics,
    generateVideo = false,
    videoStyles = [],
    languages = []
  } = request.body || {};

  const actualDuration = duration || durationSec || 90;

  // Generate unique job ID
  const jobId = uuidv4();
  
  // Initialize job
  jobs.set(jobId, {
    id: jobId,
    status: 'pending',
    progress: 0,
    message: 'Job queued for processing...',
    createdAt: new Date().toISOString(),
    result: null,
    error: null
  });

  // Return job ID immediately
  response.status(202).json({ 
    jobId, 
    message: 'Generation started',
    status: 'processing'
  });

  // Process job asynchronously
  processJob(jobId, {
    musicPrompt,
    genres: Array.isArray(genres) ? genres : [],
    duration: actualDuration,
    artistInspiration: Array.isArray(artistInspiration) ? artistInspiration : [],
    lyrics: lyrics || '',
    generateVideo,
    videoStyles: Array.isArray(videoStyles) ? videoStyles : [],
    languages: Array.isArray(languages) ? languages : []
  });
}

async function processJob(jobId, payload) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const path = await import('path');

  const execAsync = promisify(exec);
  
  try {
    const job = jobs.get(jobId);
    if (!job) return;

    // Update job progress: Planning phase
    job.status = 'running';
    job.progress = 10;
    job.message = 'Planning your track...';
    job.currentStage = 'planning';

    // Step 1: Generate plan using Gemini
    let plan = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const planPrompt = `Generate a detailed music plan for a song with the following details:
- Prompt: ${payload.musicPrompt}
- Genres: ${payload.genres.join(', ')}
- Duration: ${payload.duration} seconds
- Artist Inspiration: ${payload.artistInspiration.join(', ')}
- Lyrics: ${payload.lyrics}
- Languages: ${payload.languages.join(', ')}

Provide a JSON object with: title, genre, bpm, key, sections (array), duration_sec.`;

        const planResult = await model.generateContent(planPrompt);
        const planResponse = await planResult.response;
        const planText = planResponse.text();
        plan = JSON.parse(planText.replace(/```json\n?/, '').replace(/```\n?$/, ''));
      } catch (err) {
        console.warn('Gemini plan generation failed, using fallback:', err);
      }
    }

    // Fallback plan if Gemini fails
    if (!plan) {
      plan = {
        title: payload.musicPrompt.substring(0, 30) || 'Generated Track',
        genre: payload.genres[0] || 'electronic',
        bpm: 120,
        key: 'C major',
        sections: ['intro', 'verse', 'chorus', 'bridge', 'outro'],
        duration_sec: payload.duration
      };
    }

    // Update progress: Generating instruments
    job.progress = 25;
    job.message = 'Generating instruments...';
    job.currentStage = 'generating-instruments';

    // Ensure assets directory exists
    const assetsDir = path.join(process.cwd(), 'api', 'assets');
    try {
      await fs.mkdir(assetsDir, { recursive: true });
    } catch (err) {
      console.warn('Assets directory creation warning:', err);
    }

    const timestamp = Date.now();
    
    // Step 2: Generate audio (using simple test audio for now)
    job.progress = 40;
    job.message = 'Synthesizing audio stems...';
    
    const audioFilename = `audio-${timestamp}.wav`;
    const audioPath = path.join(assetsDir, audioFilename);
    const audioCommand = `ffmpeg -f lavfi -i "sine=frequency=440:duration=${payload.duration}" -acodec pcm_s16le -ar 44100 "${audioPath}"`;
    await execAsync(audioCommand);

    // Step 3: Generate vocals if lyrics exist
    job.progress = 60;
    job.message = 'Creating vocals...';
    job.currentStage = 'synthesizing-vocals';
    
    let finalAudioPath = audioPath;
    let finalAudioFilename = audioFilename;
    
    if (payload.lyrics) {
      const vocalsFilename = `vocals-${timestamp}.wav`;
      const vocalsPath = path.join(assetsDir, vocalsFilename);
      const vocalsCommand = `ffmpeg -f lavfi -i "sine=frequency=660:duration=${Math.min(payload.duration, 10)}" -acodec pcm_s16le -ar 44100 "${vocalsPath}"`;
      await execAsync(vocalsCommand);

      // Mix audio and vocals
      job.progress = 70;
      job.message = 'Mixing audio and vocals...';
      job.currentStage = 'mixing-mastering';
      
      const mixFilename = `mix-${timestamp}.wav`;
      const mixPath = path.join(assetsDir, mixFilename);
      const mixCommand = `ffmpeg -i "${audioPath}" -i "${vocalsPath}" -filter_complex "[0:a][1:a]amix=inputs=2:duration=first[aout]" -map "[aout]" "${mixPath}"`;
      await execAsync(mixCommand);
      
      finalAudioPath = mixPath;
      finalAudioFilename = mixFilename;
    }

    // Step 4: Generate videos if requested
    let videoUrls = null;
    if (payload.generateVideo && payload.videoStyles.length > 0) {
      job.progress = 80;
      job.message = 'Rendering video content...';
      job.currentStage = 'rendering-video';
      
      videoUrls = {};
      
      for (const style of payload.videoStyles) {
        try {
          const videoFilename = `video-${style}-${timestamp}.mp4`;
          const videoPath = path.join(assetsDir, videoFilename);
          
          // Create a simple colored background video based on style
          let backgroundColor = '#000000';
          let textColor = '#FFFFFF';
          
          switch (style) {
            case 'lyric':
              backgroundColor = '#1a1a2e';
              textColor = '#eee';
              break;
            case 'official':
              backgroundColor = '#16213e';
              textColor = '#0f3460';
              break;
            case 'abstract':
              backgroundColor = '#2d1b69';
              textColor = '#f39c12';
              break;
          }
          
          // Generate video with lyrics or title overlay
          const overlayText = payload.lyrics || plan.title || 'Generated Music';
          const videoCommand = `ffmpeg -f lavfi -i "color=c=${backgroundColor}:size=1280x720:duration=${payload.duration}" -i "${finalAudioPath}" -vf "drawtext=text='${overlayText.replace(/'/g, "\\'")}':fontcolor=${textColor}:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -c:a aac -shortest "${videoPath}"`;
          
          await execAsync(videoCommand);
          videoUrls[style] = videoFilename;
        } catch (videoErr) {
          console.error(`Failed to generate ${style} video:`, videoErr);
        }
      }
    }

    // Finalize job
    job.progress = 100;
    job.message = 'Generation complete!';
    job.status = 'completed';
    job.currentStage = 'complete';
    job.result = {
      audio: finalAudioFilename,
      videos: videoUrls,
      plan: plan
    };
    job.audioUrl = `/api/assets/${finalAudioFilename}`;
    job.videoUrls = videoUrls ? Object.fromEntries(
      Object.entries(videoUrls).map(([style, filename]) => [style, `/api/assets/${filename}`])
    ) : null;

  } catch (error) {
    console.error('Error in pipeline processing:', error);
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error.message || 'Generation failed';
      job.message = `Failed: ${error.message}`;
    }
  }
}

// Export jobs map for the jobs API
export { jobs };