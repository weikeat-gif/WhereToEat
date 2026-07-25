import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ListsScreen } from './lists-screen';

const mockPush = jest.fn();
const mockUpdateCriteriaAndSearch = jest.fn();
const mockSearchState = {
  error: null as string | null,
  status: 'success' as 'idle' | 'loading' | 'success' | 'empty' | 'error',
  results: [
    {
      id: 'late-place',
      name: 'Late Night Noodles',
      subtitle: 'Wok-fried supper',
      coordinates: { latitude: 3.139, longitude: 101.6869 },
      distanceMeters: 400,
      rating: 4.6,
      reviewCount: 300,
      priceLevel: 1 as const,
      isOpen: true,
      categories: ['Supper'],
    },
  ],
};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('expo-image', () => {
  const { Image } = jest.requireActual('react-native');
  return { Image };
});

jest.mock('@/features/search/search-provider', () => ({
  useSearch: () => ({
    criteria: {
      center: { latitude: 3.139, longitude: 101.6869 },
      areaLabel: 'Klang Valley',
      radiusMeters: 3000,
      openNow: true,
      priceLevels: [1, 2],
      categories: [],
      verifiedHalalOnly: false,
    },
    ...mockSearchState,
    updateCriteriaAndSearch: mockUpdateCriteriaAndSearch,
  }),
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}>
      <ListsScreen />
    </SafeAreaProvider>,
  );
}

describe('ListsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchState.error = null;
    mockSearchState.status = 'success';
    mockSearchState.results = [
      {
        id: 'late-place',
        name: 'Late Night Noodles',
        subtitle: 'Wok-fried supper',
        coordinates: { latitude: 3.139, longitude: 101.6869 },
        distanceMeters: 400,
        rating: 4.6,
        reviewCount: 300,
        priceLevel: 1,
        isOpen: true,
        categories: ['Supper'],
      },
    ];
    mockUpdateCriteriaAndSearch.mockResolvedValue(undefined);
  });

  it('turns a curated list into a real shared restaurant search', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Open Open late list' }));

    expect(mockUpdateCriteriaAndSearch).toHaveBeenCalledWith({
      categories: ['Supper'],
      openNow: true,
      priceLevels: [1, 2, 3, 4],
      query: undefined,
      verifiedHalalOnly: false,
    });
  });

  it('opens a result from the active collection', () => {
    const screen = renderScreen();

    fireEvent.press(screen.getByText('Late Night Noodles'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: 'late-place' },
    });
  });

  it('shows a genuine empty state instead of demo restaurants', () => {
    mockSearchState.status = 'empty';
    mockSearchState.results = [];
    const screen = renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Open Cafes list' }));

    expect(screen.getByText('No matches nearby yet')).toBeTruthy();
    expect(screen.queryByText('Restoran Nasi Kandar Line Clear')).toBeNull();
  });

  it('shows the service error instead of stale restaurant results', () => {
    mockSearchState.status = 'error';
    mockSearchState.error = 'Search is temporarily unavailable.';
    mockSearchState.results = [];
    const screen = renderScreen();

    fireEvent.press(
      screen.getByRole('button', { name: 'Open Verified Halal list' }),
    );

    expect(screen.getByText('Couldn’t load this list')).toBeTruthy();
    expect(screen.getByText('Search is temporarily unavailable.')).toBeTruthy();
    expect(screen.queryByText('Late Night Noodles')).toBeNull();
  });
});
