import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthScreen } from './auth-screen';

const mockSignInWithGoogle = jest.fn();
const mockRequestEmailCode = jest.fn();
const mockVerifyEmailCode = jest.fn();
const mockAuthState = {
  user: null,
  isLoading: false,
  isBusy: false,
  error: null,
  emailCodeSent: false,
  emailCodeAddress: '',
  backendMode: 'live' as const,
  signInWithGoogle: mockSignInWithGoogle,
  signInWithApple: jest.fn(),
  requestEmailCode: mockRequestEmailCode,
  verifyEmailCode: mockVerifyEmailCode,
  resetEmailCode: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('./auth-provider', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('./apple-sign-in-button', () => ({
  AppleSignInButton: () => null,
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
    resolvedMode: 'dark',
  }),
}));

function screenTree() {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 44, left: 0, right: 0, bottom: 34 },
      }}>
      <AuthScreen />
    </SafeAreaProvider>
  );
}

function renderScreen() {
  return render(screenTree());
}

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithGoogle.mockResolvedValue(undefined);
    mockRequestEmailCode.mockResolvedValue(undefined);
    mockVerifyEmailCode.mockResolvedValue(undefined);
    mockAuthState.emailCodeSent = false;
    mockAuthState.emailCodeAddress = '';
  });

  it('keeps Google sign-in separate from email-code sign-in', () => {
    const screen = renderScreen();

    expect(
      screen.getByText(/MakanMana will not email you a code/),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Email address')).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Use email instead' }));

    expect(screen.getByLabelText('Email address')).toBeTruthy();
    expect(
      screen.getByText(/Email sign-in is separate from Google/),
    ).toBeTruthy();
  });

  it('starts Google OAuth directly', () => {
    const screen = renderScreen();

    fireEvent.press(
      screen.getByRole('button', { name: 'Sign in securely with Google' }),
    );

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('explains where an email code was sent and locks that address', async () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Use email instead' }));
    fireEvent.changeText(screen.getByLabelText('Email address'), 'me@example.com');
    fireEvent.press(
      screen.getByRole('button', { name: 'Send code to this email' }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    mockAuthState.emailCodeSent = true;
    mockAuthState.emailCodeAddress = 'me@example.com';
    screen.rerender(screenTree());

    expect(screen.getByText(/Code sent to me@example.com/)).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toHaveProp('editable', false);
    expect(screen.getByLabelText('Email sign-in code')).toBeTruthy();
  });

  it('restores the code destination after the auth screen remounts', () => {
    mockAuthState.emailCodeSent = true;
    mockAuthState.emailCodeAddress = 'saved@example.com';
    const screen = renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Use email instead' }));

    expect(screen.getByText(/Code sent to saved@example.com/)).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toHaveProp(
      'value',
      'saved@example.com',
    );
  });
});
