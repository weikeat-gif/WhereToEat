import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { PlaceSummary } from '@/contracts/place';
import type { SearchCriteria } from '@/contracts/search';

export const DEFAULT_SEARCH_CRITERIA: SearchCriteria = {
  center: { latitude: 3.139, longitude: 101.6869 },
  areaLabel: 'Klang Valley',
  radiusMeters: 3000,
  openNow: true,
  priceLevels: [1, 2],
  categories: [],
  verifiedHalalOnly: false,
};

type SearchContextValue = {
  criteria: SearchCriteria;
  results: PlaceSummary[];
  setCriteria: (criteria: SearchCriteria) => void;
  setResults: (places: PlaceSummary[]) => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children }: PropsWithChildren) {
  const [criteria, setCriteria] = useState(DEFAULT_SEARCH_CRITERIA);
  const [results, setResults] = useState<PlaceSummary[]>([]);
  const value = useMemo(
    () => ({ criteria, results, setCriteria, setResults }),
    [criteria, results],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used inside SearchProvider');
  return context;
}
