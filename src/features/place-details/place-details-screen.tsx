import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { IconButton } from '@/components/ui/icon-button';
import { SemanticChip } from '@/components/ui/semantic-chip';
import {
  DISCOVERY_PLACES,
  formatDistance,
  formatPrice,
  formatReviews,
} from '@/features/home/discovery-data';
import { useAppTheme } from '@/theme/theme-provider';

const CATEGORY_ICONS = [
  'fast-food-outline',
  'restaurant-outline',
  'people-outline',
] as const;

export function PlaceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const place =
    DISCOVERY_PLACES.find((candidate) => candidate.id === id) ??
    DISCOVERY_PLACES[0];

  async function sharePlace() {
    await Share.share({
      message: `${place.name} — ${place.subtitle}. ${place.address}`,
      title: place.name,
    });
  }

  function openDirections() {
    const query = encodeURIComponent(`${place.name}, ${place.address}`);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 118 + insets.bottom }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            accessibilityLabel={`${place.name} signature dish`}
            contentFit="cover"
            source={place.image}
            style={StyleSheet.absoluteFill}
            transition={180}
          />
          <View style={[StyleSheet.absoluteFill, styles.heroShade]} />
          <View style={styles.heroCopy}>
            <Text style={styles.name}>{place.name}</Text>
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
              <Text style={styles.heroPrice}>{formatPrice(place.priceLevel)}</Text>
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
              <Ionicons color={colors.success} name="time-outline" size={19} />
              <Text style={[styles.open, { color: colors.success }]}>Open now</Text>
              <Text style={[styles.openingNote, { color: colors.textMuted }]}>
                • {place.openingNote}
              </Text>
            </View>
            <Text style={[styles.hoursLink, { color: colors.accent }]}>
              See all hours
            </Text>
          </View>

          <View style={styles.chips}>
            {place.categories.map((category, index) => (
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
                  { backgroundColor: colors.surface, borderColor: colors.border },
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

          <View
            style={[
              styles.addressCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <View style={[styles.addressIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons color={colors.accent} name="location" size={22} />
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
            onPress={() => setSaved((current) => !current)}
            testID="save-place-button"
          />
          <IconButton
            accessibilityLabel="Share place"
            backgroundColor="rgba(8,10,9,0.82)"
            color="#FFFFFF"
            icon="share-outline"
            onPress={() => void sharePlace()}
          />
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.navBackground,
            borderColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        <Pressable
          accessibilityLabel={`Distance ${formatDistance(place.distanceMeters)}`}
          accessibilityRole="button"
          onPress={openDirections}
          style={[
            styles.distanceButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <Ionicons color={colors.text} name="navigate-outline" size={20} />
          <Text style={[styles.distanceText, { color: colors.text }]}>
            {formatDistance(place.distanceMeters)}
          </Text>
        </Pressable>
        <View style={styles.directionAction}>
          <ActionButton
            backgroundColor={colors.accent}
            color={colors.accentText}
            icon="arrow-forward"
            label="Directions"
            onPress={openDirections}
            testID="directions-button"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: 390, justifyContent: 'flex-end' },
  heroShade: { backgroundColor: 'rgba(0,0,0,0.28)' },
  heroCopy: { padding: 20, paddingBottom: 24 },
  name: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.4,
    lineHeight: 41,
  },
  subtitle: { color: '#D7DAD5', fontSize: 19, fontWeight: '600', marginTop: 4 },
  heroMeta: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 14 },
  heroMetaItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  heroRating: { color: '#C6FF00', fontSize: 16, fontWeight: '900' },
  heroMuted: { color: '#E0E2DE', fontSize: 14, fontWeight: '600' },
  heroPrice: { color: '#C6FF00', fontSize: 15, fontWeight: '900' },
  body: { gap: 22, padding: 16 },
  openRow: {
    minHeight: 54,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  openLabel: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  open: { fontSize: 14, fontWeight: '900' },
  openingNote: { fontSize: 13, fontWeight: '600' },
  hoursLink: { fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  description: { fontSize: 16, lineHeight: 25 },
  sectionTitleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 23, fontWeight: '900', letterSpacing: -0.5 },
  sectionNote: { fontSize: 13, marginTop: 3 },
  picks: { gap: 10, paddingRight: 16 },
  pickCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    width: 156,
  },
  pickImage: { height: 112, width: '100%' },
  pickName: { fontSize: 14, fontWeight: '800', padding: 12 },
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
  addressLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  address: { fontSize: 15, fontWeight: '700', lineHeight: 21, marginTop: 3 },
  topActions: {
    left: 16,
    right: 16,
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topActionsRight: { flexDirection: 'row', gap: 8 },
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
  distanceButton: {
    minHeight: 52,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  distanceText: { fontSize: 15, fontWeight: '800' },
  directionAction: { flex: 1 },
});
