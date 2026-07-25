import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import { useAuth } from '@/features/auth/auth-provider';
import { placesService } from '@/services/places';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

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
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.guest}>
          <View
            style={[
              styles.guestIcon,
              { backgroundColor: `${colors.accent}18` },
            ]}>
            <Ionicons
              color={colors.accentForeground}
              name="bookmark-outline"
              size={34}
            />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>
            Keep the good ones
          </Text>
          <Text style={[styles.guestBody, { color: colors.textMuted }]}>
            Sign in to save restaurants and sync them across devices.
          </Text>
          <Pressable
            accessibilityLabel="Sign in"
            accessibilityRole="button"
            onPress={() => router.push('/auth')}
            style={[styles.signIn, { backgroundColor: colors.accent }]}>
            <Text
              style={[styles.signInText, { color: colors.accentText }]}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.accentForeground }]}>
            YOUR SHORTLIST
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>Saved</Text>
        </View>
        <View
          style={[
            styles.count,
            { backgroundColor: colors.surfaceElevated },
          ]}>
          <Text style={[styles.countText, { color: colors.text }]}>
            {savedIdList.length}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading saved restaurants"
          color={colors.accentForeground}
          style={styles.loading}
        />
      ) : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.alert, { color: colors.warning }]}>
          {error}
        </Text>
      ) : null}

      {!isLoading && savedIds.size === 0 ? (
        <View
          style={[
            styles.empty,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Ionicons
            color={colors.textMuted}
            name="restaurant-outline"
            size={28}
          />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No saved restaurants yet.
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Save a place from its restaurant page and it will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={savedIdList}
          keyExtractor={(item) => item}
          ListFooterComponent={<GoogleMapsAttribution />}
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.surface,
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
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: colors.surfaceElevated },
                  ]}>
                  <Ionicons
                    color={colors.accentForeground}
                    name="restaurant-outline"
                    size={22}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text
                    numberOfLines={1}
                    style={[styles.name, { color: colors.text }]}>
                    {placeNames[item] ?? 'Loading restaurant…'}
                  </Text>
                  <Text style={[styles.savedLabel, { color: colors.textMuted }]}>
                    Saved to your MakanMana
                  </Text>
                </View>
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
                <Ionicons
                  color={colors.accentForeground}
                  name="bookmark"
                  size={22}
                />
              </Pressable>
            </View>
          )}
          style={styles.list}
          testID="saved-places-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  guest: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  guestIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    borderRadius: 24,
    justifyContent: 'center',
  },
  guestTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 27,
    letterSpacing: -0.6,
    marginTop: 20,
  },
  guestBody: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: 'center',
  },
  signIn: {
    minHeight: 52,
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 15,
    justifyContent: 'center',
    marginTop: 22,
  },
  signInText: { fontFamily: fontFamily.semibold, fontSize: 15 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    letterSpacing: -0.8,
    marginTop: 3,
  },
  count: {
    width: 42,
    height: 42,
    alignItems: 'center',
    borderRadius: 13,
    justifyContent: 'center',
  },
  countText: { fontFamily: fontFamily.bold, fontSize: 16 },
  loading: { marginTop: 28 },
  alert: { fontFamily: fontFamily.medium, marginHorizontal: 18, marginTop: 8 },
  empty: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    margin: 18,
    padding: 24,
  },
  emptyText: { fontFamily: fontFamily.semibold, fontSize: 16, marginTop: 11 },
  emptyHint: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    textAlign: 'center',
  },
  list: { flex: 1 },
  listContent: { gap: 9, padding: 14, paddingBottom: 28 },
  row: {
    minHeight: 78,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  openPlace: {
    minHeight: 54,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 11,
  },
  rowIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, minWidth: 0 },
  name: { fontFamily: fontFamily.semibold, fontSize: 15 },
  savedLabel: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 4 },
  remove: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
