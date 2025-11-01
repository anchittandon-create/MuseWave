import { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check ffmpeg availability
    let ffmpegStatus = 'unavailable';
    try {
      await execAsync('ffmpeg -version');
      ffmpegStatus = 'available';
    } catch (error) {
      ffmpegStatus = 'unavailable (fallback to WASM)';
    }

    // Check environment variables
    const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ffmpeg: ffmpegStatus,
      gemini: hasGeminiKey ? 'configured' : 'using fallback',
      backend: 'operational',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
