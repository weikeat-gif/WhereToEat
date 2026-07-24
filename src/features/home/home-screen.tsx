import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import { PlaceCard } from '@/components/ui/place-card';
import { SemanticChip } from '@/components/ui/semantic-chip';
import { useSearch } from '@/features/search/search-provider';
import { i18n } from '@/i18n';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

import { DISCOVERY_PLACES, heroImage } from './discovery-data';

const brandMark = require('../../../assets/images/brand/makanmana-mark.png');

export function HomeScreen() {
  const { colors } = useAppTheme();
  const {
    criteria,
    error: searchError,
    results,
    search,
    searchCurrentLocation,
    status: searchStatus,
    surpriseMe,
  } = useSearch();
  const { fontScale, width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openNowActive, setOpenNowActive] = useState(criteria.openNow);
  const [notice, setNotice] = useState<string | null>(null);
  const nearbyRequestInFlight = useRef(false);
  const visiblePlaces = searchStatus === 'idle' ? DISCOVERY_PLACES : results;

  const compact = width < 360 || fontScale > 1.3;
  const filters = useMemo(
    () => [
      {
        label: 'Halal',
        icon: 'restaurant-outline' as const,
        color: colors.halal,
        category: 'Halal',
      },
      {
        label: 'Open now',
        icon: 'time-outline' as const,
        color: colors.success,
        category: 'Open now',
      },
      {
        label: 'Under RM20',
        icon: 'wallet-outline' as const,
        color: colors.price,
        category: 'Under RM20',
      },
      {
        label: 'Supper',
        icon: 'moon-outline' as const,
        color: colors.supper,
        category: 'Supper',
      },
    ],
    [colors],
  );

  useEffect(() => {
    setOpenNowActive(criteria.openNow);
  }, [criteria.openNow]);

  async function applyDiscovery(
    category?: string | null,
    openNow = openNowActive,
  ) {
    const nextCategory =
      category === undefined ? selectedCategory : category;
    const searchResults = await search({
      ...criteria,
      openNow,
      categories:
        nextCategory &&
        nextCategory !== 'Halal' &&
        nextCategory !== 'Open now' &&
        nextCategory !== 'Under RM20'
          ? [nextCategory]
          : [],
      verifiedHalalOnly: nextCategory === 'Halal',
      priceLevels:
        nextCategory === 'Under RM20'
          ? [1]
          : selectedCategory === 'Under RM20'
            ? [1, 2]
            : criteria.priceLevels,
    });
    if (searchResults) {
      const count = searchResults.places.length;
      setNotice(`${count} nearby ${count === 1 ? 'place' : 'places'} ready`);
    }
  }

  function handleFilter(category: string) {
    if (category === 'Open now') {
      const nextOpenNow = !openNowActive;
      setOpenNowActive(nextOpenNow);
      void applyDiscovery(selectedCategory, nextOpenNow);
      return;
    }
    const next = selectedCategory === category ? null : category;
    setSelectedCategory(next);
    void applyDiscovery(next);
  }

  function handleSurprise() {
    const picked = surpriseMe();
    if (!picked) {
      setNotice(i18n.t('homeSurpriseUnavailable'));
      return;
    }
    router.push({ pathname: '/place/[id]', params: { id: picked.id } });
  }

  async function handleNearbyNow() {
    if (nearbyRequestInFlight.current) return;
    nearbyRequestInFlight.current = true;
    try {
      await searchCurrentLocation();
      router.push('/map');
    } finally {
      nearbyRequestInFlight.current = false;
    }
  }

  function openPlace(id: string) {
    router.push({ pathname: '/place/[id]', params: { id } });
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View
            accessible
            accessibilityLabel={`${i18n.t('appName')}, ${i18n.t('homeBrandNote')}`}
            accessibilityRole="header"
            style={styles.brandLockup}>
            <Image
              accessible={false}
              accessibilityIgnoresInvertColors
              contentFit="contain"
              source={brandMark}
              testID="brand-mark"
              style={styles.brandMark}
            />
          </View>
          <Pressable
            accessibilityLabel={`Location: ${i18n.t('homeArea')}`}
            accessibilityRole="button"
            onPress={() => router.push('/map')}
            style={[styles.location, { borderColor: colors.border }]}>
            <Ionicons
              color={colors.accentForeground}
              name="location-outline"
              size={20}
            />
            {!compact && (
              <Text style={[styles.locationText, { color: colors.text }]}>
                {i18n.t('homeArea')}
              </Text>
            )}
            <Ionicons color={colors.textMuted} name="chevron-down" size={15} />
          </Pressable>
        </View>

        <View style={[styles.hero, compact && styles.heroCompact]}>
          <Image
            accessibilityLabel="Kuala Lumpur night market"
            contentFit="cover"
            source={heroImage}
            style={StyleSheet.absoluteFill}
            transition={220}
          />
          <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
          <View style={styles.heroCopy}>
            <Text maxFontSizeMultiplier={1.3} style={styles.eyebrow}>
              {i18n.t('homeEyebrow')}
            </Text>
            <Text
              maxFontSizeMultiplier={compact ? 1.2 : 1.35}
              style={[styles.headline, compact && styles.headlineCompact]}>
              {i18n.t('homeHeadline')}
            </Text>
          </View>
          <View style={styles.heroActions}>
            <ActionButton
              backgroundColor={colors.accent}
              color={colors.accentText}
              icon="navigate"
              label={i18n.t('nearbyNow')}
              onPress={() => void handleNearbyNow()}
              testID="nearby-now-button"
            />
            <ActionButton
              backgroundColor="rgba(8,10,9,0.82)"
              borderColor="rgba(255,255,255,0.42)"
              color="#FFFFFF"
              icon="sparkles"
              label={i18n.t('surpriseMe')}
              onPress={handleSurprise}
              testID="surprise-me-button"
            />
          </View>
        </View>

        <Pressable
          accessibilityHint={i18n.t('homeSearchHint')}
          accessibilityLabel={i18n.t('homeSearchLabel')}
          accessibilityRole="button"
          onPress={() => router.push('/map')}
          style={[
            styles.search,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Ionicons color={colors.textMuted} name="search" size={21} />
          <Text
            maxFontSizeMultiplier={1.35}
            style={[styles.searchText, { color: colors.textMuted }]}>
            {i18n.t('homeSearchPlaceholder')}
          </Text>
          <View style={[styles.tune, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons
              color={colors.accentForeground}
              name="options-outline"
              size={19}
            />
          </View>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.filterRow}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <SemanticChip
              color={filter.color}
              icon={filter.icon}
              key={filter.label}
              label={filter.label}
              onPress={() => handleFilter(filter.category)}
              selected={
                filter.category === 'Open now'
                  ? openNowActive
                  : selectedCategory === filter.category
              }
            />
          ))}
        </ScrollView>

        {notice && (
          <View style={[styles.status, { backgroundColor: `${colors.accent}1A` }]}>
            <Ionicons
              color={colors.accentForeground}
              name="checkmark-circle"
              size={18}
            />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {notice}
            </Text>
          </View>
        )}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {i18n.t('homeTrending')}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              {i18n.t('homeTrendingSubtitle')}
            </Text>
          </View>
          <Ionicons
            color={colors.accentForeground}
            name="trending-up"
            size={24}
          />
        </View>

        <View style={styles.cards}>
          {searchStatus === 'empty' ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No places match these filters yet.
            </Text>
          ) : null}
          {searchStatus === 'error' ? (
            <Text accessibilityRole="alert" style={[styles.empty, { color: colors.warning }]}>
              {searchError ?? 'Unable to load nearby restaurants.'}
            </Text>
          ) : null}
          {visiblePlaces.map((place) => (
            <PlaceCard
              image={
                DISCOVERY_PLACES.find((candidate) => candidate.id === place.id)
                  ?.image
              }
              key={place.id}
              onPress={() => openPlace(place.id)}
              place={place}
            />
          ))}
        </View>
        <GoogleMapsAttribution />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: 16, paddingBottom: 30 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  brandLockup: {
    alignItems: 'center',
    flexShrink: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  brandMark: { height: 42, width: 38 },
  location: {
    minHeight: 44,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  locationText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  hero: {
    minHeight: 410,
    justifyContent: 'space-between',
    marginHorizontal: 14,
    overflow: 'hidden',
    padding: 18,
    borderRadius: 28,
  },
  heroCompact: { minHeight: 430, padding: 16 },
  heroShade: { backgroundColor: 'rgba(0,0,0,0.36)' },
  heroCopy: { marginTop: 28 },
  eyebrow: {
    color: '#D7F36A',
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  headline: {
    color: '#FFFFFF',
    fontFamily: fontFamily.display,
    fontSize: 48,
    letterSpacing: -0.8,
    lineHeight: 50,
    marginTop: 10,
    maxWidth: 330,
  },
  headlineCompact: {
    fontSize: 42,
    letterSpacing: -0.5,
    lineHeight: 44,
    maxWidth: 270,
  },
  heroActions: { gap: 9 },
  search: {
    minHeight: 56,
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  searchText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  tune: {
    width: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
  },
  filterRow: { gap: 8, paddingHorizontal: 16 },
  status: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    padding: 12,
  },
  statusText: { fontFamily: fontFamily.semibold, fontSize: 13 },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  sectionTitle: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    marginTop: 3,
  },
  cards: { gap: 10, paddingHorizontal: 14 },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 4,
    paddingVertical: 18,
  },
});
