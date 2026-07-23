import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppleSignInButton } from './apple-sign-in-button';

const mockAvailable = jest.fn();

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: () => mockAvailable(),
  AppleAuthenticationButton: ({ onPress }: { onPress: () => void }) => {
    const { createElement } = jest.requireActual('react');
    const { Pressable, Text } = jest.requireActual('react-native');
    return createElement(
      Pressable,
      { accessibilityRole: 'button', onPress },
      createElement(Text, null, 'Native Apple button'),
    );
  },
  AppleAuthenticationButtonStyle: { BLACK: 0, WHITE: 1 },
  AppleAuthenticationButtonType: { CONTINUE: 0 },
}));

describe('AppleSignInButton', () => {
  it('uses the native Apple control only when Sign in with Apple is available', async () => {
    mockAvailable.mockResolvedValue(true);
    const onPress = jest.fn();
    const screen = render(
      <AppleSignInButton disabled={false} onPress={onPress} theme="light" />,
    );

    await waitFor(() =>
      expect(screen.getByText('Native Apple button')).toBeTruthy(),
    );
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
