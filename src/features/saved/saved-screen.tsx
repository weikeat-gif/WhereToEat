import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { placesService } from '@/services/places';
import { useAppTheme } from '@/theme/theme-provider';

import { useSavedPlaces } from './use-saved-places';

export function SavedScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const {
    savedIds,
    pendingIds = new Set<string>(),
    isLoading,
    error,
    toggle,
  } = useSavedPlaces();
  const savedIdList = useMemo(() => [...savedIds], [savedIds]);
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({});
  const placeNameCache = useRef(new Map<string, string>());

  useEffect(() => {
    let active = true;
    const currentIds = new Set(savedIdList);
    for (const cachedId of placeNameCache.current.keys()) {
      if (!currentIds.has(cachedId)) placeNameCache.current.delete(cachedId);
    }
    if (savedIdList.length === 0) {
      setPlaceNames({});
      return () => {
        active = false;
      };
    }
    const missingIds = savedIdList.filter(
      (id) => !placeNameCache.current.has(id),
    );
    const loadNames = async () => {
      for (let index = 0; index < missingIds.length; index += 4) {
        const entries = await Promise.all(
          missingIds.slice(index, index + 4).map(async (id) => {
            try {
              const place = await placesService.getPlaceDetails(id);
              return [id, place.name] as const;
            } catch {
              return [id, 'Saved restaurant'] as const;
            }
          }),
        );
        if (!active) return;
        for (const [id, name] of entries) {
          placeNameCache.current.set(id, name);
        }
      }
      if (active) {
        setPlaceNames(
          Object.fromEntries(
            savedIdList.map((id) => [
              id,
              placeNameCache.current.get(id) ?? 'Saved restaurant',
            ]),
          ),
        );
      }
    };
    void loadNames();
    return () => {
      active = false;
    };
  }, [savedIdList]);

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
      {isLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading saved restaurants"
          color={colors.accentForeground}
        />
      ) : null}
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
          contentContainerStyle={styles.listContent}
          data={savedIdList}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <Pressable
                accessibilityLabel={`Open ${placeNames[item] ?? 'saved restaurant'}`}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: item },
                  })
                }
                style={styles.openPlace}>
                <Text
                  numberOfLines={1}
                  style={[styles.id, { color: colors.text }]}>
                  {placeNames[item] ?? 'Loading restaurant…'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove saved place ${item}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: pendingIds.has(item) }}
                disabled={pendingIds.has(item)}
                onPress={() => void toggle(item).catch(() => undefined)}
                style={[
                  styles.remove,
                  { opacity: pendingIds.has(item) ? 0.5 : 1 },
                ]}>
                <Text style={{ color: colors.warning, fontWeight: '700' }}>
                  Remove
                </Text>
              </Pressable>
            </View>
          )}
          style={styles.list}
          testID="saved-places-list"
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
  list: { marginTop: 16, maxHeight: '70%', width: '100%' },
  listContent: { paddingBottom: 12 },
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
  openPlace: { flex: 1, minHeight: 44, justifyContent: 'center' },
  remove: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 64,
  },
});
