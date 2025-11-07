/**
 * Vercel Serverless Function - Model Capabilities Check
 * Entry point for /api/capabilities
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { openSourceBridge } from '../src/services/openSourceBridge';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const capabilities = await openSourceBridge.detectCapabilities();

    return res.status(200).json({
      success: true,
      capabilities,
      models: {
        riffusion: {
          available: capabilities.riffusion,
          description: 'Text-to-music diffusion model',
          license: 'MIT',
          fallback: 'Procedural audio generation'
        },
        magenta: {
          available: capabilities.magenta,
          description: 'MIDI melody generation',
          license: 'Apache 2.0',
          fallback: 'Simple MIDI composition'
        },
        coquiTTS: {
          available: capabilities.coquiTTS,
          description: 'Text-to-speech synthesis',
          license: 'MPL 2.0',
          fallback: 'Robotic voice synthesis'
        },
        fluidSynth: {
          available: capabilities.fluidSynth,
          description: 'MIDI to audio synthesis',
          license: 'LGPL',
          required: true
        },
        ffmpeg: {
          available: capabilities.ffmpeg,
          description: 'Audio mixing and video generation',
          license: 'GPL/LGPL',
          required: true
        }
      },
      info: {
        allModelsAvailable: capabilities.riffusion && capabilities.magenta && capabilities.coquiTTS && capabilities.fluidSynth && capabilities.ffmpeg,
        coreModelsAvailable: capabilities.fluidSynth && capabilities.ffmpeg,
        gracefulFallbacks: true
      }
    });

  } catch (error) {
    console.error('[Vercel] Capabilities check error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
