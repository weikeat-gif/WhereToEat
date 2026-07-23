import type { SavedPlace } from '@/contracts/place';
import { supabase } from '@/services/supabase/client';
import { BackendUnavailableError } from '@/services/supabase/errors';

export interface SavedPlacesRepository {
  list(userId: string): Promise<SavedPlace[]>;
  save(userId: string, googlePlaceId: string): Promise<SavedPlace>;
  remove(userId: string, googlePlaceId: string): Promise<void>;
}

export class SupabaseSavedPlacesRepository implements SavedPlacesRepository {
  async list(userId: string): Promise<SavedPlace[]> {
    if (!supabase) throw new BackendUnavailableError();
    const { data, error } = await supabase
      .from('saved_places')
      .select('user_id,google_place_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      userId: row.user_id,
      googlePlaceId: row.google_place_id,
      createdAt: row.created_at,
    }));
  }

  async save(userId: string, googlePlaceId: string): Promise<SavedPlace> {
    if (!supabase) throw new BackendUnavailableError();
    const { data, error } = await supabase
      .from('saved_places')
      .upsert(
        { user_id: userId, google_place_id: googlePlaceId },
        { onConflict: 'user_id,google_place_id' },
      )
      .select('user_id,google_place_id,created_at')
      .single();
    if (error) throw new Error(error.message);
    return {
      userId: data.user_id,
      googlePlaceId: data.google_place_id,
      createdAt: data.created_at,
    };
  }

  async remove(userId: string, googlePlaceId: string): Promise<void> {
    if (!supabase) throw new BackendUnavailableError();
    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('user_id', userId)
      .eq('google_place_id', googlePlaceId);
    if (error) throw new Error(error.message);
  }
}

export const savedPlacesRepository = new SupabaseSavedPlacesRepository();

export class AuthRequiredError extends Error {
  constructor() {
    super('Sign in to save restaurants.');
    this.name = 'AuthRequiredError';
  }
}

type ToggleSavedPlaceOptions = {
  userId: string | null;
  googlePlaceId: string;
  current: ReadonlySet<string>;
  repository: SavedPlacesRepository;
  update: (next: Set<string>) => void;
};

export async function toggleSavedPlace({
  userId,
  googlePlaceId,
  current,
  repository,
  update,
}: ToggleSavedPlaceOptions): Promise<boolean> {
  if (!userId) throw new AuthRequiredError();

  const wasSaved = current.has(googlePlaceId);
  const optimistic = new Set(current);
  if (wasSaved) optimistic.delete(googlePlaceId);
  else optimistic.add(googlePlaceId);
  update(optimistic);

  try {
    if (wasSaved) await repository.remove(userId, googlePlaceId);
    else await repository.save(userId, googlePlaceId);
    return !wasSaved;
  } catch (error) {
    update(new Set(current));
    throw error;
  }
}
