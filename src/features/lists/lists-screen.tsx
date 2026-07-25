import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import { CompactPlaceRow } from '@/components/ui/compact-place-row';
import type { SearchCriteria } from '@/contracts/search';
import { useSearch } from '@/features/search/search-provider';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

import { DISCOVERY_PLACES } from '@/features/home/discovery-data';

type Collection = {
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: 'supper' | 'price' | 'cafe' | 'halal';
  criteria: Partial<SearchCriteria>;
};

const COLLECTIONS: Collection[] = [
  {
    title: 'Open late',
    description: 'Supper spots serving now',
    icon: 'time-outline',
    color: 'supper',
    criteria: {
      categories: ['Supper'],
      openNow: true,
      priceLevels: [1, 2, 3, 4],
      query: undefined,
      verifiedHalalOnly: false,
    },
  },
  {
    title: 'Budget favourites',
    description: 'Strong picks under RM20',
    icon: 'pricetag-outline',
    color: 'price',
    criteria: {
      categories: [],
      openNow: false,
      priceLevels: [1],
      query: undefined,
      verifiedHalalOnly: false,
    },
  },
  {
    title: 'Cafes',
    description: 'Coffee, toast and easy catch-ups',
    icon: 'cafe-outline',
    color: 'cafe',
    criteria: {
      categories: ['Cafe'],
      openNow: false,
      priceLevels: [1, 2, 3, 4],
      query: undefined,
      verifiedHalalOnly: false,
    },
  },
  {
    title: 'Verified Halal',
    description: 'Only trusted, current verification',
    icon: 'shield-checkmark-outline',
    color: 'halal',
    criteria: {
      categories: [],
      openNow: false,
      priceLevels: [1, 2, 3, 4],
      query: undefined,
      verifiedHalalOnly: true,
    },
  },
];

export function ListsScreen() {
  const { colors } = useAppTheme();
  const { error, results, status, updateCriteriaAndSearch } = useSearch();
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const places = activeCollection
    ? results
    : results.length > 0
      ? results
      : DISCOVERY_PLACES;
  const isCollectionLoading =
    activeCollection !== null && status === 'loading';
  const collectionIsEmpty = activeCollection !== null && status === 'empty';
  const collectionHasError = activeCollection !== null && status === 'error';

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.accentForeground }]}>
            CHOOSE YOUR MOOD
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>Food lists</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            Tap a list to search it live around {places.length > 0 ? 'your area' : 'Klang Valley'}.
          </Text>
        </View>

        <View style={styles.collections}>
          {COLLECTIONS.map((collection) => {
            const tone = colors[collection.color];
            return (
              <Pressable
                accessibilityLabel={`Open ${collection.title} list`}
                accessibilityRole="button"
                accessibilityState={{
                  selected: activeCollection === collection.title,
                }}
                key={collection.title}
                onPress={() => {
                  setActiveCollection(collection.title);
                  void updateCriteriaAndSearch(collection.criteria);
                }}
                style={({ pressed }) => [
                  styles.collection,
                  {
                    backgroundColor: colors.surface,
                    borderColor:
                      activeCollection === collection.title
                        ? tone
                        : colors.border,
                    opacity: pressed ? 0.76 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.collectionIcon,
                    { backgroundColor: `${tone}20` },
                  ]}>
                  <Ionicons color={tone} name={collection.icon} size={22} />
                </View>
                <View style={styles.collectionCopy}>
                  <Text style={[styles.collectionTitle, { color: colors.text }]}>
                    {collection.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.collectionDescription,
                      { color: colors.textMuted },
                    ]}>
                    {collection.description}
                  </Text>
                </View>
                <Ionicons
                  color={colors.textMuted}
                  name="chevron-forward"
                  size={19}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.resultHeading}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {activeCollection ?? 'Ready to explore'}
          </Text>
          <Pressable
            accessibilityLabel="Open all map results"
            accessibilityRole="button"
            onPress={() => router.push('/map')}>
            <Text style={[styles.seeAll, { color: colors.accentForeground }]}>
              View map
            </Text>
          </Pressable>
        </View>

        {isCollectionLoading ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.stateCard, { borderColor: colors.border }]}>
            <Ionicons color={colors.accentForeground} name="search" size={22} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              Finding the best matches nearby…
            </Text>
          </View>
        ) : collectionHasError ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.stateCard, { borderColor: colors.border }]}>
            <Ionicons
              color={colors.supper}
              name="cloud-offline-outline"
              size={22}
            />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              Couldn’t load this list
            </Text>
            <Text style={[styles.stateBody, { color: colors.textMuted }]}>
              {error ?? 'Please try this collection again in a moment.'}
            </Text>
          </View>
        ) : collectionIsEmpty ? (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.stateCard, { borderColor: colors.border }]}>
            <Ionicons
              color={colors.textMuted}
              name="restaurant-outline"
              size={22}
            />
            <Text style={[styles.stateTitle, { color: colors.text }]}>
              No matches nearby yet
            </Text>
            <Text style={[styles.stateBody, { color: colors.textMuted }]}>
              Try another list or widen the search area on the map.
            </Text>
          </View>
        ) : (
          <View style={styles.rows}>
            {places.slice(0, 4).map((place) => (
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
        )}
        <GoogleMapsAttribution />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: 24, padding: 18, paddingBottom: 32 },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  collections: { gap: 9 },
  collection: {
    minHeight: 76,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  collectionIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    borderRadius: 13,
    justifyContent: 'center',
  },
  collectionCopy: { flex: 1, minWidth: 0 },
  collectionTitle: { fontFamily: fontFamily.semibold, fontSize: 15 },
  collectionDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    marginTop: 3,
  },
  resultHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultTitle: { fontFamily: fontFamily.semibold, fontSize: 18 },
  seeAll: { fontFamily: fontFamily.semibold, fontSize: 13 },
  rows: { gap: 9 },
  stateCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  stateTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    textAlign: 'center',
  },
  stateBody: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
