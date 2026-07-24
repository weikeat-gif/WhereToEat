import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { DISCOVERY_PLACES, heroImage } from './discovery-data';

const COPY = {
  area: 'Klang Valley',
  eyebrow: 'Tonight in your city',
  headline: 'Jom cari makan.',
  searchPlaceholder: 'Search places, cuisines, dishes',
  trending: 'Trending near you',
};

export function HomeScreen() {
  const { colors } = useAppTheme();
  const {
    criteria,
    error: searchError,
    results,
    search,
    status: searchStatus,
    surpriseMe,
  } = useSearch();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [openNowActive, setOpenNowActive] = useState(criteria.openNow);
  const [notice, setNotice] = useState<string | null>(null);
  const visiblePlaces = searchStatus === 'idle' ? DISCOVERY_PLACES : results;

  const compact = width < 360;
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
      setNotice('Search nearby first, then try Surprise me.');
      return;
    }
    router.push({ pathname: '/place/[id]', params: { id: picked.id } });
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
          <View>
            <Text style={[styles.brand, { color: colors.accentForeground }]}>
              {i18n.t('appName')}?
            </Text>
            <Text style={[styles.brandNote, { color: colors.textMuted }]}>
              Food worth leaving home for
            </Text>
          </View>
          <Pressable
            accessibilityLabel={`Location: ${COPY.area}`}
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
                {COPY.area}
              </Text>
            )}
            <Ionicons color={colors.textMuted} name="chevron-down" size={15} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Image
            accessibilityLabel="Kuala Lumpur night market"
            contentFit="cover"
            source={heroImage}
            style={StyleSheet.absoluteFill}
            transition={220}
          />
          <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{COPY.eyebrow}</Text>
            <Text style={styles.headline}>{COPY.headline}</Text>
          </View>
          <View style={styles.heroActions}>
            <ActionButton
              backgroundColor={colors.accent}
              color={colors.accentText}
              icon="navigate"
              label={i18n.t('nearbyNow')}
              onPress={() => void applyDiscovery()}
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
          accessibilityHint="Finds open food near your current area"
          accessibilityRole="search"
          onPress={() => void applyDiscovery()}
          style={[
            styles.search,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Ionicons color={colors.textMuted} name="search" size={21} />
          <Text style={[styles.searchText, { color: colors.textMuted }]}>
            {COPY.searchPlaceholder}
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
              {COPY.trending}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              Open late, loved locally
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
  brand: { fontSize: 25, fontWeight: '900', letterSpacing: -1 },
  brandNote: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  location: {
    minHeight: 44,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  locationText: { fontSize: 13, fontWeight: '700' },
  hero: {
    height: 398,
    justifyContent: 'space-between',
    marginHorizontal: 14,
    overflow: 'hidden',
    padding: 18,
    borderRadius: 28,
  },
  heroShade: { backgroundColor: 'rgba(0,0,0,0.36)' },
  heroCopy: { marginTop: 34 },
  eyebrow: {
    color: '#C6FF00',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2.4,
    lineHeight: 54,
    marginTop: 8,
    maxWidth: 280,
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
  },
  searchText: { flex: 1, fontSize: 14, fontWeight: '600' },
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
  statusText: { fontSize: 13, fontWeight: '700' },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  sectionTitle: { fontSize: 23, fontWeight: '900', letterSpacing: -0.6 },
  sectionSubtitle: { fontSize: 13, marginTop: 3 },
  cards: { gap: 10, paddingHorizontal: 14 },
  empty: { fontSize: 15, lineHeight: 22, paddingHorizontal: 4, paddingVertical: 18 },
});
