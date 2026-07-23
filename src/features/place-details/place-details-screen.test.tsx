import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PlaceDetailsScreen } from './place-details-screen';

const mockPush = jest.fn();
const mockToggle = jest.fn();
let mockUser: { id: string } | null = null;
let mockSavedIds = new Set<string>();

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
  useSearch: () => ({ results: [] }),
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
    mockUser = null;
    mockSavedIds = new Set();
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
});
