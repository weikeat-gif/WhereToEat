import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenPlaceholder } from '@/components/screen-placeholder';
import { useAuth } from '@/features/auth/auth-provider';
import { useAppTheme } from '@/theme/theme-provider';

import { useSavedPlaces } from './use-saved-places';

export function SavedScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { savedIds, isLoading, error, toggle } = useSavedPlaces(user?.id ?? null);

  if (!user) {
    return (
      <ScreenPlaceholder
        title="Saved"
        description="Sign in to save restaurants and sync them across devices.">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/auth')}
          style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={{ color: colors.accentText, fontWeight: '800' }}>
            Sign in
          </Text>
        </Pressable>
      </ScreenPlaceholder>
    );
  }

  return (
    <ScreenPlaceholder
      title="Saved"
      description="Restaurants saved to your MakanMana account.">
      {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.warning }}>
          {error}
        </Text>
      ) : null}
      {!isLoading && savedIds.size === 0 ? (
        <Text style={{ color: colors.textMuted }}>
          No saved restaurants yet.
        </Text>
      ) : (
        <FlatList
          data={[...savedIds]}
          keyExtractor={(id) => id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <Text numberOfLines={1} style={[styles.id, { color: colors.text }]}>
                {item}
              </Text>
              <Pressable
                accessibilityLabel={`Remove saved place ${item}`}
                accessibilityRole="button"
                onPress={() => void toggle(item)}>
                <Text style={{ color: colors.warning, fontWeight: '700' }}>
                  Remove
                </Text>
              </Pressable>
            </View>
          )}
          style={styles.list}
        />
      )}
    </ScreenPlaceholder>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 999,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  list: { marginTop: 16, width: '100%' },
  row: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 14,
  },
  id: { flex: 1 },
});
