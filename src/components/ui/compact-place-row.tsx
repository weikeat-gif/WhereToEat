import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlaceSummary } from '@/contracts/place';
import {
  demoImageForPlace,
  formatDistance,
  formatPrice,
} from '@/features/home/discovery-data';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily } from '@/theme/tokens';

type CompactPlaceRowProps = {
  place: PlaceSummary;
  image?: ImageSource;
  onPress: () => void;
  trailing?: 'bookmark' | 'rating';
};

export function CompactPlaceRow({
  place,
  image,
  onPress,
  trailing = 'rating',
}: CompactPlaceRowProps) {
  const { colors } = useAppTheme();
  const imageSource = place.photoUrl
    ? { uri: place.photoUrl }
    : (image ?? demoImageForPlace(place.id, place.categories));
  const isSupper = place.categories.some((category) =>
    category.toLowerCase().includes('supper'),
  );

  return (
    <Pressable
      accessibilityHint="Opens restaurant details"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      {imageSource ? (
        <Image
          accessibilityLabel={`${place.name} food`}
          contentFit="cover"
          source={imageSource}
          style={styles.image}
          transition={140}
        />
      ) : (
        <View
          accessibilityLabel={`${place.name} has no photo`}
          style={[
            styles.image,
            styles.placeholder,
            { backgroundColor: colors.surfaceElevated },
          ]}>
          <Ionicons
            color={colors.textMuted}
            name="restaurant-outline"
            size={26}
          />
        </View>
      )}
      <View style={styles.body}>
        <Text
          maxFontSizeMultiplier={1.25}
          numberOfLines={1}
          style={[styles.name, { color: colors.text }]}>
          {place.name}
        </Text>
        <Text
          maxFontSizeMultiplier={1.25}
          numberOfLines={1}
          style={[styles.meta, { color: colors.textMuted }]}>
          {place.subtitle} · {formatDistance(place.distanceMeters)}
        </Text>
        <View style={styles.labelRow}>
          {place.promotion ? (
            <View style={styles.label}>
              <Ionicons color={colors.supper} name="megaphone" size={12} />
              <Text style={[styles.labelText, { color: colors.supper }]}>
                Sponsored
              </Text>
            </View>
          ) : null}
          <View style={styles.label}>
            <View
              style={[
                styles.labelDot,
                { backgroundColor: isSupper ? colors.supper : colors.price },
              ]}
            />
            <Text
              style={[
                styles.labelText,
                { color: isSupper ? colors.supper : colors.price },
              ]}>
              {isSupper ? 'SUPPER' : formatPrice(place.priceLevel)}
            </Text>
          </View>
        </View>
      </View>
      {trailing === 'bookmark' ? (
        <Ionicons
          color={colors.accentForeground}
          name="bookmark"
          size={22}
        />
      ) : (
        <View
          style={[
            styles.rating,
            { backgroundColor: colors.surfaceElevated },
          ]}>
          <Ionicons color={colors.accentForeground} name="star" size={13} />
          <Text style={[styles.ratingText, { color: colors.text }]}>
            {place.rating.toFixed(1)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 96,
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
    paddingRight: 12,
  },
  image: { alignSelf: 'stretch', width: 104 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, paddingVertical: 11 },
  name: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 20 },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  labelRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  label: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  labelDot: { borderRadius: 3, height: 6, width: 6 },
  labelText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.35,
  },
  rating: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  ratingText: { fontFamily: fontFamily.semibold, fontSize: 12 },
});
