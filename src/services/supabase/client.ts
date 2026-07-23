import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { env } from '@/config/env';

export const isSupabaseConfigured =
  env.EXPO_PUBLIC_DATA_MODE === 'live' &&
  Boolean(env.EXPO_PUBLIC_SUPABASE_URL && env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(
      env.EXPO_PUBLIC_SUPABASE_URL!,
      env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
          lock: processLock,
        },
      },
    )
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
