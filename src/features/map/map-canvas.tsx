import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Coordinates, PlaceSummary } from '@/contracts/place';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

export type MapCanvasProps = {
  center: Coordinates;
  places: PlaceSummary[];
  loading: boolean;
  onCenterChange: (center: Coordinates) => void;
  onSearchArea: () => void;
  onCurrentLocation: () => void;
  onPlacePress: (placeId: string) => void;
};

export function MapCanvas({
  center,
  places,
  loading,
  onSearchArea,
  onCurrentLocation,
  onPlacePress,
}: MapCanvasProps) {
  const { colors } = useAppTheme();

  return (
    <View
      accessibilityLabel="Map fallback"
      style={[
        styles.fallback,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
      ]}>
      <Text style={[styles.fallbackTitle, { color: colors.text }]}>
        Map preview
      </Text>
      <Text style={{ color: colors.textMuted }}>
        Interactive maps are unavailable here. Results are centred near{' '}
        {center.latitude.toFixed(3)}, {center.longitude.toFixed(3)}.
      </Text>
      <View style={styles.pinRow}>
        {places.slice(0, 8).map((place, index) => (
          <TouchableOpacity
            key={place.id}
            accessibilityLabel={`${place.name} map pin`}
            accessibilityRole="button"
            onPress={() => onPlacePress(place.id)}
            style={[
              styles.pin,
              {
                backgroundColor:
                  index % 3 === 0
                    ? colors.supper
                    : index % 3 === 1
                      ? colors.cafe
                      : colors.halal,
              },
            ]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{index + 1}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading}
          onPress={onCurrentLocation}
          style={[styles.button, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text }}>Use my location</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={loading}
          onPress={onSearchArea}
          style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={{ color: colors.accentText, fontWeight: '700' }}>
            Search this area
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    minHeight: 260,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fallbackTitle: { fontSize: 20, fontWeight: '800', marginBottom: spacing.sm },
  pinRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  pin: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  button: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
});
