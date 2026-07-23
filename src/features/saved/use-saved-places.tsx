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

export function savedIdsForUser(
  ownerId: string | null,
  userId: string | null,
  ids: Set<string>,
  empty: Set<string>,
) {
  return ownerId === userId ? ids : empty;
}

export function isCurrentSavedLoad(
  active: boolean,
  effectUserId: string | null,
  currentUserId: string | null,
) {
  return active && effectUserId === currentUserId;
}

function useSavedPlacesState(
  userId: string | null,
  repository: SavedPlacesRepository = savedPlacesRepository,
) {
  const currentUserIdRef = useRef(userId);
  currentUserIdRef.current = userId;
  const emptyIdsRef = useRef(new Set<string>());
  const [savedState, setSavedState] = useState(() => ({
    ownerId: userId,
    ids: new Set<string>(),
  }));
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const ownerMatches = savedState.ownerId === userId;
  const savedIds = savedIdsForUser(
    savedState.ownerId,
    userId,
    savedState.ids,
    emptyIdsRef.current,
  );
  const idsRef = useRef(savedIds);
  if (!ownerMatches) idsRef.current = emptyIdsRef.current;
  const pendingIdsRef = useRef(new Set<string>());
  const touchedIdsRef = useRef(new Set<string>());
  const userGenerationRef = useRef(0);

  const update = useCallback(
    (next: Set<string>, ownerId = currentUserIdRef.current) => {
      idsRef.current = next;
      setSavedState({
        ownerId,
        ids: next,
      });
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const effectUserId = userId;
    userGenerationRef.current += 1;
    pendingIdsRef.current.clear();
    touchedIdsRef.current.clear();
    setPendingIds(new Set());
    setError(null);
    update(new Set(), effectUserId);
    if (!userId) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    repository
      .list(userId)
      .then((rows) => {
        if (
          !isCurrentSavedLoad(
            active,
            effectUserId,
            currentUserIdRef.current,
          )
        ) {
          return;
        }
        const loaded = new Set(rows.map((row) => row.googlePlaceId));
        for (const touchedId of touchedIdsRef.current) {
          if (idsRef.current.has(touchedId)) loaded.add(touchedId);
          else loaded.delete(touchedId);
        }
        update(loaded, effectUserId);
      })
      .catch((loadError: unknown) => {
        if (
          isCurrentSavedLoad(
            active,
            effectUserId,
            currentUserIdRef.current,
          )
        ) {
          setError(toUserMessage(loadError));
        }
      })
      .finally(() => {
        if (
          isCurrentSavedLoad(
            active,
            effectUserId,
            currentUserIdRef.current,
          )
        ) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [repository, update, userId]);

  const toggle = useCallback(
    async (googlePlaceId: string) => {
      if (pendingIdsRef.current.has(googlePlaceId)) {
        return idsRef.current.has(googlePlaceId);
      }
      pendingIdsRef.current.add(googlePlaceId);
      touchedIdsRef.current.add(googlePlaceId);
      setPendingIds(new Set(pendingIdsRef.current));
      setError(null);
      const operationGeneration = userGenerationRef.current;
      const operationUserId = userId;
      const operationIsCurrent = () =>
        operationGeneration === userGenerationRef.current &&
        operationUserId === currentUserIdRef.current;
      const updateIfCurrent = (next: Set<string>) => {
        if (operationIsCurrent()) update(next);
      };
      try {
        return await toggleSavedPlace({
          userId,
          googlePlaceId,
          current: idsRef.current,
          repository,
          update: updateIfCurrent,
        });
      } catch (toggleError) {
        if (operationIsCurrent()) {
          setError(toUserMessage(toggleError));
        }
        throw toggleError;
      } finally {
        if (operationIsCurrent()) {
          pendingIdsRef.current.delete(googlePlaceId);
          setPendingIds(new Set(pendingIdsRef.current));
        }
      }
    },
    [repository, update, userId],
  );

  return {
    savedIds,
    pendingIds: ownerMatches ? pendingIds : emptyIdsRef.current,
    isLoading: ownerMatches ? isLoading : Boolean(userId),
    error: ownerMatches ? error : null,
    toggle,
  };
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
