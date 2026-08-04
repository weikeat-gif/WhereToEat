import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

import { useAuth } from './auth-provider';

export function DeleteAccountScreen() {
  const { colors } = useAppTheme();
  const { deleteAccount, error, isBusy, user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setConfirmed(false);
  }, [user?.id]);

  async function removeAccount() {
    try {
      await deleteAccount();
      router.replace('/(tabs)/profile');
    } catch {
      // AuthProvider exposes the safe user-facing error below.
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.eyebrow, { color: colors.accentForeground }]}>
          MAKANMANA ACCOUNT
        </Text>
        <Text style={[styles.title, { color: colors.text }]}>Delete account</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Delete your MakanMana account, saved restaurants, food preferences,
          profile metadata, locally saved area history, and other account-owned
          data. Deletion is immediate and cannot be undone.
        </Text>
        <Text style={[styles.secondaryBody, { color: colors.textMuted }]}>
          If automatic Sign in with Apple revocation is unavailable, your
          MakanMana account is still deleted. You can also remove MakanMana in
          your Apple ID Sign-In &amp; Security settings.
        </Text>

        {!user ? (
          <>
            <Text style={[styles.body, { color: colors.text }]}>
              Sign in with the account you want to delete. After sign-in, you
              will return here to confirm deletion.
            </Text>
            <Action
              label="Sign in to delete account"
              onPress={() => router.push('/auth')}
              primary
            />
          </>
        ) : confirmed ? (
          <View
            accessibilityLabel="Account deletion confirmation"
            accessibilityLiveRegion="polite"
            accessibilityViewIsModal
            style={[styles.confirmation, { borderColor: colors.warning }]}>
            <Text style={[styles.confirmationTitle, { color: colors.text }]}>
              Final confirmation
            </Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>
              You are deleting {user.email ?? 'this signed-in account'}.
            </Text>
            <Action
              disabled={isBusy}
              label="Permanently delete my account"
              onPress={() => void removeAccount()}
              primary
            />
            <Action
              disabled={isBusy}
              label="Keep my account"
              onPress={() => setConfirmed(false)}
            />
          </View>
        ) : (
          <View style={styles.signedInBlock}>
            <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Signed in as</Text>
            <Text style={[styles.accountValue, { color: colors.text }]}>
              {user.email ?? 'this signed-in account'}
            </Text>
            <Action
              disabled={isBusy}
              label="Continue to deletion confirmation"
              onPress={() => setConfirmed(true)}
            />
          </View>
        )}

        {error ? (
          <Text accessibilityRole="alert" style={[styles.error, { color: colors.warning }]}>
            {error}
          </Text>
        ) : null}
        <Action label="Back to MakanMana" onPress={() => router.replace('/(tabs)/profile')} />
      </View>
    </SafeAreaView>
  );
}

function Action({
  disabled = false,
  label,
  onPress,
  primary = false,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: primary ? colors.accent : colors.surface,
          borderColor: primary ? colors.accent : colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}>
      <Text
        style={[
          styles.actionText,
          { color: primary ? colors.accentText : colors.text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, gap: 18, justifyContent: 'center', padding: 24 },
  eyebrow: { fontFamily: fontFamily.semibold, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: fontFamily.display, fontSize: 38 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 23 },
  secondaryBody: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 18 },
  signedInBlock: { gap: 8 },
  accountLabel: { fontFamily: fontFamily.medium, fontSize: 12 },
  accountValue: { fontFamily: fontFamily.semibold, fontSize: 15, marginBottom: 6 },
  confirmation: { borderRadius: 16, borderWidth: 1, gap: 12, padding: 16 },
  confirmationTitle: { fontFamily: fontFamily.bold, fontSize: 18 },
  action: {
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
  },
  actionText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  error: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 19 },
});
