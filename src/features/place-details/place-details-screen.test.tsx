import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { PlaceSummary } from '@/contracts/place';
import { DISCOVERY_PLACES } from '@/features/home/discovery-data';

import { PlaceDetailsScreen } from './place-details-screen';

const mockPush = jest.fn();
const mockToggle = jest.fn();
const mockRecordPromotionView = jest.fn();
const mockLoadDisplayPlace = jest.fn();
let mockUser: { id: string } | null = null;
let mockSavedIds = new Set<string>();
let mockResults: PlaceSummary[] = [];
let mockThemeMode: 'light' | 'dark' = 'dark';
let mockDataMode: 'mock' | 'live' = 'mock';

jest.mock('expo-image', () => {
  const { Image } = jest.requireActual('react-native');
  return { Image };
});

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
  useLocalSearchParams: () => ({ id: 'jalan-21-burger' }),
}));

jest.mock('@/features/auth/auth-provider', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('@/features/saved/use-saved-places', () => ({
  useSavedPlaces: () => ({
    savedIds: mockSavedIds,
    isLoading: false,
    error: null,
    toggle: (...args: unknown[]) => mockToggle(...args),
  }),
}));

jest.mock('@/features/search/search-provider', () => ({
  useSearch: () => ({ results: mockResults }),
}));

jest.mock('@/features/promotions/promotion-service', () => ({
  recordPromotionView: (...args: unknown[]) =>
    mockRecordPromotionView(...args),
}));

jest.mock('@/config/env', () => ({
  env: {
    get EXPO_PUBLIC_DATA_MODE() {
      return mockDataMode;
    },
  },
}));

jest.mock('./place-details-loader', () => ({
  loadDisplayPlace: (...args: unknown[]) => mockLoadDisplayPlace(...args),
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => {
    const { themeColors } = jest.requireActual('@/theme/tokens');
    return {
      colors: themeColors[mockThemeMode],
      resolvedMode: mockThemeMode,
    };
  },
}));

describe('PlaceDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToggle.mockResolvedValue(true);
    mockRecordPromotionView.mockResolvedValue(undefined);
    mockUser = null;
    mockSavedIds = new Set();
    mockResults = [];
    mockThemeMode = 'dark';
    mockDataMode = 'mock';
    mockLoadDisplayPlace.mockResolvedValue({
      ...DISCOVERY_PLACES[0],
      image: undefined,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a guest to sign in before saving', () => {
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Jalan 21 Burger')).toBeTruthy();
    expect(screen.getByText('Popular picks')).toBeTruthy();

    fireEvent.press(screen.getByTestId('save-place-button'));

    expect(mockPush).toHaveBeenCalledWith('/auth');
    expect(mockToggle).not.toHaveBeenCalled();
  });

  it('persists an authenticated save through the shared saved repository', () => {
    mockUser = { id: 'user-1' };
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByTestId('save-place-button'));

    expect(mockToggle).toHaveBeenCalledWith('jalan-21-burger');
  });

  it('announces Share failures and offers external navigation apps', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('share unavailable'));
    const openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    fireEvent.press(screen.getByLabelText('Share place'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Unable to share this restaurant.',
      ),
    );

    fireEvent.press(screen.getByTestId('directions-button'));
    expect(screen.getByText('Choose your navigation app')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Navigate with Waze' }));
    expect(openUrl).toHaveBeenCalledWith(
      expect.stringContaining('https://waze.com/ul?'),
    );
    expect(mockPush).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/directions/[id]' }),
    );
  });

  it('uses one clear directions action and restrained place typography', () => {
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Distance 600 m' })).toBeNull();
    expect(screen.getByTestId('directions-button')).toBeTruthy();
    expect(screen.getByText('Directions · 600 m')).toBeTruthy();
    expect(screen.getByText('Jalan 21 Burger')).toHaveProp('numberOfLines', 2);
  });

  it('keeps no-photo restaurant headers readable in light mode', async () => {
    mockThemeMode = 'light';
    mockDataMode = 'live';
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText('Jalan 21 Burger has no photo'),
      ).toHaveStyle({ backgroundColor: '#20231F' }),
    );
    expect(screen.getByText('Photo unavailable')).toHaveStyle({
      color: '#D7DAD5',
    });
  });

  it('removes generic Google types from the visible cuisine chips', () => {
    mockResults = [
      {
        ...DISCOVERY_PLACES[0],
        categories: [
          'Fast Food Restaurant',
          'Meal Takeaway',
          'Restaurant',
          'Food',
          'Point Of Interest',
          'Establishment',
        ],
      },
    ];
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Fast Food Restaurant')).toBeTruthy();
    expect(screen.getByText('Meal Takeaway')).toBeTruthy();
    expect(screen.queryByText('Point Of Interest')).toBeNull();
    expect(screen.queryByText('Establishment')).toBeNull();
  });

  it('shows unavailable opening hours once without a dead hours control', () => {
    mockResults = [
      {
        ...DISCOVERY_PLACES[0],
        isOpen: undefined,
        openingNote: 'Hours unavailable',
      } as PlaceSummary,
    ];
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    expect(screen.getAllByText('Hours unavailable')).toHaveLength(1);
    expect(screen.queryByText('See all hours')).toBeNull();
  });

  it('discloses a sponsored restaurant and records its unique profile view', async () => {
    mockResults = [
      {
        ...DISCOVERY_PLACES[0],
        promotion: { id: '3be82851-f46d-43af-9a87-466ef33685d7' },
      },
    ];
    const screen = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 44, left: 0, right: 0, bottom: 34 },
        }}>
        <PlaceDetailsScreen />
      </SafeAreaProvider>,
    );

    expect(screen.getByText('Sponsored')).toBeTruthy();
    await waitFor(() =>
      expect(mockRecordPromotionView).toHaveBeenCalledWith(
        '3be82851-f46d-43af-9a87-466ef33685d7',
      ),
    );
  });
});
