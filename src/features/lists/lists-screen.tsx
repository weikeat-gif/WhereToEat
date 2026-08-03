import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import { CompactPlaceRow } from '@/components/ui/compact-place-row';
import type { PlaceSummary } from '@/contracts/place';
import {
  buildGoogleMapsPlaceUrl,
  buildWazeLocationUrl,
} from '@/features/directions/external-navigation';
import { DISCOVERY_PLACES, formatDistance, formatPrice } from '@/features/home/discovery-data';
import { useSearch } from '@/features/search/search-provider';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily, radius, spacing } from '@/theme/tokens';

type MealTime = 'now' | 'tonight';
type ShareProvider = 'google' | 'waze';

export function ListsScreen() {
  const { colors } = useAppTheme();
  const { results } = useSearch();
  const places = results;
  const [mealTime, setMealTime] = useState<MealTime>('now');
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareProviderOpen, setShareProviderOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    places[0]?.id,
  );
  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedId) ?? places[0],
    [places, selectedId],
  );

  useEffect(() => {
    if (selectedId && places.some((place) => place.id === selectedId)) return;
    setSelectedId(places[0]?.id);
  }, [places, selectedId]);

  const pickForMe = () => {
    if (places.length === 0) {
      router.push('/map');
      return;
    }
    const currentIndex = Math.max(
      0,
      places.findIndex((place) => place.id === selectedPlace?.id),
    );
    setSelectedId(places[(currentIndex + 1) % places.length].id);
  };

  const sharePlan = async (place: PlaceSummary, provider: ShareProvider) => {
    setShareError(null);
    setShareProviderOpen(false);
    try {
      const timing = mealTime === 'now' ? 'now' : 'tonight';
      const mapsUrl =
        provider === 'waze'
          ? buildWazeLocationUrl(place.coordinates)
          : buildGoogleMapsPlaceUrl(place.name, place.id);
      await Share.share({
        message: `Makan at ${place.name} ${timing}? ${mapsUrl}`,
        title: `MakanMana plan: ${place.name}`,
      });
    } catch {
      setShareError('Unable to open sharing right now. Please try again.');
    }
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.accentForeground }]}>
            NEXT MAKAN
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Make a food plan
          </Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            Pick one nearby place, decide when, then share or start directions.
          </Text>
        </View>

        <View
          style={[
            styles.timePicker,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          {(['now', 'tonight'] as const).map((value) => {
            const selected = mealTime === value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={value}
                onPress={() => setMealTime(value)}
                style={[
                  styles.timeOption,
                  selected && { backgroundColor: colors.accent },
                ]}>
                <Ionicons
                  color={selected ? colors.accentText : colors.textMuted}
                  name={value === 'now' ? 'flash-outline' : 'moon-outline'}
                  size={18}
                />
                <Text
                  style={[
                    styles.timeOptionText,
                    { color: selected ? colors.accentText : colors.text },
                  ]}>
                  {value === 'now' ? 'Eat now' : 'Tonight'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedPlace ? (
          <View
            style={[
              styles.planCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={styles.planHeading}>
              <View style={styles.planCopy}>
                <Text style={[styles.planLabel, { color: colors.textMuted }]}>
                  YOUR PICK
                </Text>
                <Text style={[styles.planName, { color: colors.text }]}>
                  {selectedPlace.name}
                </Text>
                <Text style={[styles.planMeta, { color: colors.textMuted }]}>
                  {formatDistance(selectedPlace.distanceMeters)} ·{' '}
                  {formatPrice(
                    selectedPlace.priceLevel,
                    selectedPlace.priceRange,
                  )}
                </Text>
              </View>
              <View
                style={[
                  styles.planIcon,
                  { backgroundColor: `${colors.accent}24` },
                ]}>
                <Ionicons
                  color={colors.accentForeground}
                  name="restaurant"
                  size={26}
                />
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/directions/[id]',
                    params: { id: selectedPlace.id },
                  })
                }
                style={[styles.primaryAction, { backgroundColor: colors.accent }]}>
                <Ionicons
                  color={colors.accentText}
                  name="navigate-outline"
                  size={18}
                />
                <Text
                  style={[styles.actionText, { color: colors.accentText }]}>
                  Directions
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setShareError(null);
                  setShareProviderOpen(true);
                }}
                style={[
                  styles.secondaryAction,
                  { backgroundColor: colors.surfaceElevated },
                ]}>
                <Ionicons color={colors.text} name="share-outline" size={18} />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  Share
                </Text>
              </Pressable>
            </View>
            {shareProviderOpen ? (
              <View
                style={[
                  styles.shareProvider,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                  },
                ]}>
                <View style={styles.shareProviderHeading}>
                  <View style={styles.shareProviderCopy}>
                    <Text
                      style={[styles.shareProviderTitle, { color: colors.text }]}>
                      Choose a location link
                    </Text>
                    <Text
                      style={[
                        styles.shareProviderHint,
                        { color: colors.textMuted },
                      ]}>
                      Share the restaurant through Waze or Google Maps.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Close share options"
                    accessibilityRole="button"
                    onPress={() => setShareProviderOpen(false)}
                    style={styles.closeShareProvider}>
                    <Ionicons color={colors.textMuted} name="close" size={20} />
                  </Pressable>
                </View>
                <View style={styles.shareProviderActions}>
                  <Pressable
                    accessibilityLabel="Share Waze location"
                    accessibilityRole="button"
                    onPress={() => void sharePlan(selectedPlace, 'waze')}
                    style={[
                      styles.shareProviderButton,
                      { backgroundColor: colors.accent },
                    ]}>
                    <Ionicons color={colors.accentText} name="navigate" size={18} />
                    <Text
                      style={[
                        styles.shareProviderButtonText,
                        { color: colors.accentText },
                      ]}>
                      Waze
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Share Google Maps location"
                    accessibilityRole="button"
                    onPress={() => void sharePlan(selectedPlace, 'google')}
                    style={[
                      styles.shareProviderButton,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}>
                    <Ionicons color={colors.text} name="map-outline" size={18} />
                    <Text
                      style={[
                        styles.shareProviderButtonText,
                        { color: colors.text },
                      ]}>
                      Google Maps
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {shareError ? (
              <Text accessibilityRole="alert" style={{ color: colors.warning }}>
                {shareError}
              </Text>
            ) : null}
          </View>
        ) : (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Ionicons
              color={colors.accentForeground}
              name="map-outline"
              size={28}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Find nearby food first
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              Your current search results will appear here so you can make a plan.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/map')}
              style={[styles.primaryAction, { backgroundColor: colors.accent }]}>
              <Text style={[styles.actionText, { color: colors.accentText }]}>
                Open search
              </Text>
            </Pressable>
          </View>
        )}

        <Pressable
          accessibilityLabel="Pick another nearby restaurant"
          accessibilityRole="button"
          onPress={pickForMe}
          style={[
            styles.pickButton,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}>
          <Ionicons color={colors.accentForeground} name="dice-outline" size={21} />
          <View style={styles.pickCopy}>
            <Text style={[styles.pickTitle, { color: colors.text }]}>
              Pick for me
            </Text>
            <Text style={[styles.pickHint, { color: colors.textMuted }]}>
              Cycle through the food already found nearby
            </Text>
          </View>
          <Ionicons color={colors.textMuted} name="refresh" size={20} />
        </Pressable>

        {places.length > 0 ? (
          <View style={styles.nearbySection}>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Nearby choices
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/map')}>
                <Text style={[styles.seeMap, { color: colors.accentForeground }]}>
                  See map
                </Text>
              </Pressable>
            </View>
            <View style={styles.rows}>
              {places.slice(0, 5).map((place) => (
                <View
                  key={place.id}
                  style={
                    selectedPlace?.id === place.id
                      ? [
                          styles.selectedRow,
                          { borderColor: colors.accentForeground },
                        ]
                      : undefined
                  }>
                  <CompactPlaceRow
                    image={
                      DISCOVERY_PLACES.find(
                        (candidate) => candidate.id === place.id,
                      )?.image
                    }
                    onPress={() => setSelectedId(place.id)}
                    place={place}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <GoogleMapsAttribution />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  timePicker: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  timeOption: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
  },
  timeOptionText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  planCard: { borderRadius: 20, borderWidth: 1, gap: spacing.lg, padding: spacing.lg },
  planHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  planCopy: { flex: 1 },
  planLabel: { fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 1.1 },
  planName: { fontFamily: fontFamily.bold, fontSize: 23, marginTop: 5 },
  planMeta: { fontFamily: fontFamily.medium, fontSize: 13, marginTop: 6 },
  planIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  primaryAction: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  secondaryAction: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  actionText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  shareProvider: {
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  shareProviderHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shareProviderCopy: { flex: 1 },
  shareProviderTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  shareProviderHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  closeShareProvider: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  shareProviderActions: { flexDirection: 'row', gap: spacing.sm },
  shareProviderButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  shareProviderButtonText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: { fontFamily: fontFamily.semibold, fontSize: 18 },
  emptyBody: {
    fontFamily: fontFamily.regular,
    lineHeight: 20,
    textAlign: 'center',
  },
  pickButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 70,
    padding: spacing.md,
  },
  pickCopy: { flex: 1 },
  pickTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  pickHint: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 3 },
  nearbySection: { gap: spacing.md },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontFamily: fontFamily.semibold, fontSize: 19 },
  seeMap: { fontFamily: fontFamily.semibold, fontSize: 13 },
  rows: { gap: spacing.sm },
  selectedRow: { borderRadius: 17, borderWidth: 2, padding: 2 },
});
