import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CompactPlaceRow } from '@/components/ui/compact-place-row';
import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import { SemanticChip } from '@/components/ui/semantic-chip';
import { env } from '@/config/env';
import { useSearch } from '@/features/search/search-provider';
import { i18n } from '@/i18n';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

import {
  DISCOVERY_PLACES,
  HERO_SLIDE_INTERVAL_MS,
  HERO_SLIDES,
} from './discovery-data';

const brandMark = require('../../../assets/images/brand/makanmana-mark-tight.png');
const HERO_SWIPE_THRESHOLD = 36;

export function heroSlideOffsetForGesture(dx: number, dy: number): -1 | 0 | 1 {
  if (
    Math.abs(dx) < HERO_SWIPE_THRESHOLD ||
    Math.abs(dx) <= Math.abs(dy)
  ) {
    return 0;
  }
  return dx < 0 ? 1 : -1;
}

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
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const nearbyRequestInFlight = useRef(false);
  const isLiveDiscovery = env.EXPO_PUBLIC_DATA_MODE === 'live';
  const visiblePlaces =
    searchStatus === 'idle' && !isLiveDiscovery ? DISCOVERY_PLACES : results;
  const compact = width < 360 || fontScale > 1.25;
  const moveHeroSlide = useCallback((offset: -1 | 1) => {
    setActiveHeroSlide(
      (current) => (current + offset + HERO_SLIDES.length) % HERO_SLIDES.length,
    );
  }, []);

  const filters = useMemo(
    () => [
      {
        label: 'Halal',
        icon: 'shield-checkmark-outline' as const,
        color: colors.halal,
      },
      {
        label: 'Open now',
        icon: 'time-outline' as const,
        color: colors.success,
      },
      {
        label: 'Under RM20',
        icon: 'wallet-outline' as const,
        color: colors.price,
      },
      {
        label: 'Supper',
        icon: 'moon-outline' as const,
        color: colors.supper,
      },
    ],
    [colors],
  );
  const heroPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          const offset = heroSlideOffsetForGesture(gesture.dx, gesture.dy);
          if (offset) moveHeroSlide(offset);
        },
      }),
    [moveHeroSlide],
  );

  useEffect(() => {
    setOpenNowActive(criteria.openNow);
  }, [criteria.openNow]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      moveHeroSlide(1);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => clearTimeout(timeout);
  }, [activeHeroSlide, moveHeroSlide]);

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
      priceLevels: nextCategory === 'Under RM20' ? [1] : [],
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

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View
          {...heroPanResponder.panHandlers}
          style={[styles.hero, compact && styles.heroCompact]}
          testID="hero-carousel">
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="cover"
            contentPosition="center"
            recyclingKey={HERO_SLIDES[activeHeroSlide].label}
            source={HERO_SLIDES[activeHeroSlide].source}
            style={StyleSheet.absoluteFill}
            testID={`hero-slide-${activeHeroSlide}`}
            transition={350}
          />
          <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
          <View
            accessible
            accessibilityLabel={`Featured Malaysian food: ${HERO_SLIDES[activeHeroSlide].label}`}
            accessibilityLiveRegion="polite"
            accessibilityActions={[
              { name: 'increment', label: 'Next featured food' },
              { name: 'decrement', label: 'Previous featured food' },
            ]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'increment') {
                moveHeroSlide(1);
              }
              if (event.nativeEvent.actionName === 'decrement') {
                moveHeroSlide(-1);
              }
            }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />

          <View
            accessible
            accessibilityLabel="MakanMana"
            accessibilityRole="header"
            style={styles.brand}>
            <Image
              accessible={false}
              contentFit="contain"
              source={brandMark}
              style={styles.brandMark}
              testID="brand-mark"
            />
            <Text style={styles.brandName}>MakanMana</Text>
          </View>

          <Pressable
            accessibilityHint={i18n.t('homeSearchHint')}
            accessibilityLabel={i18n.t('homeSearchLabel')}
            accessibilityRole="button"
            onPress={() => router.push('/map')}
            style={styles.search}>
            <Ionicons color="#F7F7F3" name="search" size={21} />
            <Text style={styles.searchText}>
              {i18n.t('homeSearchPlaceholder')}
            </Text>
            <View style={styles.tune}>
              <Ionicons color="#F7F7F3" name="options-outline" size={19} />
            </View>
          </Pressable>

          <View pointerEvents="none" style={styles.heroDots}>
            {HERO_SLIDES.map((slide, index) => (
              <View
                key={slide.label}
                style={[
                  styles.heroDot,
                  index === activeHeroSlide && styles.heroDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.primaryActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleNearbyNow()}
            testID="nearby-now-button"
            style={({ pressed }) => [
              styles.primaryAction,
              {
                backgroundColor: colors.accent,
                opacity: pressed ? 0.78 : 1,
              },
            ]}>
            <View style={styles.actionIconDark}>
              <Ionicons color="#FFFFFF" name="navigate" size={21} />
            </View>
            <Text style={[styles.primaryActionText, { color: colors.accentText }]}>
              Find nearby
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleSurprise}
            testID="surprise-me-button"
            style={({ pressed }) => [
              styles.primaryAction,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <View
              style={[
                styles.actionIconLight,
                { backgroundColor: colors.surfaceElevated },
              ]}>
              <Ionicons color={colors.text} name="dice-outline" size={20} />
            </View>
            <Text style={[styles.primaryActionText, { color: colors.text }]}>
              Surprise me
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityHint="Opens a food-only assistant that matches nearby restaurants to your preferences"
          accessibilityLabel="Ask MakanMana for food ideas"
          accessibilityRole="button"
          onPress={() => router.push('/assistant')}
          style={({ pressed }) => [
            styles.assistantCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.76 : 1,
            },
          ]}>
          <View
            style={[
              styles.assistantIcon,
              { backgroundColor: `${colors.accent}24` },
            ]}>
            <Ionicons
              color={colors.accentForeground}
              name="sparkles"
              size={22}
            />
          </View>
          <View style={styles.assistantCopy}>
            <Text style={[styles.assistantTitle, { color: colors.text }]}>
              Ask MakanMana
            </Text>
            <Text style={[styles.assistantSubtitle, { color: colors.textMuted }]}>
              Tell me what you feel like eating
            </Text>
          </View>
          <Ionicons
            color={colors.accentForeground}
            name="chevron-forward"
            size={19}
          />
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
              onPress={() => handleFilter(filter.label)}
              selected={
                filter.label === 'Open now'
                  ? openNowActive
                  : selectedCategory === filter.label
              }
            />
          ))}
        </ScrollView>

        {notice ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: `${colors.accent}18` },
            ]}>
            <Ionicons
              color={colors.accentForeground}
              name="sparkles"
              size={17}
            />
            <Text style={[styles.noticeText, { color: colors.text }]}>
              {notice}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Nearby for you
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              {isLiveDiscovery
                ? 'Real places from Google, sorted by distance'
                : 'Preview mode · demo restaurants'}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="See all nearby restaurants"
            accessibilityRole="button"
            onPress={() => router.push('/map')}
            style={styles.seeAll}>
            <Text style={[styles.seeAllText, { color: colors.accentForeground }]}>
              See all
            </Text>
            <Ionicons
              color={colors.accentForeground}
              name="chevron-forward"
              size={16}
            />
          </Pressable>
        </View>

        <View style={styles.rows}>
          {searchStatus === 'empty' ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No places match these filters yet.
            </Text>
          ) : null}
          {searchStatus === 'error' ? (
            <Text
              accessibilityRole="alert"
              style={[styles.empty, { color: colors.warning }]}>
              {searchError ?? 'Unable to load nearby restaurants.'}
            </Text>
          ) : null}
          {visiblePlaces.slice(0, 5).map((place) => (
            <CompactPlaceRow
              image={
                DISCOVERY_PLACES.find((candidate) => candidate.id === place.id)
                  ?.image
              }
              key={place.id}
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: place.id },
                })
              }
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
  content: { gap: 14, paddingBottom: 28 },
  hero: {
    backgroundColor: '#080B09',
    height: 335,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 18,
  },
  heroCompact: { height: 350, paddingHorizontal: 14 },
  heroShade: { backgroundColor: 'rgba(0,0,0,0.16)' },
  heroDots: {
    alignSelf: 'center',
    bottom: 82,
    flexDirection: 'row',
    gap: 6,
    position: 'absolute',
  },
  heroDot: {
    backgroundColor: 'rgba(255,255,255,0.48)',
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  heroDotActive: { backgroundColor: '#C6FF00', width: 18 },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    marginTop: 2,
  },
  brandMark: { height: 52, width: 40 },
  brandName: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
    fontSize: 24,
    letterSpacing: -0.55,
  },
  search: {
    minHeight: 56,
    alignItems: 'center',
    backgroundColor: 'rgba(15,17,16,0.93)',
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
  },
  searchText: {
    color: '#D4D5D1',
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
  },
  tune: {
    width: 44,
    height: 44,
    alignItems: 'center',
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderLeftWidth: 1,
    justifyContent: 'center',
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  primaryAction: {
    minHeight: 70,
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 9,
    paddingRight: 13,
  },
  actionIconDark: {
    width: 44,
    height: 44,
    alignItems: 'center',
    backgroundColor: '#20231F',
    borderRadius: 12,
    justifyContent: 'center',
  },
  actionIconLight: {
    width: 44,
    height: 44,
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
  },
  primaryActionText: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  assistantCard: {
    minHeight: 72,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    padding: 12,
  },
  assistantIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
  },
  assistantCopy: { flex: 1 },
  assistantTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  assistantSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  filterRow: { gap: 8, paddingHorizontal: 16 },
  notice: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    padding: 10,
  },
  noticeText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 17,
    paddingTop: 3,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    letterSpacing: -0.25,
  },
  sectionSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  seeAll: { alignItems: 'center', flexDirection: 'row', gap: 2, minHeight: 44 },
  seeAllText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  rows: { gap: 8, paddingHorizontal: 14 },
  empty: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
});
