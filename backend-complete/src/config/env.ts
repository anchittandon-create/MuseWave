import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),

  // Python
  PYTHON_BIN: z.string().default('python3'),
  PYTHON_VENV: z.string().optional(),

  // Model Paths
  RIFFUSION_PATH: z.string().optional(),
  MAGENTA_PATH: z.string().optional(),
  COQUI_PATH: z.string().optional(),
  SOUND_FONT_PATH: z.string().default('/usr/share/sounds/sf2/GeneralUser_GS.sf2'),

  // FFmpeg
  FFMPEG_PATH: z.string().optional(),
  FFPROBE_PATH: z.string().optional(),
  VIDEO_QUALITY: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
  VIDEO_PRESET: z.enum(['ultrafast', 'fast', 'medium', 'slow']).default('medium'),

  // Storage
  ASSETS_DIR: z.string().default('./public/assets'),
  ASSETS_BASE_URL: z.string().default('http://localhost:4000/assets'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(500),

  // Database
  DATABASE_PATH: z.string().default('./data/generations.db'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(true),

  // AI Suggestions
  SUGGESTION_CACHE_SIZE: z.coerce.number().default(5),
  SUGGESTION_CROSSOVER_CHANCE: z.coerce.number().default(0.15),
  SUGGESTION_UNIQUE_THRESHOLD: z.coerce.number().default(0.7),

  // Generation
  DEFAULT_DURATION_SEC: z.coerce.number().default(90),
  MIN_DURATION_SEC: z.coerce.number().default(30),
  MAX_DURATION_SEC: z.coerce.number().default(300),
  DEFAULT_BPM: z.coerce.number().default(120),
  DEFAULT_SAMPLE_RATE: z.coerce.number().default(44100),
  DEFAULT_CHANNELS: z.coerce.number().default(2),

  // Audio Processing
  NORMALIZE_AUDIO: z.coerce.boolean().default(true),
  LOUDNESS_TARGET: z.coerce.number().default(-14),
  TRUE_PEAK_LIMIT: z.coerce.number().default(-1.0),
  LRA_TARGET: z.coerce.number().default(11),

  // Video
  DEFAULT_VIDEO_WIDTH: z.coerce.number().default(1920),
  DEFAULT_VIDEO_HEIGHT: z.coerce.number().default(1080),
  DEFAULT_VIDEO_FPS: z.coerce.number().default(30),
  DEFAULT_VIDEO_BITRATE: z.string().default('5000k'),

  // Fallbacks
  USE_DSP_FALLBACK: z.coerce.boolean().default(true),
  ENABLE_MAGENTA: z.coerce.boolean().default(true),
  ENABLE_RIFFUSION: z.coerce.boolean().default(true),
  ENABLE_COQUI: z.coerce.boolean().default(true),

  // Vercel
  VERCEL: z.coerce.boolean().default(false),
  VERCEL_URL: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);
