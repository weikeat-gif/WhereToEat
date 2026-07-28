import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { PlaceSummary } from '@/contracts/place';
import { DISCOVERY_PLACES } from '@/features/home/discovery-data';

import { PlaceDetailsScreen } from './place-details-screen';

const mockPush = jest.fn();
const mockToggle = jest.fn();
const mockRecordPromotionView = jest.fn();
let mockUser: { id: string } | null = null;
let mockSavedIds = new Set<string>();
let mockResults: PlaceSummary[] = [];

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

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

describe('PlaceDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToggle.mockResolvedValue(true);
    mockRecordPromotionView.mockResolvedValue(undefined);
    mockUser = null;
    mockSavedIds = new Set();
    mockResults = [];
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
