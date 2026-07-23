import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_DATA_MODE: z.enum(['mock', 'live']).default('mock'),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_PLACES_PROXY_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_DATA_MODE: process.env.EXPO_PUBLIC_DATA_MODE,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || undefined,
  EXPO_PUBLIC_SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || undefined,
  EXPO_PUBLIC_PLACES_PROXY_URL:
    process.env.EXPO_PUBLIC_PLACES_PROXY_URL || undefined,
});

export const hasLiveBackend =
  env.EXPO_PUBLIC_DATA_MODE === 'live' &&
  Boolean(
    env.EXPO_PUBLIC_SUPABASE_URL &&
      env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
      env.EXPO_PUBLIC_PLACES_PROXY_URL,
  );
