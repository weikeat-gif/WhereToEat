import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScreenPlaceholder } from '@/components/screen-placeholder';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

import { useAuth } from './auth-provider';
import { AppleSignInButton } from './apple-sign-in-button';

export function AuthScreen() {
  const router = useRouter();
  const { colors, resolvedMode } = useAppTheme();
  const {
    user,
    isLoading,
    isBusy,
    error,
    emailCodeSent,
    emailCodeAddress,
    backendMode,
    signInWithGoogle,
    signInWithApple,
    requestEmailCode,
    verifyEmailCode,
    resetEmailCode,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const verificationEmail = emailCodeAddress;

  useEffect(() => {
    if (!user) return;
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/profile');
  }, [router, user]);

  function run(operation: () => Promise<void>) {
    void operation().catch(() => undefined);
  }

  if (isLoading) {
    return (
      <ScreenPlaceholder
        title="Sign in"
        description="Restoring your account…">
        <ActivityIndicator color={colors.accentForeground} />
      </ScreenPlaceholder>
    );
  }

  if (user) {
    return (
      <ScreenPlaceholder
        title="You’re signed in"
        description={user.email ?? user.displayName ?? 'Your MakanMana account'}>
        <AuthButton
          label="Sign out"
          disabled={isBusy}
          onPress={() => run(signOut)}
        />
        {error ? <ErrorText message={error} /> : null}
      </ScreenPlaceholder>
    );
  }

  return (
    <ScreenPlaceholder
      title="Sign in"
      description="Save restaurants and sync them across your devices. You can keep browsing as a guest.">
      <View style={styles.stack}>
        {backendMode === 'mock' ? (
          <Text style={[styles.notice, { color: colors.warning }]}>
            Account sign-in is disabled until the live Supabase environment is
            configured.
          </Text>
        ) : null}
        <AuthButton
          icon="logo-google"
          label="Sign in securely with Google"
          disabled={isBusy || backendMode === 'mock'}
          onPress={() => run(signInWithGoogle)}
        />
        <Text style={[styles.providerHint, { color: colors.textMuted }]}>
          Google opens in a secure browser. MakanMana will not email you a code
          for this option.
        </Text>
        {Platform.OS === 'ios' ? (
          <AppleSignInButton
            disabled={isBusy || backendMode === 'mock'}
            onPress={() => run(signInWithApple)}
            theme={resolvedMode}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showEmailSignIn }}
          onPress={() => setShowEmailSignIn((current) => !current)}
          style={styles.emailToggle}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.emailToggleText, { color: colors.textMuted }]}>
            {showEmailSignIn ? 'Hide email sign-in' : 'Use email instead'}
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </Pressable>
        {showEmailSignIn ? (
          <View style={styles.emailStack}>
            <Text style={[styles.emailExplanation, { color: colors.textMuted }]}>
              Email sign-in is separate from Google. We will send the code to
              the email address entered below.
            </Text>
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isBusy && !emailCodeSent}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.surfaceElevated,
                },
              ]}
              value={emailCodeSent ? emailCodeAddress : email}
            />
            {emailCodeSent ? (
              <>
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.codeSent, { color: colors.text }]}>
                  Code sent to {verificationEmail}. Check that email inbox and spam
                  folder.
                </Text>
                <TextInput
                  accessibilityLabel="Email sign-in code"
                  autoComplete="one-time-code"
                  editable={!isBusy}
                  keyboardType="number-pad"
                  maxLength={8}
                  onChangeText={setCode}
                  placeholder="6-digit email code"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      backgroundColor: colors.surfaceElevated,
                    },
                  ]}
                  value={code}
                />
                <AuthButton
                  label="Verify email code"
                  disabled={isBusy || code.trim().length < 6}
                  onPress={() =>
                    run(() => verifyEmailCode(verificationEmail, code))
                  }
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() =>
                    run(() => requestEmailCode(verificationEmail))
                  }>
                  <Text
                    style={[
                      styles.resendCode,
                      { color: colors.accentForeground },
                    ]}>
                    Resend email code
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => {
                    resetEmailCode();
                    setCode('');
                  }}>
                  <Text
                    style={[
                      styles.resendCode,
                      { color: colors.textMuted },
                    ]}>
                    Change email address
                  </Text>
                </Pressable>
              </>
            ) : (
              <AuthButton
                label="Send code to this email"
                disabled={
                  isBusy || backendMode === 'mock' || !email.trim().includes('@')
                }
                onPress={() => run(() => requestEmailCode(email))}
              />
            )}
          </View>
        ) : null}
        {isBusy ? (
          <ActivityIndicator color={colors.accentForeground} />
        ) : null}
        {error ? <ErrorText message={error} /> : null}
      </View>
    </ScreenPlaceholder>
  );
}

function AuthButton({
  label,
  disabled,
  onPress,
  icon,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? colors.surfaceElevated : colors.accent,
          borderColor: colors.border,
        },
      ]}>
      {icon ? (
        <Ionicons
          color={disabled ? colors.textMuted : colors.accentText}
          name={icon}
          size={20}
        />
      ) : null}
      <Text
        style={{
          color: disabled ? colors.textMuted : colors.accentText,
          fontFamily: fontFamily.semibold,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ErrorText({ message }: { message: string }) {
  const { colors } = useAppTheme();
  return (
    <Text accessibilityRole="alert" style={{ color: colors.warning }}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, marginTop: 24, width: '100%' },
  button: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: fontFamily.regular,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: { flex: 1, height: 1 },
  emailToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
  },
  emailToggleText: { fontFamily: fontFamily.medium, fontSize: 13 },
  emailStack: { gap: 12 },
  emailExplanation: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  providerHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -6,
    textAlign: 'center',
  },
  codeSent: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19 },
  resendCode: {
    fontFamily: fontFamily.semibold,
    paddingVertical: 8,
    textAlign: 'center',
  },
  notice: { fontFamily: fontFamily.regular, lineHeight: 20 },
});
