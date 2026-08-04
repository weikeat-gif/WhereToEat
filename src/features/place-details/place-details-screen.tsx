import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import { IconButton } from '@/components/ui/icon-button';
import { SemanticChip } from '@/components/ui/semantic-chip';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/auth-provider';
import {
  buildGoogleMapsNavigationUrl,
  buildGoogleMapsPlaceUrl,
  buildWazeLocationUrl,
  buildWazeNavigationUrl,
} from '@/features/directions/external-navigation';
import {
  DISCOVERY_PLACES,
  formatDistance,
  formatPrice,
  formatReviews,
} from '@/features/home/discovery-data';
import { recordPromotionView } from '@/features/promotions/promotion-service';
import { useSavedPlaces } from '@/features/saved/use-saved-places';
import { useSearch } from '@/features/search/search-provider';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

import { loadDisplayPlace } from './place-details-loader';
import { placeOpeningStatus } from './place-status';

const CATEGORY_ICONS = [
  'fast-food-outline',
  'restaurant-outline',
  'people-outline',
] as const;
const HIDDEN_GENERIC_CATEGORIES = new Set([
  'Food',
  'Store',
  'Point Of Interest',
  'Establishment',
]);
type ProviderAction = 'navigate' | 'share';
type LocationProvider = 'waze' | 'google';

