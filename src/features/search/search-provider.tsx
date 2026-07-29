import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { Coordinates, PlaceSummary } from '@/contracts/place';
import type {
  AreaSuggestion,
  SearchCriteria,
  SearchResults,
} from '@/contracts/search';
import {
  requestSearchLocation,
  type SearchLocationClient,
} from '@/features/search/location';
import {
  isCoordinateWithinAreaBoundary,
} from '@/features/map/area-boundary';
import {
  isCoordinateWithinMapBounds,
  radiusForMapBounds,
} from '@/features/map/map-viewport';
import {
  clearRecentAreaHistory,
  loadRecentAreas,
  rememberRecentArea,
  saveRecentAreas,
} from '@/features/search/recent-areas';
import { pickSurprise } from '@/features/search/surprise';
import { placesService } from '@/services/places';
import type { PlacesService } from '@/services/places/places-service';

export const DEFAULT_SEARCH_CRITERIA: SearchCriteria = {
  center: { latitude: 3.139, longitude: 101.6869 },
  areaLabel: 'Klang Valley',
  radiusMeters: 3000,
  openNow: false,
  priceLevels: [],
  categories: [],
  verifiedHalalOnly: false,
};

type SearchContextValue = {
  criteria: SearchCriteria;
  results: PlaceSummary[];
  searchResults: SearchResults | null;
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  error: string | null;
  locationStatus: 'idle' | 'requesting' | 'granted' | 'manual';
  locationMessage: string | null;
  locationCanAskAgain: boolean | null;
  userCoordinates: Coordinates | null;
  recentAreas: AreaSuggestion[];
  surprise: PlaceSummary | undefined;
  setCriteria: (criteria: SearchCriteria) => void;
  setResults: (places: PlaceSummary[]) => void;
  search: (criteria?: SearchCriteria) => Promise<SearchResults | undefined>;
  updateCriteriaAndSearch: (
    changes: Partial<SearchCriteria>,
  ) => Promise<SearchResults | undefined>;
  autocompleteArea: (input: string) => Promise<AreaSuggestion[]>;
  clearRecentAreas: () => void;
  selectArea: (
    area: AreaSuggestion,
    changes?: Pick<SearchCriteria, 'query'>,
  ) => Promise<SearchResults | undefined>;
  searchCurrentLocation: () => Promise<SearchResults | undefined>;
  surpriseMe: () => PlaceSummary | undefined;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

type SearchProviderProps = PropsWithChildren<{
  service?: PlacesService;
  locationClient?: SearchLocationClient;
  historyScope?: string | null;
}>;

export function SearchProvider({
  children,
  service = placesService,
  locationClient,
  historyScope = null,
}: SearchProviderProps) {
  const [criteria, setCriteria] = useState(DEFAULT_SEARCH_CRITERIA);
  const [results, setResults] = useState<PlaceSummary[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [status, setStatus] = useState<SearchContextValue['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<SearchContextValue['locationStatus']>('idle');
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationCanAskAgain, setLocationCanAskAgain] = useState<
    boolean | null
  >(null);
  const [userCoordinates, setUserCoordinates] =
    useState<Coordinates | null>(null);
  const [surprise, setSurprise] = useState<PlaceSummary>();
  const [recentAreas, setRecentAreas] = useState<AreaSuggestion[]>([]);
  const criteriaRef = useRef(criteria);
  const requestIdRef = useRef(0);
  const recentAreasRef = useRef<AreaSuggestion[]>([]);
  const historyEpochRef = useRef(0);
  const historyScopeRef = useRef(historyScope);
  const historyHydrationRef = useRef<Promise<AreaSuggestion[]>>(
    Promise.resolve([]),
  );
  const historyMutationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const autocompleteSessionRef = useRef(
    `area-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const setSynchronizedCriteria = useCallback((nextCriteria: SearchCriteria) => {
    criteriaRef.current = nextCriteria;
    setCriteria(nextCriteria);
  }, []);

  const setSynchronizedResults = useCallback((places: PlaceSummary[]) => {
    setResults(places);
    setStatus(places.length === 0 ? 'empty' : 'success');
    setError(null);
    setSearchResults({
      criteria: criteriaRef.current,
      places,
      fetchedAt: new Date().toISOString(),
    });
  }, []);

  const search = useCallback(
    async (nextCriteria = criteriaRef.current) => {
      const requestId = ++requestIdRef.current;
      setSynchronizedCriteria(nextCriteria);
      setStatus('loading');
      setError(null);

      try {
        const nextResults = await service.searchNearby(nextCriteria);
        if (requestId !== requestIdRef.current) return undefined;
        const { areaBoundary, areaBounds } = nextResults.criteria;
        const boundedPlaces = areaBoundary
          ? nextResults.places.filter((place) =>
              isCoordinateWithinAreaBoundary(place.coordinates, areaBoundary),
            )
          : areaBounds
            ? nextResults.places.filter((place) =>
                isCoordinateWithinMapBounds(place.coordinates, areaBounds),
              )
            : nextResults.places;
        const boundedResults = {
          ...nextResults,
          places: boundedPlaces,
        };
        setSynchronizedCriteria(boundedResults.criteria);
        setResults(boundedResults.places);
        setSurprise(undefined);
        setSearchResults(boundedResults);
        setStatus(boundedResults.places.length === 0 ? 'empty' : 'success');
        return boundedResults;
      } catch (searchError) {
        if (requestId !== requestIdRef.current) return undefined;
        setResults([]);
        setSearchResults(null);
        setStatus('error');
        setError(
          searchError instanceof Error
            ? searchError.message
            : 'Unable to search for places right now.',
        );
        return undefined;
      }
    },
    [service, setSynchronizedCriteria],
  );

  const updateCriteriaAndSearch = useCallback(
    (changes: Partial<SearchCriteria>) =>
      search({ ...criteriaRef.current, ...changes }),
    [search],
  );

  const autocompleteArea = useCallback(
    (input: string) =>
      service.autocompleteArea(input, autocompleteSessionRef.current),
    [service],
  );

  const addRecentArea = useCallback((area: AreaSuggestion) => {
    const scope = historyScopeRef.current;
    const epoch = ++historyEpochRef.current;
    const immediate = rememberRecentArea(recentAreasRef.current, area);
    recentAreasRef.current = immediate;
    setRecentAreas(immediate);
    historyMutationQueueRef.current = historyMutationQueueRef.current.then(
      async () => {
        const hydrated = await historyHydrationRef.current;
        if (
          epoch !== historyEpochRef.current ||
          scope !== historyScopeRef.current
        ) {
          return;
        }
        const current = [
          ...recentAreasRef.current,
          ...hydrated.filter(
            (stored) =>
              !recentAreasRef.current.some(
                (candidate) => candidate.id === stored.id,
              ),
          ),
        ];
        const next = rememberRecentArea(current, area);
        recentAreasRef.current = next;
        setRecentAreas(next);
        if (scope) await saveRecentAreas(scope, next);
      },
    );
  }, []);

  const clearRecentAreas = useCallback(() => {
    const scope = historyScopeRef.current;
    historyEpochRef.current += 1;
    historyHydrationRef.current = Promise.resolve([]);
    recentAreasRef.current = [];
    setRecentAreas([]);
    historyMutationQueueRef.current = historyMutationQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (scope) await clearRecentAreaHistory(scope);
      });
  }, []);

  const selectArea = useCallback(
    async (
      area: AreaSuggestion,
      changes: Pick<SearchCriteria, 'query'> = {},
    ) => {
      const operationId = ++requestIdRef.current;
      setStatus('loading');
      setError(null);
      try {
        const details = area.coordinates
          ? undefined
          : await service.getPlaceDetails(area.id);
        const coordinates = area.coordinates ?? details?.coordinates;
        if (!coordinates) throw new Error('Unable to resolve that area.');
        const areaBounds = area.viewport ?? details?.viewport;
        if (operationId !== requestIdRef.current) return undefined;
        const resolvedArea = {
          ...area,
          coordinates,
          viewport: areaBounds,
        };
        addRecentArea(resolvedArea);
        const nextCriteria = {
          ...criteriaRef.current,
          ...changes,
          center: coordinates,
          areaBounds,
          areaBoundary: area.boundary,
          areaLabel: area.label,
          areaPlaceId: area.id,
          radiusMeters: areaBounds
            ? radiusForMapBounds(
                coordinates,
                areaBounds.northEast,
                areaBounds.southWest,
              )
            : criteriaRef.current.radiusMeters,
          rankPreference: 'DISTANCE',
        } satisfies SearchCriteria;
        const boundaryRequest = area.boundary
          ? Promise.resolve(area.boundary)
          : service
              .getAreaBoundary?.(area.label, coordinates)
              .catch(() => null) ?? Promise.resolve(null);
        const searchPromise = search(nextCriteria);
        const boundarySearchRequestId = requestIdRef.current;
        const [nextResults, boundary] = await Promise.all([
          searchPromise,
          boundaryRequest,
        ]);
        if (
          !boundary ||
          requestIdRef.current !== boundarySearchRequestId ||
          criteriaRef.current.areaPlaceId !== area.id ||
          !nextResults
        ) {
          return nextResults;
        }
        const boundaryPlaces = nextResults.places.filter((place) =>
          isCoordinateWithinAreaBoundary(place.coordinates, boundary),
        );
        const boundaryCriteria = {
          ...criteriaRef.current,
          areaBoundary: boundary,
        };
        setSynchronizedCriteria(boundaryCriteria);
        setResults(boundaryPlaces);
        setSearchResults({
          ...nextResults,
          criteria: boundaryCriteria,
          places: boundaryPlaces,
        });
        setStatus(boundaryPlaces.length === 0 ? 'empty' : 'success');
        addRecentArea({ ...resolvedArea, boundary });
        return {
          ...nextResults,
          criteria: boundaryCriteria,
          places: boundaryPlaces,
        };
      } catch (areaError) {
        if (operationId !== requestIdRef.current) return undefined;
        setResults([]);
        setSearchResults(null);
        setStatus('error');
        setError(
          areaError instanceof Error
            ? areaError.message
            : 'Unable to resolve that area.',
        );
        return undefined;
      }
    },
    [addRecentArea, search, service, setSynchronizedCriteria],
  );

  const searchCurrentLocation = useCallback(async () => {
    const operationId = ++requestIdRef.current;
    setLocationStatus('requesting');
    setLocationMessage(null);
    setLocationCanAskAgain(null);
    const location = await requestSearchLocation(locationClient);
    if (operationId !== requestIdRef.current) return undefined;
    if (location.kind === 'manual') {
      setLocationStatus('manual');
      setLocationCanAskAgain(location.canAskAgain ?? true);
      setUserCoordinates(null);
      setLocationMessage(
        location.reason === 'denied'
          ? 'Location permission was denied. Search by area instead.'
          : 'Your location is unavailable. Search by area instead.',
      );
      return undefined;
    }

    setLocationStatus('granted');
    setLocationCanAskAgain(true);
    setUserCoordinates(location.coordinates);
    return search({
      ...criteriaRef.current,
      center: location.coordinates,
      areaBounds: undefined,
      areaBoundary: undefined,
      areaLabel: 'Current location',
      areaPlaceId: undefined,
      rankPreference: 'DISTANCE',
    });
  }, [locationClient, search]);

  const surpriseMe = useCallback(() => {
    const selection = pickSurprise(results, surprise?.id);
    setSurprise(selection);
    return selection;
  }, [results, surprise?.id]);

  useEffect(() => {
    const epoch = ++historyEpochRef.current;
    historyScopeRef.current = historyScope;
    recentAreasRef.current = [];
    setRecentAreas([]);
    const hydration = historyScope
      ? loadRecentAreas(historyScope)
      : Promise.resolve([]);
    historyHydrationRef.current = hydration;
    void hydration.then((stored) => {
      if (
        epoch !== historyEpochRef.current ||
        historyScope !== historyScopeRef.current
      ) {
        return;
      }
      recentAreasRef.current = stored;
      setRecentAreas(stored);
    });
  }, [historyScope]);

  useEffect(() => {
    void search(DEFAULT_SEARCH_CRITERIA);
  }, [search]);

  const value = useMemo(
    () => ({
      criteria,
      results,
      searchResults,
      status,
      error,
      locationStatus,
      locationMessage,
      locationCanAskAgain,
      userCoordinates,
      recentAreas,
      surprise,
      setCriteria: setSynchronizedCriteria,
      setResults: setSynchronizedResults,
      search,
      updateCriteriaAndSearch,
      autocompleteArea,
      clearRecentAreas,
      selectArea,
      searchCurrentLocation,
      surpriseMe,
    }),
    [
      autocompleteArea,
      clearRecentAreas,
      criteria,
      error,
      locationMessage,
      locationCanAskAgain,
      locationStatus,
      userCoordinates,
      recentAreas,
      results,
      search,
      searchCurrentLocation,
      searchResults,
      selectArea,
      setSynchronizedCriteria,
      setSynchronizedResults,
      status,
      surprise,
      surpriseMe,
      updateCriteriaAndSearch,
    ],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used inside SearchProvider');
  return context;
}
