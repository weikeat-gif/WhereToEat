import { useCallback, useEffect, useRef, useState } from 'react';

import { toUserMessage } from '@/services/supabase/errors';

import {
  savedPlacesRepository,
  toggleSavedPlace,
  type SavedPlacesRepository,
} from './saved-service';

export function useSavedPlaces(
  userId: string | null,
  repository: SavedPlacesRepository = savedPlacesRepository,
) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const idsRef = useRef(savedIds);

  const update = useCallback((next: Set<string>) => {
    idsRef.current = next;
    setSavedIds(next);
  }, []);

  useEffect(() => {
    let active = true;
    setError(null);
    if (!userId) {
      update(new Set());
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    repository
      .list(userId)
      .then((rows) => {
        if (active) update(new Set(rows.map((row) => row.googlePlaceId)));
      })
      .catch((loadError: unknown) => {
        if (active) setError(toUserMessage(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [repository, update, userId]);

  const toggle = useCallback(
    async (googlePlaceId: string) => {
      setError(null);
      try {
        return await toggleSavedPlace({
          userId,
          googlePlaceId,
          current: idsRef.current,
          repository,
          update,
        });
      } catch (toggleError) {
        setError(toUserMessage(toggleError));
        throw toggleError;
      }
    },
    [repository, update, userId],
  );

  return { savedIds, isLoading, error, toggle };
}
