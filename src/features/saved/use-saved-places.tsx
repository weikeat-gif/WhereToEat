import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import { toUserMessage } from '@/services/supabase/errors';

import {
  savedPlacesRepository,
  toggleSavedPlace,
  type SavedPlacesRepository,
} from './saved-service';

function useSavedPlacesState(
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

type SavedPlacesContextValue = ReturnType<typeof useSavedPlacesState>;

const SavedPlacesContext = createContext<SavedPlacesContextValue | undefined>(
  undefined,
);

export function SavedPlacesProvider({
  children,
  repository = savedPlacesRepository,
}: PropsWithChildren<{ repository?: SavedPlacesRepository }>) {
  const { user } = useAuth();
  const value = useSavedPlacesState(user?.id ?? null, repository);
  return (
    <SavedPlacesContext.Provider value={value}>
      {children}
    </SavedPlacesContext.Provider>
  );
}

export function useSavedPlaces() {
  const context = useContext(SavedPlacesContext);
  if (!context) {
    throw new Error(
      'useSavedPlaces must be used inside SavedPlacesProvider',
    );
  }
  return context;
}
