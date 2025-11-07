import { z } from 'zod';
import path from 'path';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  AUTH_SECRET: z.string().min(8),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(60),
  ASSETS_DIR: z.string().default('./assets'),
  USE_S3: z.coerce.boolean().default(false),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  
  // Python engine paths
  PYTHON_BIN: z.string().default('python3'),
  RIFFUSION_PATH: z.string().optional(),
  MAGENTA_PATH: z.string().optional(),
  COQUI_TTS_PATH: z.string().optional(),
  
  // Binary paths
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
  FLUIDSYNTH_PATH: z.string().default('fluidsynth'),
  SOUND_FONT_PATH: z.string().default(path.join(process.cwd(), 'assets', 'GeneralUser.sf2')),
  
  // Generation settings
  DEFAULT_DURATION_SEC: z.coerce.number().int().positive().default(90),
  MAX_DURATION_SEC: z.coerce.number().int().positive().default(300),
  DEFAULT_SAMPLE_RATE: z.coerce.number().int().positive().default(44100),
  GENERATION_TIMEOUT_MS: z.coerce.number().int().positive().default(600000),
  MAX_CONCURRENT_GENERATIONS: z.coerce.number().int().positive().default(3),
});

export const env = envSchema.parse(process.env);
