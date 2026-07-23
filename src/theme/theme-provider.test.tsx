import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { AppThemeProvider, useAppTheme } from './theme-provider';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

function Consumer() {
  const { mode, setMode } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void setMode('light')}>
      <Text>{mode}</Text>
    </Pressable>
  );
}

describe('AppThemeProvider', () => {
  it('does not let delayed hydration overwrite a user theme selection', async () => {
    let resolveStored!: (value: string | null) => void;
    mockGetItem.mockReturnValue(
      new Promise<string | null>((resolve) => {
        resolveStored = resolve;
      }),
    );
    mockSetItem.mockResolvedValue(undefined);
    render(
      <AppThemeProvider>
        <Consumer />
      </AppThemeProvider>,
    );

    fireEvent.press(screen.getByRole('button'));
    resolveStored('dark');

    await waitFor(() => expect(screen.getByText('light')).toBeTruthy());
    expect(screen.queryByText('dark')).toBeNull();
  });

  it('keeps the default theme when storage hydration fails', async () => {
    mockGetItem.mockRejectedValue(new Error('storage unavailable'));
    render(
      <AppThemeProvider>
        <Consumer />
      </AppThemeProvider>,
    );

    await waitFor(() => expect(screen.getByText('system')).toBeTruthy());
  });
});
