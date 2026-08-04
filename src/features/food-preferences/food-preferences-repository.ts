import type {
  FoodPreferenceKey,
  FoodPreferenceRecord,
} from '@/contracts/food-preference';
import { supabase } from '@/services/supabase/client';
import { BackendUnavailableError } from '@/services/supabase/errors';

import { isFoodPreferenceKey } from './food-preference-policy';

export interface FoodPreferencesRepository {
  list(userId: string): Promise<FoodPreferenceRecord[]>;
  set(
    userId: string,
    key: FoodPreferenceKey,
    enabled: boolean,
  ): Promise<void>;
}

export class SupabaseFoodPreferencesRepository
  implements FoodPreferencesRepository
{
  async list(userId: string): Promise<FoodPreferenceRecord[]> {
    if (!supabase) throw new BackendUnavailableError();
    const { data, error } = await supabase
      .from('food_preferences')
      .select('user_id,preference_key,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? [])
      .filter(
        (row) =>
          row.user_id === userId && isFoodPreferenceKey(row.preference_key),
      )
      .map((row) => ({
        userId: row.user_id,
        key: row.preference_key as FoodPreferenceKey,
        createdAt: row.created_at,
      }));
  }

  async set(userId: string, key: FoodPreferenceKey, enabled: boolean) {
    if (!supabase) throw new BackendUnavailableError();
    if (enabled) {
      const { error } = await supabase
        .from('food_preferences')
        .upsert(
          { user_id: userId, preference_key: key },
          {
            ignoreDuplicates: true,
            onConflict: 'user_id,preference_key',
          },
        );
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await supabase
      .from('food_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('preference_key', key);
    if (error) throw new Error(error.message);
  }
}

export const foodPreferencesRepository =
  new SupabaseFoodPreferencesRepository();
