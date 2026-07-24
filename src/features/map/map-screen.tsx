import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapsAttribution } from '@/components/google-maps-attribution';
import { PlaceCard } from '@/components/ui/place-card';
import type { Coordinates, PriceLevel } from '@/contracts/place';
import type { AreaSuggestion } from '@/contracts/search';
import { MapCanvas } from '@/features/map/map-canvas';
import { useSearch } from '@/features/search/search-provider';
import { i18n } from '@/i18n';
import { useAppTheme } from '@/theme/theme-provider';
import { fontFamily, radius, spacing } from '@/theme/tokens';

const CATEGORIES = [
  { value: 'Malaysian', labelKey: 'mapCategoryMalaysian' },
  { value: 'Cafe', labelKey: 'mapCategoryCafe' },
  { value: 'Chinese', labelKey: 'mapCategoryChinese' },
  { value: 'Indian', labelKey: 'mapCategoryIndian' },
] as const;
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
  const [queryInput, setQueryInput] = useState(criteria.query ?? '');
  const [areaInput, setAreaInput] = useState(criteria.areaLabel);
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [mapFocused, setMapFocused] = useState(false);
  const nearbyDockPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 8,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy < -18) setMapFocused(false);
        },
      }),
    [],
  );

  const openPlace = (placeId: string) => {
    router.push({ pathname: '/place/[id]', params: { id: placeId } });
  };

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
        i18n.t('mapSettingsError'),
      );
    }
  };

  useEffect(() => {
    setMapCenter(criteria.center);
    setAreaInput(criteria.areaLabel);
  }, [criteria.areaLabel, criteria.center]);

  useEffect(() => {
    setQueryInput(criteria.query ?? '');
  }, [criteria.query]);

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

  const submitQuery = () => {
    void updateCriteriaAndSearch({ query: queryInput.trim() });
  };

  const togglePrice = (price: PriceLevel) => {
    const priceLevels = criteria.priceLevels.includes(price)
      ? criteria.priceLevels.filter((item) => item !== price)
      : [...criteria.priceLevels, price];
    void updateCriteriaAndSearch({ priceLevels });
  };

  const toggleCategory = (category: string) => {
    const categories = criteria.categories.includes(category) ? [] : [category];
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

  const searchMapArea = () =>
    search({
      ...criteria,
      center: mapCenter,
      areaLabel: i18n.t('mapAreaLabel'),
    });

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.resultHeader}>
        <View style={styles.resultCopy}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {i18n.t('mapResultsTitle')}
          </Text>
          <Text style={{ color: colors.textMuted }}>
            {i18n.t('mapResultCount', {
              count: results.length,
              spotLabel:
                results.length === 1 ? i18n.t('mapSpot') : i18n.t('mapSpots'),
              area: criteria.areaLabel,
            })}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel={i18n.t('mapSurpriseAccessibility')}
          accessibilityRole="button"
          disabled={results.length === 0}
          hitSlop={4}
          onPress={surpriseMe}
          style={[styles.surpriseButton, { backgroundColor: colors.accent }]}>
          <Text style={{ color: colors.accentText, fontFamily: fontFamily.semibold }}>
            {surprise ? i18n.t('mapTryAnother') : i18n.t('mapSurprise')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.filters}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}>
        <FilterChip
          active={criteria.openNow}
          label={i18n.t('mapFilterOpenNow')}
          onPress={() =>
            void updateCriteriaAndSearch({ openNow: !criteria.openNow })
          }
        />
        <FilterChip
          active={criteria.verifiedHalalOnly}
          label={i18n.t('mapFilterVerifiedHalal')}
          onPress={() =>
            void updateCriteriaAndSearch({
              verifiedHalalOnly: !criteria.verifiedHalalOnly,
            })
          }
        />
        <FilterChip
          active
          label={i18n.t('mapRadius', {
            distance: criteria.radiusMeters / 1000,
          })}
          onPress={cycleRadius}
        />
        {PRICES.map((price) => (
          <FilterChip
            key={price}
            active={criteria.priceLevels.includes(price)}
            label={Array.from({ length: price }, () => 'RM').join(' ')}
            onPress={() => togglePrice(price)}
          />
        ))}
        {CATEGORIES.map((category) => (
          <FilterChip
            key={category.value}
            active={criteria.categories.includes(category.value)}
            label={i18n.t(category.labelKey)}
            onPress={() => toggleCategory(category.value)}
          />
        ))}
      </ScrollView>

      {locationStatus === 'granted' ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.halal }}>
          {i18n.t('mapGpsReady')}
        </Text>
      ) : null}
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

      {status === 'loading' ? (
        <ActivityIndicator
          accessibilityLabel={i18n.t('mapLoadingAccessibility')}
          color={colors.accentForeground}
        />
      ) : null}
      {status === 'error' ? (
        <View style={styles.state}>
          <Text accessibilityRole="alert" style={{ color: colors.warning }}>
            {error ?? i18n.t('mapLoadError')}
          </Text>
          <TouchableOpacity
            accessibilityLabel={i18n.t('mapTryAgainAccessibility')}
            accessibilityRole="button"
            onPress={() => void search()}
            style={styles.recoveryButton}>
            <Text style={{ color: colors.text }}>{i18n.t('mapTryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {status === 'empty' ? (
        <Text style={[styles.state, { color: colors.textMuted }]}>
          {i18n.t('mapEmpty')}
        </Text>
      ) : null}
      {surprise ? (
        <TouchableOpacity
          accessibilityLabel={i18n.t('mapOpenSurpriseAccessibility', {
            name: surprise.name,
          })}
          accessibilityRole="button"
          onPress={() => openPlace(surprise.id)}
          style={[
            styles.surpriseCard,
            { backgroundColor: colors.surfaceElevated },
          ]}>
          <Text style={[styles.cardName, { color: colors.text }]}>
            {i18n.t('mapTodayPick', { name: surprise.name })}
          </Text>
          <Text style={{ color: colors.textMuted }}>{surprise.subtitle}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View testID="map-pane" style={styles.mapPane}>
        <MapCanvas
          center={mapCenter}
          onCenterChange={setMapCenter}
          onMapPress={() => setMapFocused(true)}
          onPlacePress={openPlace}
          places={results}
          showsUserLocation={locationStatus === 'granted'}
        />

        <TouchableOpacity
          accessibilityLabel={i18n.t('mapSearchAreaAccessibility')}
          accessibilityRole="button"
          disabled={status === 'loading'}
          onPress={() => void searchMapArea()}
          style={[
            styles.searchAreaButton,
            mapFocused
              ? styles.searchAreaButtonFocused
              : styles.searchAreaButtonExpanded,
            {
              backgroundColor: colors.accent,
              opacity: status === 'loading' ? 0.64 : 1,
            },
          ]}
          testID="search-area-button">
          <Text
            style={{
              color: colors.accentText,
              fontFamily: fontFamily.semibold,
            }}>
            {status === 'loading'
              ? i18n.t('mapSearching')
              : i18n.t('mapSearchArea')}
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.searchOverlay,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <View style={styles.queryRow}>
            <TextInput
              accessibilityLabel={i18n.t('mapQueryAccessibility')}
              maxLength={120}
              onChangeText={setQueryInput}
              onSubmitEditing={submitQuery}
              placeholder={i18n.t('mapQueryPlaceholder')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={[styles.queryInput, { color: colors.text }]}
              value={queryInput}
            />
            <TouchableOpacity
              accessibilityLabel={i18n.t('mapQuerySubmitAccessibility')}
              accessibilityRole="button"
              disabled={status === 'loading'}
              onPress={submitQuery}
              style={[styles.submitButton, { backgroundColor: colors.accent }]}>
              <Text style={{ color: colors.accentText, fontFamily: fontFamily.semibold }}>
                {i18n.t('mapQuerySubmit')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.areaRow}>
            <TextInput
              accessibilityLabel={i18n.t('mapAreaAccessibility')}
              onChangeText={setAreaInput}
              placeholder={i18n.t('mapAreaPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.areaInput,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={areaInput}
            />
            <TouchableOpacity
              accessibilityLabel={
                locationCanAskAgain === false
                  ? i18n.t('mapOpenLocationSettings')
                  : i18n.t('mapUseCurrentLocation')
              }
              accessibilityRole="button"
              disabled={locationStatus === 'requesting'}
              onPress={() => void handleCurrentLocation()}
              style={[
                styles.locationButton,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                },
              ]}>
              <Text style={{ color: colors.text, fontSize: 18 }}>
                {locationStatus === 'requesting' ? '…' : '◎'}
              </Text>
            </TouchableOpacity>
          </View>

          {suggestions.length > 0 ? (
            <View
              style={[
                styles.suggestions,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}>
              {suggestions.slice(0, 4).map((area) => (
                <TouchableOpacity
                  key={area.id}
                  accessibilityLabel={i18n.t('mapChooseArea', {
                    area: area.label,
                  })}
                  accessibilityRole="button"
                  onPress={() => chooseArea(area)}
                  style={[styles.suggestion, { borderColor: colors.border }]}>
                  <Text numberOfLines={1} style={{ color: colors.text }}>
                    {area.label}
                  </Text>
                  {area.secondaryLabel ? (
                    <Text
                      numberOfLines={1}
                      style={[styles.suggestionSecondary, { color: colors.textMuted }]}>
                      {area.secondaryLabel}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {!mapFocused ? (
        <View
          testID="results-pane"
          style={[
            styles.resultsPane,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}>
          <Pressable
            accessibilityLabel={i18n.t('mapFocusViewAccessibility')}
            accessibilityRole="button"
            accessibilityState={{ expanded: true }}
            onPress={() => setMapFocused(true)}
            style={({ pressed }) => [
              styles.sheetCollapseControl,
              { opacity: pressed ? 0.72 : 1 },
            ]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetCollapseText, { color: colors.textMuted }]}>
              {i18n.t('mapFocusView')}
            </Text>
            <Ionicons color={colors.textMuted} name="chevron-down" size={18} />
          </Pressable>
          <FlatList
            contentContainerStyle={styles.resultsContent}
            data={results}
            ItemSeparatorComponent={() => <View style={styles.resultGap} />}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(place) => place.id}
            ListFooterComponent={
              <View style={styles.attribution}>
                <GoogleMapsAttribution />
              </View>
            }
            ListHeaderComponent={listHeader}
            renderItem={({ item }) => (
              <PlaceCard place={item} onPress={() => openPlace(item.id)} />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <Pressable
          {...nearbyDockPanResponder.panHandlers}
          accessibilityHint={i18n.t('mapNearbyHint')}
          accessibilityLabel={i18n.t('mapShowNearbyAccessibility', {
            count: results.length,
            placeLabel:
              results.length === 1
                ? i18n.t('mapNearbyPlace')
                : i18n.t('mapNearbyPlaces'),
          })}
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          onPress={() => setMapFocused(false)}
          style={({ pressed }) => [
            styles.nearbyDock,
            {
              backgroundColor: colors.navBackground,
              borderColor: colors.border,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            },
          ]}>
          <View style={[styles.dockHandle, { backgroundColor: colors.border }]} />
          <View style={styles.dockCopy}>
            <Text style={[styles.dockTitle, { color: colors.text }]}>
              {i18n.t('mapNearbyDock', {
                count: results.length,
                placeLabel:
                  results.length === 1
                    ? i18n.t('mapNearbyPlace')
                    : i18n.t('mapNearbyPlaces'),
              })}
            </Text>
            <Text style={[styles.dockHint, { color: colors.textMuted }]}>
              {i18n.t('mapNearbyHint')}
            </Text>
          </View>
          <Ionicons color={colors.accentForeground} name="chevron-up" size={21} />
        </Pressable>
      )}
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
      accessibilityLabel={i18n.t('mapFilterAccessibility', { label })}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? `${colors.accent}24` : colors.surface,
          borderColor: active ? colors.accentForeground : colors.border,
        },
      ]}>
      <Text
        style={{
          color: active ? colors.accentForeground : colors.text,
          fontFamily: fontFamily.semibold,
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  mapPane: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  resultsPane: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    bottom: 0,
    height: '50%',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  searchOverlay: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    left: spacing.md,
    padding: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
    zIndex: 2,
  },
  searchAreaButton: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    position: 'absolute',
    zIndex: 2,
  },
  searchAreaButtonExpanded: { bottom: '52%' },
  searchAreaButtonFocused: { bottom: 96 },
  queryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  queryInput: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  areaRow: { flexDirection: 'row', gap: spacing.xs },
  areaInput: {
    borderRadius: radius.pill,
    borderWidth: 1,
    flex: 1,
    fontFamily: fontFamily.regular,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  locationButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  suggestions: {
    borderRadius: radius.md,
    borderWidth: 1,
    left: spacing.sm,
    overflow: 'hidden',
    position: 'absolute',
    right: spacing.sm,
    top: 98,
  },
  suggestion: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionSecondary: { fontSize: 12, marginTop: 2 },
  resultsContent: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  sheetHandle: {
    borderRadius: radius.pill,
    height: 4,
    width: 38,
  },
  sheetCollapseControl: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  sheetCollapseText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  listHeader: {
    gap: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.md,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  resultCopy: { flex: 1 },
  resultTitle: { fontFamily: fontFamily.display, fontSize: 24 },
  surpriseButton: {
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filters: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recoveryButton: { justifyContent: 'center', minHeight: 44 },
  state: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  surpriseCard: { borderRadius: radius.md, gap: spacing.xs, padding: spacing.md },
  cardName: { fontFamily: fontFamily.semibold, fontSize: 17 },
  resultGap: { height: spacing.md },
  attribution: { paddingTop: spacing.md },
  nearbyDock: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: spacing.md,
    zIndex: 4,
  },
  dockHandle: {
    borderRadius: radius.pill,
    height: 4,
    left: '50%',
    marginLeft: -18,
    position: 'absolute',
    top: 7,
    width: 36,
  },
  dockCopy: { flex: 1 },
  dockTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
  },
  dockHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
});
