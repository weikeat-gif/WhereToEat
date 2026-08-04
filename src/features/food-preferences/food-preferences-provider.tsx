import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { FoodPreferenceKey } from '@/contracts/food-preference';
import { useAuth } from '@/features/auth/auth-provider';
import { BackendUnavailableError } from '@/services/supabase/errors';

import {
  foodPreferencesRepository,
  type FoodPreferencesRepository,
} from './food-preferences-repository';

type PersistenceScope = 'session' | 'account';

function preferenceErrorMessage(error: unknown) {
  return error instanceof BackendUnavailableError
    ? error.message
    : 'Unable to update food preferences. Please try again.';
}

type FoodPreferencesContextValue = {
  preferenceKeys: ReadonlySet<FoodPreferenceKey>;
  canPersist: boolean;
  isLoading: boolean;
  error: string | null;
  add: (key: FoodPreferenceKey) => Promise<PersistenceScope>;
  remove: (key: FoodPreferenceKey) => Promise<PersistenceScope>;
  rememberConfirmed: (
    keys: FoodPreferenceKey[],
  ) => Promise<PersistenceScope>;
};

const FoodPreferencesContext = createContext<
  FoodPreferencesContextValue | undefined
>(undefined);

function useFoodPreferencesState(
  userId: string | null,
  repository: FoodPreferencesRepository,
): FoodPreferencesContextValue {
  const currentUserIdRef = useRef(userId);
  currentUserIdRef.current = userId;
  const emptyRef = useRef(new Set<FoodPreferenceKey>());
  const guestKeysRef = useRef(new Set<FoodPreferenceKey>());
  const keysRef = useRef(new Set<FoodPreferenceKey>());
  const persistedKeysRef = useRef(new Set<FoodPreferenceKey>());
  const confirmedRef = useRef(new Map<FoodPreferenceKey, boolean>());
  const generationRef = useRef(0);
  const mutationQueuesRef = useRef(
    new Map<FoodPreferenceKey, Promise<void>>(),
  );
  const desiredRef = useRef(new Map<FoodPreferenceKey, boolean>());
  const touchedRef = useRef(new Set<FoodPreferenceKey>());
  const [state, setState] = useState(() => ({
    ownerId: userId,
    keys: new Set<FoodPreferenceKey>(),
  }));
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const ownerMatches = state.ownerId === userId;
  const preferenceKeys = ownerMatches ? state.keys : emptyRef.current;
  if (!ownerMatches) keysRef.current = emptyRef.current;

  const update = useCallback(
    (next: Set<FoodPreferenceKey>, ownerId = currentUserIdRef.current) => {
      keysRef.current = next;
      if (!ownerId) guestKeysRef.current = new Set(next);
      setState({ ownerId, keys: next });
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const effectUserId = userId;
    const generation = ++generationRef.current;
    mutationQueuesRef.current.clear();
    desiredRef.current.clear();
    confirmedRef.current.clear();
    persistedKeysRef.current.clear();
    touchedRef.current.clear();
    setError(null);

    if (!userId) {
      update(new Set(guestKeysRef.current), null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    update(new Set(), userId);
    setIsLoading(true);
    repository
      .list(userId)
      .then((records) => {
        if (
          !active ||
          generation !== generationRef.current ||
          effectUserId !== currentUserIdRef.current
        ) {
          return;
        }
        const loaded = new Set(records.map((record) => record.key));
        for (const [confirmedKey, enabled] of confirmedRef.current) {
          if (enabled) loaded.add(confirmedKey);
          else loaded.delete(confirmedKey);
        }
        persistedKeysRef.current = new Set(loaded);
        for (const touchedKey of touchedRef.current) {
          if (keysRef.current.has(touchedKey)) loaded.add(touchedKey);
          else loaded.delete(touchedKey);
        }
        update(loaded, effectUserId);
      })
      .catch((loadError: unknown) => {
        if (
          active &&
          generation === generationRef.current &&
          effectUserId === currentUserIdRef.current
        ) {
          setError(preferenceErrorMessage(loadError));
        }
      })
      .finally(() => {
        if (
          active &&
          generation === generationRef.current &&
          effectUserId === currentUserIdRef.current
        ) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [repository, update, userId]);

  const change = useCallback(
    (key: FoodPreferenceKey, enabled: boolean) => {
      const operationGeneration = generationRef.current;
      const operationUserId = userId;
      const isCurrent = () =>
        operationGeneration === generationRef.current &&
        operationUserId === currentUserIdRef.current;
      if (!isCurrent()) {
        return Promise.reject(new Error('Food preference account changed.'));
      }
      const optimistic = new Set(keysRef.current);
      touchedRef.current.add(key);
      if (enabled) optimistic.add(key);
      else optimistic.delete(key);
      update(optimistic, userId);
      if (!userId) return Promise.resolve('session' as const);

      desiredRef.current.set(key, enabled);
      setError(null);
      const previousMutation = mutationQueuesRef.current.get(key);
      const mutation = (previousMutation ?? Promise.resolve())
        .catch(() => undefined)
        .then(async () => {
          if (!isCurrent()) {
            throw new Error('Food preference account changed.');
          }
          try {
            await repository.set(userId, key, enabled);
            if (!isCurrent()) {
              throw new Error('Food preference account changed.');
            }
            confirmedRef.current.set(key, enabled);
            if (enabled) persistedKeysRef.current.add(key);
            else persistedKeysRef.current.delete(key);
          } catch (saveError) {
            if (isCurrent() && desiredRef.current.get(key) === enabled) {
              const reconciled = new Set(keysRef.current);
              if (persistedKeysRef.current.has(key)) reconciled.add(key);
              else reconciled.delete(key);
              update(reconciled, operationUserId);
              setError(preferenceErrorMessage(saveError));
            }
            throw saveError;
          }
        });
      const settled = mutation.finally(() => {
        if (mutationQueuesRef.current.get(key) === settled) {
          mutationQueuesRef.current.delete(key);
          if (desiredRef.current.get(key) === enabled) {
            desiredRef.current.delete(key);
          }
        }
      });
      mutationQueuesRef.current.set(key, settled);
      return settled.then(() => 'account' as const);
    },
    [repository, update, userId],
  );

  const add = useCallback(
    (key: FoodPreferenceKey) => change(key, true),
    [change],
  );
  const remove = useCallback(
    (key: FoodPreferenceKey) => change(key, false),
    [change],
  );
  const rememberConfirmed = useCallback(
    async (keys: FoodPreferenceKey[]) => {
      const batchGeneration = generationRef.current;
      const batchUserId = userId;
      const batchIsCurrent = () =>
        batchGeneration === generationRef.current &&
        batchUserId === currentUserIdRef.current;
      const uniqueKeys = [...new Set(keys)];
      for (const key of uniqueKeys) {
        if (!batchIsCurrent()) {
          throw new Error('Food preference account changed.');
        }
        await change(key, true);
      }
      if (!batchIsCurrent()) {
        throw new Error('Food preference account changed.');
      }
      return userId ? ('account' as const) : ('session' as const);
    },
    [change, userId],
  );

  return {
    preferenceKeys,
    canPersist: Boolean(userId),
    isLoading: ownerMatches ? isLoading : Boolean(userId),
    error: ownerMatches ? error : null,
    add,
    remove,
    rememberConfirmed,
  };
}

export function FoodPreferencesProvider({
  children,
  repository = foodPreferencesRepository,
}: PropsWithChildren<{ repository?: FoodPreferencesRepository }>) {
  const { user } = useAuth();
  const value = useFoodPreferencesState(user?.id ?? null, repository);
  return (
    <FoodPreferencesContext.Provider value={value}>
      {children}
    </FoodPreferencesContext.Provider>
  );
}

export function useFoodPreferences() {
  const context = useContext(FoodPreferencesContext);
  if (!context) {
    throw new Error(
      'useFoodPreferences must be used inside FoodPreferencesProvider',
    );
  }
  return context;
}
