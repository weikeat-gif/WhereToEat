import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import type { Coordinates, PriceLevel } from '@/contracts/place';
import type { AreaSuggestion } from '@/contracts/search';
import { MapCanvas } from '@/features/map/map-canvas';
import { useSearch } from '@/features/search/search-provider';
import { hasTrustedHalalVerification } from '@/services/places/mock-places-service';
import { useAppTheme } from '@/theme/theme-provider';
import { radius, spacing } from '@/theme/tokens';

const CATEGORIES = ['Malaysian', 'Cafe', 'Chinese', 'Indian'];
const PRICES: PriceLevel[] = [1, 2, 3, 4];
const RADII = [1000, 3000, 5000, 10_000];

export function MapScreen() {
  const { colors } = useAppTheme();
  const {
    autocompleteArea,
    criteria,
    error,
    locationCanAskAgain,
    locationMessage,
    locationStatus,
    results,
    search,
    searchCurrentLocation,
    selectArea,
    status,
    surprise,
    surpriseMe,
    updateCriteriaAndSearch,
  } = useSearch();
  const [mapCenter, setMapCenter] = useState<Coordinates>(criteria.center);
  const [areaInput, setAreaInput] = useState(criteria.areaLabel);
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const handleCurrentLocation = async () => {
    setSettingsError(null);
    if (locationCanAskAgain !== false) {
      await searchCurrentLocation();
      return;
    }
    try {
      await Linking.openSettings();
    } catch {
      setSettingsError(
        'Unable to open app settings. Open Settings on your phone and allow Location for MakanMana.',
      );
    }
  };

  useEffect(() => {
    setMapCenter(criteria.center);
    setAreaInput(criteria.areaLabel);
  }, [criteria.areaLabel, criteria.center]);

  useEffect(() => {
    let active = true;
    if (areaInput.trim().length < 2 || areaInput === criteria.areaLabel) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      void autocompleteArea(areaInput)
        .then((areas) => {
          if (active) setSuggestions(areas);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [areaInput, autocompleteArea, criteria.areaLabel]);

  const togglePrice = (price: PriceLevel) => {
    const priceLevels = criteria.priceLevels.includes(price)
      ? criteria.priceLevels.filter((item) => item !== price)
      : [...criteria.priceLevels, price];
    void updateCriteriaAndSearch({ priceLevels });
  };

  const toggleCategory = (category: string) => {
    const categories = criteria.categories.includes(category)
      ? criteria.categories.filter((item) => item !== category)
      : [...criteria.categories, category];
    void updateCriteriaAndSearch({ categories });
  };

  const cycleRadius = () => {
    const currentIndex = RADII.indexOf(criteria.radiusMeters);
    const radiusMeters = RADII[(currentIndex + 1) % RADII.length];
    void updateCriteriaAndSearch({ radiusMeters });
  };

  const chooseArea = (area: AreaSuggestion) => {
    setSuggestions([]);
    setAreaInput(area.label);
    void selectArea(area);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Explore the map</Text>
        <Text style={{ color: colors.textMuted }}>
          Move the map, tune your filters, then search the visible area.
        </Text>

        <View style={styles.areaRow}>
          <TextInput
            accessibilityLabel="Search area"
            onChangeText={setAreaInput}
            placeholder="Search Klang, PJ, Subang…"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.areaInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={areaInput}
          />
          <TouchableOpacity
            accessibilityLabel={
              locationCanAskAgain === false
                ? 'Open app settings for location'
                : 'Use my current location'
            }
            accessibilityRole="button"
            onPress={() => void handleCurrentLocation()}
            style={[styles.iconButton, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.text }}>◎</Text>
          </TouchableOpacity>
        </View>
        {suggestions.map((area) => (
          <TouchableOpacity
            key={area.id}
            accessibilityRole="button"
            onPress={() => chooseArea(area)}
            style={[styles.suggestion, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text }}>{area.label}</Text>
            <Text style={{ color: colors.textMuted }}>{area.secondaryLabel}</Text>
          </TouchableOpacity>
        ))}
        {locationMessage ? (
          <Text accessibilityRole="alert" style={{ color: colors.warning }}>
            {locationMessage}
          </Text>
        ) : null}
        {settingsError ? (
          <Text accessibilityRole="alert" style={{ color: colors.warning }}>
            {settingsError}
          </Text>
        ) : null}

        <View
          style={[
            styles.gpsCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}>
          <View style={styles.gpsCopy}>
            <Text style={[styles.gpsTitle, { color: colors.text }]}>
              {locationStatus === 'granted'
                ? 'GPS location active'
                : 'Find food from your GPS'}
            </Text>
            <Text style={{ color: colors.textMuted }}>
              {locationStatus === 'granted'
                ? 'The map and nearby results are centred on your current location.'
                : 'Your precise foreground location is sent through our Supabase service to Google Maps for nearby results. We do not store precise GPS.'}
            </Text>
            {locationStatus !== 'granted' ? (
              <View style={styles.gpsLegal}>
                <TouchableOpacity
                  accessibilityRole="link"
                  onPress={() => router.push('/privacy')}>
                  <Text
                    style={{
                      color: colors.accentForeground,
                      fontSize: 12,
                      fontWeight: '800',
                    }}>
                    Privacy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="link"
                  onPress={() => router.push('/terms')}>
                  <Text
                    style={{
                      color: colors.accentForeground,
                      fontSize: 12,
                      fontWeight: '800',
                    }}>
                    Terms
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            accessibilityLabel={
              locationCanAskAgain === false
                ? 'Open app settings for location'
                : 'Find food near me'
            }
            accessibilityRole="button"
            disabled={locationStatus === 'requesting'}
            onPress={() => void handleCurrentLocation()}
            style={[styles.gpsButton, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.accentText, fontWeight: '900' }}>
              {locationStatus === 'requesting'
                ? 'Locating…'
                : locationCanAskAgain === false
                  ? 'Open Settings'
                : locationStatus === 'granted'
                  ? 'Refresh GPS'
                  : 'Use GPS'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={styles.filters}
          showsHorizontalScrollIndicator={false}>
          <FilterChip
            active={criteria.openNow}
            label="Open now"
            onPress={() =>
              void updateCriteriaAndSearch({ openNow: !criteria.openNow })
            }
          />
          <FilterChip
            active={criteria.verifiedHalalOnly}
            label="Verified Halal"
            onPress={() =>
              void updateCriteriaAndSearch({
                verifiedHalalOnly: !criteria.verifiedHalalOnly,
              })
            }
          />
          <FilterChip
            active
            label={`${criteria.radiusMeters / 1000} km`}
            onPress={cycleRadius}
          />
          {PRICES.map((price) => (
            <FilterChip
              key={price}
              active={criteria.priceLevels.includes(price)}
              label={'$'.repeat(price)}
              onPress={() => togglePrice(price)}
            />
          ))}
          {CATEGORIES.map((category) => (
            <FilterChip
              key={category}
              active={criteria.categories.includes(category)}
              label={category}
              onPress={() => toggleCategory(category)}
            />
          ))}
        </ScrollView>

        <MapCanvas
          center={mapCenter}
          loading={status === 'loading'}
          onCenterChange={setMapCenter}
          onCurrentLocation={() => void handleCurrentLocation()}
          onPlacePress={(placeId) =>
            router.push({ pathname: '/place/[id]', params: { id: placeId } })
          }
          onSearchArea={() =>
            void search({
              ...criteria,
              center: mapCenter,
              areaLabel: 'Map area',
            })
          }
          places={results}
          showsUserLocation={locationStatus === 'granted'}
        />

        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {results.length} {results.length === 1 ? 'place' : 'places'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={results.length === 0}
            onPress={surpriseMe}
            style={[styles.surpriseButton, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.accentText, fontWeight: '800' }}>
              {surprise ? 'Try another' : 'Surprise me'}
            </Text>
          </TouchableOpacity>
        </View>

        {status === 'loading' ? (
          <ActivityIndicator
            accessibilityLabel="Loading places"
            color={colors.accentForeground}
          />
        ) : null}
        {status === 'error' ? (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={{ color: colors.warning }}>
              {error ?? 'Unable to load places.'}
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => void search()}>
              <Text style={{ color: colors.text }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {status === 'empty' ? (
          <Text style={[styles.state, { color: colors.textMuted }]}>
            No places match these filters. Expand the radius or clear a filter.
          </Text>
        ) : null}
        {surprise ? (
          <View
            accessibilityLabel="Surprise selection"
            style={[styles.surpriseCard, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.cardName, { color: colors.text }]}>{surprise.name}</Text>
            <Text style={{ color: colors.textMuted }}>{surprise.subtitle}</Text>
          </View>
        ) : null}

        <FlatList
          data={results}
          horizontal
          keyExtractor={(place) => place.id}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              accessibilityLabel={`${index + 1}. ${item.name}`}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: item.id },
                })
              }
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={{ color: colors.textMuted }} numberOfLines={1}>
                {item.subtitle}
              </Text>
              <Text style={{ color: colors.text }}>
                ★ {item.rating.toFixed(1)} · {(item.distanceMeters / 1000).toFixed(1)} km
              </Text>
              {hasTrustedHalalVerification(item.halalVerification) ? (
                <Text style={{ color: colors.halal }}>Verified Halal</Text>
              ) : null}
            </TouchableOpacity>
          )}
          scrollEnabled={results.length > 0}
          showsHorizontalScrollIndicator={false}
        />
        <GoogleMapsAttribution />
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.accent : colors.surface,
          borderColor: active ? colors.accent : colors.border,
        },
      ]}>
      <Text style={{ color: active ? colors.accentText : colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 30, fontWeight: '900' },
  areaRow: { flexDirection: 'row', gap: spacing.sm },
  areaInput: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    width: 48,
  },
  suggestion: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  gpsCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  gpsCopy: { flex: 1, gap: spacing.xs },
  gpsLegal: { flexDirection: 'row', gap: spacing.md },
  gpsTitle: { fontSize: 16, fontWeight: '900' },
  gpsButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filters: { gap: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultTitle: { fontSize: 20, fontWeight: '800' },
  surpriseButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  state: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  surpriseCard: { borderRadius: radius.md, padding: spacing.lg },
  resultCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    marginRight: spacing.md,
    padding: spacing.lg,
    width: 255,
  },
  cardName: { fontSize: 17, fontWeight: '800' },
});
