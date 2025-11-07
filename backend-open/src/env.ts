import { z } from 'zod';

const EnvSchema = z.object({
  API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  DATABASE_URL: z.string().optional(),
  ASSETS_BASE_URL: z.string().default('http://localhost:4000'),
  FFMPEG_PATH: z.string().optional(),
  FFPROBE_PATH: z.string().optional(),
  PYTHON_BIN: z.string().default('python3'),
  SOUND_FONT_PATH: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
