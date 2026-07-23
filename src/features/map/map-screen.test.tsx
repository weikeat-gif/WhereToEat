import { fireEvent, render, screen } from '@testing-library/react-native';

import type { PlaceSummary } from '@/contracts/place';

import { MapScreen } from './map-screen';

const mockPush = jest.fn();
const mockUseSearch = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/features/search/search-provider', () => ({
  useSearch: () => mockUseSearch(),
}));

jest.mock('@/features/map/map-canvas', () => {
  const { View } = jest.requireActual('react-native');
  return {
    MapCanvas: () => <View accessibilityLabel="Map test canvas" />,
  };
});

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

const trustedPlace: PlaceSummary = {
  id: 'trusted-place',
  name: 'Trusted Place',
  subtitle: 'Verified fixture',
  coordinates: { latitude: 3.139, longitude: 101.6869 },
  distanceMeters: 300,
  rating: 4.5,
  reviewCount: 120,
  priceLevel: 2,
  isOpen: true,
  categories: ['Malaysian'],
  halalVerification: {
    sourceName: 'JAKIM Halal Malaysia',
    sourceUrl: 'https://www.halal.gov.my/v4/',
    verifiedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2027-01-01T00:00:00.000Z',
  },
};

function searchState(overrides: Record<string, unknown> = {}) {
  return {
    autocompleteArea: jest.fn().mockResolvedValue([]),
    criteria: {
      center: { latitude: 3.139, longitude: 101.6869 },
      areaLabel: 'Klang Valley',
      radiusMeters: 3000,
      openNow: true,
      priceLevels: [1, 2],
      categories: [],
      verifiedHalalOnly: false,
    },
    error: null,
    locationMessage: null,
    results: [trustedPlace],
    search: jest.fn(),
    searchCurrentLocation: jest.fn(),
    selectArea: jest.fn(),
    status: 'success',
    surprise: undefined,
    surpriseMe: jest.fn(),
    updateCriteriaAndSearch: jest.fn(),
    ...overrides,
  };
}

describe('MapScreen states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearch.mockReturnValue(searchState());
  });

  it('opens a shared result in place details', () => {
    render(<MapScreen />);

    fireEvent.press(screen.getByRole('button', { name: '1. Trusted Place' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: 'trusted-place' },
    });
    expect(screen.getByLabelText('Use my current location')).toBeTruthy();
  });

  it.each([
    'Too many place searches. Please try again shortly.',
    'Unable to reach the places service.',
  ])('announces a service error and offers retry: %s', (message) => {
    const search = jest.fn();
    mockUseSearch.mockReturnValue(
      searchState({ error: message, results: [], search, status: 'error' }),
    );

    render(<MapScreen />);

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('shows an actionable empty state and disables Surprise me', () => {
    mockUseSearch.mockReturnValue(
      searchState({ results: [], status: 'empty' }),
    );

    render(<MapScreen />);

    expect(
      screen.getByText(
        'No places match these filters. Expand the radius or clear a filter.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Surprise me' }),
    ).toBeDisabled();
  });

  it('labels the loading indicator for assistive technology', () => {
    mockUseSearch.mockReturnValue(
      searchState({ results: [], status: 'loading' }),
    );

    render(<MapScreen />);

    expect(screen.getByLabelText('Loading places')).toBeTruthy();
  });
});
