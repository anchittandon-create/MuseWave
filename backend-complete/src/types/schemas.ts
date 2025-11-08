import { z } from 'zod';

/**
 * Request/Response Schemas for MuseForge Pro API
 */

export const GenerateRequestSchema = z.object({
  musicPrompt: z.string().min(10).max(500),
  genres: z.array(z.string()).min(1).max(5),
  durationSec: z.number().int().min(30).max(300),
  artistInspiration: z.array(z.string()).max(5).optional(),
  lyrics: z.string().max(5000).optional(),
  vocalLanguages: z.array(z.string()).max(3).optional(),
  generateVideo: z.boolean().default(false),
  videoStyles: z.array(z.string()).max(3).optional(),
  seed: z.number().optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const GenerateResponseSchema = z.object({
  id: z.string().uuid(),
  bpm: z.number(),
  key: z.string(),
  scale: z.string(),
  assets: z.object({
    instrumentalUrl: z.string().url().optional(),
    vocalsUrl: z.string().url().optional(),
    mixUrl: z.string().url(),
    videoUrl: z.string().url().optional(),
    videoUrls: z.record(z.string()).optional(),
  }),
  aiSuggestions: z.object({
    musicPrompt: z.string(),
    genres: z.array(z.string()),
    artistInspiration: z.array(z.string()),
    lyrics: z.string().optional(),
    vocalLanguages: z.array(z.string()),
    videoStyles: z.array(z.string()),
  }),
  engines: z.object({
    music: z.enum(['riffusion', 'dsp', 'none']),
    melody: z.enum(['magenta', 'fluidsynth', 'dsp', 'none']),
    vocals: z.enum(['coqui', 'dsp', 'none']),
    video: z.enum(['ffmpeg', 'none']),
  }),
  status: z.enum(['success', 'partial', 'error']),
  processingTimeMs: z.number().optional(),
  warnings: z.array(z.string()).optional(),
});

export type GenerateResponse = z.infer<typeof GenerateResponseSchema>;

export const SuggestRequestSchema = z.object({
  field: z.enum(['musicPrompt', 'genres', 'artistInspiration', 'lyrics', 'vocalLanguages', 'videoStyles']),
  context: z.object({
    musicPrompt: z.string().optional(),
    genres: z.array(z.string()).optional(),
    artistInspiration: z.array(z.string()).optional(),
    lyrics: z.string().optional(),
    durationSec: z.number().optional(),
  }).optional(),
});

export type SuggestRequest = z.infer<typeof SuggestRequestSchema>;

export const DashboardStatsSchema = z.object({
  totalGenerations: z.number(),
  totalDurationSec: z.number(),
  averageBpm: z.number(),
  popularGenres: z.array(z.object({
    genre: z.string(),
    count: z.number(),
  })),
  recentGenerations: z.array(z.object({
    id: z.string(),
    createdAt: z.string(),
    bpm: z.number(),
    key: z.string(),
    genres: z.array(z.string()),
    durationSec: z.number(),
    hasVideo: z.boolean(),
    mixUrl: z.string(),
    videoUrl: z.string().optional(),
  })),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

export const ListGenerationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['createdAt', 'bpm', 'durationSec']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListGenerationsQuery = z.infer<typeof ListGenerationsQuerySchema>;
