import { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import type { PlaceSummary } from '@/contracts/place';
import type { MapCanvasProps } from '@/features/map/map-canvas';
import { hasTrustedHalalVerification } from '@/services/places/mock-places-service';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const LATITUDE_DELTA = 0.075;

function pinColor(place: PlaceSummary, colors: ReturnType<typeof useAppTheme>['colors']) {
  if (hasTrustedHalalVerification(place.halalVerification)) return colors.halal;
  if (place.categories.some((category) => category.toLowerCase() === 'cafe')) {
    return colors.cafe;
  }
  return colors.supper;
}

export function MapCanvas({
  center,
  places,
  loading,
  onCenterChange,
  onSearchArea,
  onCurrentLocation,
}: MapCanvasProps) {
  const { colors } = useAppTheme();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        ...center,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LATITUDE_DELTA,
      },
      350,
    );
  }, [center]);

  const handleRegionChange = (region: Region) => {
    onCenterChange({
      latitude: region.latitude,
      longitude: region.longitude,
    });
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <MapView
        ref={mapRef}
        accessibilityLabel="Restaurant results map"
        initialRegion={{
          ...center,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LATITUDE_DELTA,
        }}
        onRegionChangeComplete={handleRegionChange}
        showsCompass
        showsMyLocationButton={false}
        showsUserLocation
        style={StyleSheet.absoluteFill}>
        {places.map((place) => (
          <Marker
            key={place.id}
            accessibilityLabel={`${place.name}, ${Math.round(place.distanceMeters)} metres away`}
            coordinate={place.coordinates}
            description={place.subtitle}
            pinColor={pinColor(place, colors)}
            title={place.name}
          />
        ))}
      </MapView>
      <TouchableOpacity
        accessibilityLabel="Use my current location"
        accessibilityRole="button"
        disabled={loading}
        onPress={onCurrentLocation}
        style={[
          styles.locationButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <Text style={{ color: colors.text, fontSize: 18 }}>◎</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        disabled={loading}
        onPress={onSearchArea}
        style={[styles.searchButton, { backgroundColor: colors.accent }]}>
        <Text style={{ color: colors.accentText, fontWeight: '800' }}>
          {loading ? 'Searching…' : 'Search this area'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 330,
    overflow: 'hidden',
  },
  locationButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 44,
  },
  searchButton: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    bottom: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    position: 'absolute',
  },
});
