import { useState } from 'react';
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
  const { colors, resolvedMode } = useAppTheme();
  const {
    user,
    isLoading,
    isBusy,
    error,
    emailCodeSent,
    backendMode,
    signInWithGoogle,
    signInWithApple,
    requestEmailCode,
    verifyEmailCode,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

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
          label="Continue with Google"
          disabled={isBusy || backendMode === 'mock'}
          onPress={() => run(signInWithGoogle)}
        />
        {Platform.OS === 'ios' ? (
          <AppleSignInButton
            disabled={isBusy || backendMode === 'mock'}
            onPress={() => run(signInWithApple)}
            theme={resolvedMode}
          />
        ) : null}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TextInput
          accessibilityLabel="Email address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!isBusy}
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
          value={email}
        />
        {emailCodeSent ? (
          <>
            <TextInput
              accessibilityLabel="One-time code"
              editable={!isBusy}
              keyboardType="number-pad"
              maxLength={8}
              onChangeText={setCode}
              placeholder="One-time code"
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
              label="Verify code"
              disabled={isBusy || code.trim().length < 6}
              onPress={() => run(() => verifyEmailCode(email, code))}
            />
          </>
        ) : (
          <AuthButton
            label="Email me a code"
            disabled={
              isBusy || backendMode === 'mock' || !email.trim().includes('@')
            }
            onPress={() => run(() => requestEmailCode(email))}
          />
        )}
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
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
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
  divider: { height: 1, marginVertical: 4 },
  notice: { fontFamily: fontFamily.regular, lineHeight: 20 },
});