export function PlaceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const {
    savedIds,
    pendingIds = new Set<string>(),
    error: saveError,
    toggle,
  } = useSavedPlaces();
  const { results } = useSearch();
  const initialPlace =
    env.EXPO_PUBLIC_DATA_MODE === 'mock'
      ? DISCOVERY_PLACES.find((candidate) => candidate.id === id)
      : undefined;
  const [loadedPlace, setLoadedPlace] = useState(initialPlace);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [providerAction, setProviderAction] = useState<ProviderAction | null>(
    null,
  );
  const summary = results.find((candidate) => candidate.id === loadedPlace?.id);
  const place = loadedPlace && summary
    ? { ...loadedPlace, ...summary }
    : loadedPlace;
  const saved = place ? savedIds.has(place.id) : false;
  const openingStatus = placeOpeningStatus(place?.isOpen);
  const promotionId = place?.promotion?.id;
  const visibleCategories = (place?.categories ?? [])
    .filter((category) => !HIDDEN_GENERIC_CATEGORIES.has(category))
    .slice(0, 4);

  useEffect(() => {
    let active = true;
    const fixture =
      env.EXPO_PUBLIC_DATA_MODE === 'mock'
        ? DISCOVERY_PLACES.find((candidate) => candidate.id === id)
        : undefined;
    if (fixture) {
      setLoadedPlace(fixture);
      setLoadError(null);
      return () => {
        active = false;
      };
    }

    setLoadedPlace(undefined);
    setLoadError(null);
    void loadDisplayPlace(id)
      .then((loaded) => {
        if (!active) return;
        setLoadedPlace(loaded);
      })
      .catch(() => {
        if (active) setLoadError('Unable to load this restaurant.');
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!promotionId) return;
    void recordPromotionView(promotionId).catch(() => undefined);
  }, [promotionId]);

  function toggleSave() {
    if (!place) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    void toggle(place.id).catch(() => undefined);
  }

  function sharePlace() {
    if (!place) return;
    setActionError(null);
    setProviderAction('share');
  }

  function openDirections() {
    if (!place) return;
    setActionError(null);
    setProviderAction('navigate');
  }

  async function handleLocationProvider(provider: LocationProvider) {
    if (!place || !providerAction) return;
    const action = providerAction;
    const url =
      provider === 'waze'
        ? action === 'share'
          ? buildWazeLocationUrl(place.coordinates)
          : buildWazeNavigationUrl(place.coordinates)
        : action === 'share'
          ? buildGoogleMapsPlaceUrl(place.name, place.id)
          : buildGoogleMapsNavigationUrl(place.coordinates, place.id);
    setProviderAction(null);
    setActionError(null);
    try {
      if (action === 'share') {
        await Share.share({
          message: `${place.name} — ${place.subtitle}. ${place.address}\n${url}`,
          title: place.name,
        });
      } else {
        await Linking.openURL(url);
      }
    } catch {
      setActionError(
        action === 'share'
          ? 'Unable to share this restaurant.'
          : 'Unable to open that navigation app.',
      );
    }
  }

  async function openGoogleReview(url: string) {
    setActionError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setActionError('Unable to open Google Maps reviews right now.');
    }
  }

  if (!place) {
    return (
      <View
        style={[
          styles.loadingRoot,
          { backgroundColor: colors.background, paddingTop: insets.top + 24 },
        ]}>
        <IconButton
          accessibilityLabel="Go back"
          backgroundColor={colors.surface}
          color={colors.text}
          icon="chevron-back"
          onPress={() => router.back()}
        />
        {loadError ? (
          <Text accessibilityRole="alert" style={{ color: colors.warning }}>
            {loadError}
          </Text>
        ) : (
          <View
            accessibilityLabel="Loading restaurant"
            style={styles.loadingSkeleton}>
            <View
              testID="restaurant-loading-hero"
              style={[styles.loadingHero, { backgroundColor: colors.surface }]}>
              <ActivityIndicator
                color={colors.accentForeground}
              />
            </View>
            <View
              style={[
                styles.loadingLineWide,
                { backgroundColor: colors.surfaceElevated },
              ]}
            />
            <View
              style={[
                styles.loadingLine,
                { backgroundColor: colors.surfaceElevated },
              ]}
            />
            <ActivityIndicator
              color={colors.accentForeground}
            />
            <Text style={{ color: colors.textMuted }}>
              Loading restaurant…
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 118 + insets.bottom }}
        showsVerticalScrollIndicator={false}>
        <View
          testID={!place.image ? 'no-photo-hero' : undefined}
          style={[styles.hero, !place.image && styles.heroCompact]}>
          {place.image ? (
            <Image
              accessibilityLabel={`${place.name} signature dish`}
              contentFit="cover"
              source={place.image}
              style={StyleSheet.absoluteFill}
              transition={180}
            />
          ) : (
            <View
              accessibilityLabel={`${place.name} has no photo`}
              style={[
                StyleSheet.absoluteFill,
                styles.heroNoPhoto,
              ]}>
              <Ionicons
                accessibilityElementsHidden
                accessible={false}
                color="#D7DAD5"
                importantForAccessibility="no-hide-descendants"
                name="restaurant-outline"
                size={38}
              />
              <Text style={styles.heroNoPhotoText}>
                Photo unavailable
              </Text>
            </View>
          )}
          <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
          <View style={styles.heroCopy}>
            <Text
              maxFontSizeMultiplier={1.15}
              numberOfLines={2}
              style={styles.name}>
              {place.name}
            </Text>
            <Text style={styles.subtitle}>{place.subtitle}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.heroMetaItem}>
                <Ionicons color="#C6FF00" name="star" size={18} />
                <Text style={styles.heroRating}>{place.rating.toFixed(1)}</Text>
                <Text style={styles.heroMuted}>
                  ({formatReviews(place.reviewCount)})
                </Text>
              </View>
              <Text style={styles.heroMuted}>•</Text>
              <View style={styles.heroMetaItem}>
                <Ionicons color="#FFFFFF" name="navigate-outline" size={17} />
                <Text style={styles.heroMuted}>
                  {formatDistance(place.distanceMeters)}
                </Text>
              </View>
              <Text style={styles.heroMuted}>•</Text>
              <Text style={styles.heroPrice}>
                {formatPrice(place.priceLevel, place.priceRange)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.openRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={styles.openLabel}>
              <Ionicons
                color={
                  openingStatus.tone === 'success'
                    ? colors.success
                    : openingStatus.tone === 'warning'
                      ? colors.warning
                      : colors.textMuted
                }
                name="time-outline"
                size={19}
              />
              <Text
                style={[
                  styles.open,
                  {
                    color:
                      openingStatus.tone === 'success'
                        ? colors.success
                        : openingStatus.tone === 'warning'
                          ? colors.warning
                          : colors.textMuted,
                  },
                ]}>
                {openingStatus.label}
              </Text>
              {place.openingNote !== openingStatus.label ? (
                <Text style={[styles.openingNote, { color: colors.textMuted }]}>
                  • {place.openingNote}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.chips}>
            {place.promotion ? (
              <SemanticChip
                color={colors.supper}
                icon="megaphone"
                label="Sponsored"
              />
            ) : null}
            {visibleCategories.map((category, index) => (
              <SemanticChip
                color={
                  index === 0
                    ? colors.cafe
                    : index === 1
                      ? colors.price
                      : colors.halal
                }
                icon={CATEGORY_ICONS[index] ?? 'pricetag-outline'}
                key={category}
                label={category}
              />
            ))}
          </View>

          <Text style={[styles.description, { color: colors.text }]}>
            {place.description}
          </Text>
          {saveError ? (
            <Text accessibilityRole="alert" style={{ color: colors.warning }}>
              {saveError}
            </Text>
          ) : null}
          {place.popularPicks.length > 0 ? (
            <>
              <View style={styles.sectionTitleRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Popular picks
                  </Text>
                  <Text style={[styles.sectionNote, { color: colors.textMuted }]}>
                    The regulars keep ordering these
                  </Text>
                </View>
                <Ionicons color={colors.supper} name="flame" size={24} />
              </View>

              <ScrollView
                contentContainerStyle={styles.picks}
                horizontal
                showsHorizontalScrollIndicator={false}>
                {place.popularPicks.map((pick) => (
                  <View
                    key={pick.name}
                    style={[
                      styles.pickCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}>
                    <Image
                      accessibilityLabel={pick.name}
                      contentFit="cover"
                      source={pick.image}
                      style={styles.pickImage}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.pickName, { color: colors.text }]}>
                      {pick.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

          <View
            style={[
              styles.addressCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={[styles.addressIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons
                color={colors.accentForeground}
                name="location"
                size={22}
              />
            </View>
            <View style={styles.addressCopy}>
              <Text style={[styles.addressLabel, { color: colors.textMuted }]}>
                Find it here
              </Text>
              <Text style={[styles.address, { color: colors.text }]}>
                {place.address}
              </Text>
            </View>
          </View>

          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeadingRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Google reviews
                </Text>
                <Text style={[styles.sectionNote, { color: colors.textMuted }]}>
                  Up to 3 reviews, ordered by Google relevance.
                </Text>
              </View>
              <Ionicons color={colors.accentForeground} name="star" size={22} />
            </View>

            {(place.reviews ?? []).length > 0 ? (
              (place.reviews ?? []).slice(0, 3).map((review) => (
                <View
                  key={review.id}
                  style={[
                    styles.reviewCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAuthorRow}>
                      {review.authorPhotoUrl ? (
                        <Image
                          accessibilityLabel={`${review.authorName}'s Google Maps profile photo`}
                          contentFit="cover"
                          source={{ uri: review.authorPhotoUrl }}
                          style={styles.reviewAvatar}
                        />
                      ) : (
                        <View
                          accessibilityLabel={`${review.authorName}'s Google Maps profile photo`}
                          style={[
                            styles.reviewAvatarFallback,
                            { backgroundColor: colors.surfaceElevated },
                          ]}>
                          <Ionicons
                            color={colors.textMuted}
                            name="person"
                            size={18}
                          />
                        </View>
                      )}
                      <View style={styles.reviewAuthorCopy}>
                        {review.authorUrl ? (
                          <Pressable
                            accessibilityLabel={`Open ${review.authorName}'s Google Maps profile`}
                            accessibilityRole="link"
                            onPress={() =>
                              void openGoogleReview(review.authorUrl!)
                            }>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.reviewAuthor,
                                { color: colors.text },
                              ]}>
                              {review.authorName}
                            </Text>
                          </Pressable>
                        ) : (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.reviewAuthor,
                              { color: colors.text },
                            ]}>
                            {review.authorName}
                          </Text>
                        )}
                        {review.relativePublishTime ? (
                          <Text
                            style={[
                              styles.reviewTime,
                              { color: colors.textMuted },
                            ]}>
                            {review.relativePublishTime}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      <Ionicons color="#F5B301" name="star" size={15} />
                      <Text
                        style={[styles.reviewRatingText, { color: colors.text }]}>
                        {review.rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    numberOfLines={5}
                    style={[styles.reviewText, { color: colors.text }]}>
                    {review.text}
                  </Text>
                  <Pressable
                    accessibilityLabel={`View ${review.authorName}'s review on Google Maps`}
                    accessibilityRole="link"
                    onPress={() => void openGoogleReview(review.googleMapsUrl)}
                    style={({ pressed }) => [
                      styles.reviewLink,
                      { opacity: pressed ? 0.68 : 1 },
                    ]}>
                    <Text
                      style={[
                        styles.reviewLinkText,
                        { color: colors.accentForeground },
                      ]}>
                      View on Google Maps
                    </Text>
                    <Ionicons
                      color={colors.accentForeground}
                      name="open-outline"
                      size={15}
                    />
                  </Pressable>
                </View>
              ))
            ) : (
              <View
                style={[
                  styles.reviewsEmpty,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}>
                <Text style={[styles.reviewText, { color: colors.textMuted }]}>
                  Review excerpts are unavailable in this preview.
                </Text>
                <Pressable
                  accessibilityLabel="Read reviews on Google Maps"
                  accessibilityRole="link"
                  onPress={() =>
                    void openGoogleReview(
                      buildGoogleMapsPlaceUrl(place.name, place.id),
                    )
                  }
                  style={({ pressed }) => [
                    styles.reviewLink,
                    { opacity: pressed ? 0.68 : 1 },
                  ]}>
                  <Text
                    style={[
                      styles.reviewLinkText,
                      { color: colors.accentForeground },
                    ]}>
                    Read reviews on Google Maps
                  </Text>
                  <Ionicons
                    color={colors.accentForeground}
                    name="open-outline"
                    size={15}
                  />
                </Pressable>
              </View>
            )}
          </View>
          <GoogleMapsAttribution />
        </View>
      </ScrollView>

      <View style={[styles.topActions, { top: insets.top + 8 }]}>
        <IconButton
          accessibilityLabel="Go back"
          backgroundColor="rgba(8,10,9,0.82)"
          color="#FFFFFF"
          icon="chevron-back"
          onPress={() => router.back()}
        />
        <View style={styles.topActionsRight}>
          <IconButton
            accessibilityLabel={saved ? 'Remove from saved places' : 'Save place'}
            backgroundColor="rgba(8,10,9,0.82)"
            color={saved ? '#C6FF00' : '#FFFFFF'}
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            disabled={pendingIds.has(place.id)}
            onPress={toggleSave}
            testID="save-place-button"
          />
          <IconButton
            accessibilityLabel="Share place"
            backgroundColor="rgba(8,10,9,0.82)"
            color="#FFFFFF"
            icon="share-outline"
            onPress={sharePlace}
          />
        </View>
      </View>

      {actionError ? (
        <Text
          accessibilityRole="alert"
          style={[
            styles.actionAlert,
            {
              backgroundColor: colors.surface,
              borderColor: colors.warning,
              bottom: 100 + Math.max(insets.bottom, 12),
              color: colors.warning,
            },
          ]}>
          {actionError}
        </Text>
      ) : null}

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.navBackground,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <View style={styles.directionAction}>
          <ActionButton
            backgroundColor={colors.accent}
            color={colors.accentText}
            icon="arrow-forward"
            label={`Directions · ${formatDistance(place.distanceMeters)}`}
            onPress={openDirections}
            testID="directions-button"
          />
        </View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setProviderAction(null)}
        transparent
        visible={providerAction !== null}>
        <View style={styles.navigationModal}>
          <Pressable
            accessibilityLabel={`Close ${providerAction ?? 'location'} options`}
            accessibilityRole="button"
            onPress={() => setProviderAction(null)}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.navigationSheet,
              {
                backgroundColor: colors.navBackground,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 18),
              },
            ]}>
            <View style={styles.navigationHandle} />
            <Text style={[styles.navigationTitle, { color: colors.text }]}>
              {providerAction === 'share'
                ? 'Choose a location link'
                : 'Choose your navigation app'}
            </Text>
            <Text
              style={[styles.navigationSubtitle, { color: colors.textMuted }]}>
              {providerAction === 'share'
                ? 'Pick the map link to include in your share message.'
                : 'MakanMana will open this restaurant in an external navigation app.'}
            </Text>
            <Pressable
              accessibilityLabel={
                providerAction === 'share'
                  ? 'Share Waze location'
                  : 'Navigate with Waze'
              }
              accessibilityRole="button"
              onPress={() => void handleLocationProvider('waze')}
              style={({ pressed }) => [
                styles.navigationOption,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.76 : 1,
                },
              ]}>
              <Ionicons color={colors.accentText} name="navigate" size={22} />
              <Text
                style={[
                  styles.navigationOptionText,
                  { color: colors.accentText },
                ]}>
                Waze
              </Text>
              <Ionicons
                color={colors.accentText}
                name="open-outline"
                size={18}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={
                providerAction === 'share'
                  ? 'Share Google Maps location'
                  : 'Navigate with Google Maps'
              }
              accessibilityRole="button"
              onPress={() => void handleLocationProvider('google')}
              style={({ pressed }) => [
                styles.navigationOption,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <Ionicons color={colors.text} name="map-outline" size={22} />
              <Text
                style={[styles.navigationOptionText, { color: colors.text }]}>
                Google Maps
              </Text>
              <Ionicons color={colors.text} name="open-outline" size={18} />
            </Pressable>
            <Pressable
              accessibilityLabel={`Cancel ${providerAction ?? 'location'}`}
              accessibilityRole="button"
              onPress={() => setProviderAction(null)}
              style={styles.navigationCancel}>
              <Text
                style={[
                  styles.navigationCancelText,
                  { color: colors.textMuted },
                ]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    gap: 18,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingSkeleton: { alignItems: 'center', gap: 14, width: '100%' },
  loadingHero: {
    height: 260,
    alignItems: 'center',
    borderRadius: 20,
    justifyContent: 'center',
    width: '100%',
  },
  loadingLineWide: { borderRadius: 7, height: 18, width: '88%' },
  loadingLine: { borderRadius: 7, height: 14, width: '64%' },
  hero: { height: 350, justifyContent: 'flex-end' },
  heroCompact: { height: 260 },
  heroNoPhoto: {
    alignItems: 'center',
    backgroundColor: '#20231F',
    gap: 8,
    justifyContent: 'flex-start',
    paddingTop: 38,
  },
  heroNoPhotoText: {
    color: '#D7DAD5',
    fontFamily: fontFamily.semibold,
  },
  heroShade: { backgroundColor: 'rgba(0,0,0,0.28)' },
  heroCopy: { padding: 20, paddingBottom: 24 },
  name: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 31,
  },
  subtitle: {
    color: '#D7DAD5',
    fontFamily: fontFamily.medium,
    fontSize: 15,
    marginTop: 4,
  },
  heroMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  heroMetaItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  heroRating: { color: '#D7F36A', fontFamily: fontFamily.semibold, fontSize: 16 },
  heroMuted: { color: '#E0E2DE', fontFamily: fontFamily.medium, fontSize: 14 },
  heroPrice: { color: '#D7F36A', fontFamily: fontFamily.semibold, fontSize: 15 },
  body: { gap: 17, padding: 16 },
  openRow: {
    minHeight: 54,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  openLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  open: { fontFamily: fontFamily.semibold, fontSize: 14 },
  openingNote: { fontFamily: fontFamily.regular, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  description: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 22 },
  sectionTitleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 19,
    letterSpacing: -0.25,
  },
  sectionNote: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 3 },
  picks: { gap: 10, paddingRight: 16 },
  pickCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    width: 142,
  },
  pickImage: { height: 96, width: '100%' },
  pickName: { fontFamily: fontFamily.semibold, fontSize: 13, padding: 10 },
  addressCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  addressIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    borderRadius: 15,
    justifyContent: 'center',
  },
  addressCopy: { flex: 1 },
  addressLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  address: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3,
  },
  reviewsSection: { gap: 10 },
  reviewsHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  reviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  reviewAuthorRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  reviewAvatar: { borderRadius: 18, height: 36, width: 36 },
  reviewAvatarFallback: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  reviewAuthorCopy: { flex: 1 },
  reviewAuthor: { fontFamily: fontFamily.semibold, fontSize: 14 },
  reviewTime: { fontFamily: fontFamily.regular, fontSize: 12, marginTop: 2 },
  reviewRating: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  reviewRatingText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  reviewText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  reviewLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    minHeight: 44,
  },
  reviewLinkText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  reviewsEmpty: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  topActions: {
    left: 16,
    right: 16,
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topActionsRight: { flexDirection: 'row', gap: 8 },
  actionAlert: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    left: 18,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    position: 'absolute',
    right: 18,
    zIndex: 6,
  },
  footer: {
    left: 10,
    right: 10,
    bottom: 8,
    position: 'absolute',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  directionAction: { flex: 1 },
  navigationModal: {
    backgroundColor: 'rgba(0,0,0,0.56)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  navigationSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  navigationHandle: {
    alignSelf: 'center',
    backgroundColor: '#6D746F',
    borderRadius: 3,
    height: 5,
    marginBottom: 4,
    width: 46,
  },
  navigationTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 22,
    letterSpacing: -0.35,
  },
  navigationSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  navigationOption: {
    alignItems: 'center',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  navigationOptionText: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
  },
  navigationCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  navigationCancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
});
