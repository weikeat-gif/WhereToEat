import { fireEvent, render } from '@testing-library/react-native';

import { MapScreen } from './map-screen';

const mockPush = jest.fn();
const mockSearchContext = {
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
  results: [
    {
      id: 'mock-seri-klang-kitchen',
      name: 'Seri Klang Kitchen',
      subtitle: 'Malaysian favourites',
      coordinates: { latitude: 3.14, longitude: 101.69 },
      distanceMeters: 1300,
      rating: 4.6,
      reviewCount: 100,
      priceLevel: 2,
      isOpen: true,
      categories: ['Malaysian'],
    },
  ],
  search: jest.fn(),
  searchCurrentLocation: jest.fn(),
  selectArea: jest.fn(),
  status: 'success',
  surprise: undefined,
  surpriseMe: jest.fn(),
  updateCriteriaAndSearch: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('@/features/map/map-canvas', () => {
  const { View } = jest.requireActual('react-native');
  return { MapCanvas: () => <View accessibilityLabel="Mock map" /> };
});

jest.mock('@/features/search/search-provider', () => ({
  useSearch: () => mockSearchContext,
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

describe('MapScreen', () => {
  it('opens a shared result in place details', () => {
    const screen = render(<MapScreen />);

    fireEvent.press(
      screen.getByRole('button', { name: '1. Seri Klang Kitchen' }),
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/place/[id]',
      params: { id: 'mock-seri-klang-kitchen' },
    });
    expect(screen.getByLabelText('Use my current location')).toBeTruthy();
  });
});
