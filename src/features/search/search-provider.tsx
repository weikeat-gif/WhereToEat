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
  surprise: PlaceSummary | undefined;
  setCriteria: (criteria: SearchCriteria) => void;
  setResults: (places: PlaceSummary[]) => void;
  search: (criteria?: SearchCriteria) => Promise<SearchResults | undefined>;
  updateCriteriaAndSearch: (
    changes: Partial<SearchCriteria>,
  ) => Promise<SearchResults | undefined>;
  autocompleteArea: (input: string) => Promise<AreaSuggestion[]>;
  selectArea: (area: AreaSuggestion) => Promise<SearchResults | undefined>;
  searchCurrentLocation: () => Promise<SearchResults | undefined>;
  surpriseMe: () => PlaceSummary | undefined;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

type SearchProviderProps = PropsWithChildren<{
  service?: PlacesService;
  locationClient?: SearchLocationClient;
}>;

export function SearchProvider({
  children,
  service = placesService,
  locationClient,
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
  const criteriaRef = useRef(criteria);
  const requestIdRef = useRef(0);
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
        setSynchronizedCriteria(nextResults.criteria);
        setResults(nextResults.places);
        setSurprise(undefined);
        setSearchResults(nextResults);
        setStatus(nextResults.places.length === 0 ? 'empty' : 'success');
        return nextResults;
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

  const selectArea = useCallback(
    async (area: AreaSuggestion) => {
      const operationId = ++requestIdRef.current;
      setStatus('loading');
      setError(null);
      try {
        const coordinates =
          area.coordinates ??
          (await service.getPlaceDetails(area.id)).coordinates;
        if (operationId !== requestIdRef.current) return undefined;
        return search({
          ...criteriaRef.current,
          center: coordinates,
          areaLabel: area.label,
          rankPreference: 'DISTANCE',
        });
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
    [search, service],
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
      areaLabel: 'Current location',
      rankPreference: 'DISTANCE',
    });
  }, [locationClient, search]);

  const surpriseMe = useCallback(() => {
    const selection = pickSurprise(results, surprise?.id);
    setSurprise(selection);
    return selection;
  }, [results, surprise?.id]);

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
      surprise,
      setCriteria: setSynchronizedCriteria,
      setResults: setSynchronizedResults,
      search,
      updateCriteriaAndSearch,
      autocompleteArea,
      selectArea,
      searchCurrentLocation,
      surpriseMe,
    }),
    [
      autocompleteArea,
      criteria,
      error,
      locationMessage,
      locationCanAskAgain,
      locationStatus,
      userCoordinates,
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
