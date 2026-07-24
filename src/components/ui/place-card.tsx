import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlaceSummary } from '@/contracts/place';
import {
  formatDistance,
  formatPrice,
} from '@/features/home/discovery-data';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

type PlaceCardProps = {
  place: PlaceSummary;
  image?: ImageSource;
  onPress: () => void;
};

export function PlaceCard({ place, image, onPress }: PlaceCardProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityHint="Opens restaurant details"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}>
      {place.photoUrl || image ? (
        <Image
          accessibilityLabel={`${place.name} food`}
          contentFit="cover"
          source={place.photoUrl ? { uri: place.photoUrl } : image}
          style={styles.image}
          transition={180}
        />
      ) : (
        <View
          accessibilityLabel={`${place.name} has no photo`}
          style={[styles.image, styles.noPhoto, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons color={colors.textMuted} name="restaurant-outline" size={34} />
          <Text style={[styles.noPhotoText, { color: colors.textMuted }]}>
            No photo
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
              {place.name}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.subtitle, { color: colors.textMuted }]}>
              {place.subtitle}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons color={colors.accentForeground} name="star" size={15} />
            <Text style={[styles.metaStrong, { color: colors.text }]}>
              {place.rating.toFixed(1)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons color={colors.textMuted} name="navigate-outline" size={15} />
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {formatDistance(place.distanceMeters)}
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.price }]}>
            {formatPrice(place.priceLevel)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 132,
    overflow: 'hidden',
  },
  image: { width: 132, minHeight: 132 },
  noPhoto: { alignItems: 'center', gap: 6, justifyContent: 'center' },
  noPhotoText: { fontFamily: fontFamily.semibold, fontSize: 12 },
  body: { flex: 1, justifyContent: 'center', padding: 14 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  titleBlock: { flex: 1 },
  title: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 22 },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginTop: 14 },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  metaStrong: { fontFamily: fontFamily.semibold, fontSize: 13 },
  meta: { fontFamily: fontFamily.medium, fontSize: 13 },
  price: { fontFamily: fontFamily.semibold, fontSize: 13 },
});
