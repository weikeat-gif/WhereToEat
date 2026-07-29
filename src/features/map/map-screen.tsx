import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
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
import { CompactPlaceRow } from '@/components/ui/compact-place-row';
import type { PriceLevel } from '@/contracts/place';
import type { AreaSuggestion } from '@/contracts/search';
import { MapCanvas } from '@/features/map/map-canvas';
import {
  isCoordinateWithinMapBounds,
  selectMapPlacesForViewport,
  type MapViewport,
} from '@/features/map/map-viewport';
import { DISCOVERY_PLACES } from '@/features/home/discovery-data';
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
type MapViewMode = 'split' | 'map' | 'list';
export const MAP_AUTO_SEARCH_DELAY_MS = 650;
export const MAP_QUERY_SUGGESTION_DELAY_MS = 280;

function areaDisplayLabel(area: AreaSuggestion) {
  const secondaryLabel = area.secondaryLabel?.trim();
  if (
    !secondaryLabel ||
    area.label.toLocaleLowerCase().includes(secondaryLabel.toLocaleLowerCase())
  ) {
    return area.label;
  }
  return `${area.label}, ${secondaryLabel}`;
}

export function MapScreen() {
  const { colors } = useAppTheme();
  const {
    autocompleteArea,
    criteria,
    error,
    locationCanAskAgain,
    locationMessage,
    locationStatus,
    userCoordinates,
    results,
    search,
    searchCurrentLocation,
    selectArea,
    status,
    surprise,
    surpriseMe,
    updateCriteriaAndSearch,
  } = useSearch();
  const [mapViewport, setMapViewport] = useState<MapViewport>({
    center: criteria.center,
    radiusMeters: criteria.radiusMeters,
  });
  const [queryInput, setQueryInput] = useState(criteria.query ?? '');
  const [areaInput, setAreaInput] = useState(criteria.areaLabel);
  const [suggestions, setSuggestions] = useState<AreaSuggestion[]>([]);
  const [queryAreaSuggestions, setQueryAreaSuggestions] = useState<
    AreaSuggestion[]
  >([]);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MapViewMode>('split');
  const [pendingMapSearch, setPendingMapSearch] =
    useState<MapViewport | null>(null);
  const mapFocused = viewMode === 'map';
  const listFocused = viewMode === 'list';
  const visibleResults = useMemo(
    () => {
      const areaBounds = criteria.areaBounds;
      const areaResults = areaBounds
        ? results.filter((place) =>
            isCoordinateWithinMapBounds(place.coordinates, areaBounds),
          )
        : results;
      const bounds = mapViewport.bounds;
      return bounds
        ? selectMapPlacesForViewport(areaResults, bounds)
        : areaResults;
    },
    [criteria.areaBounds, mapViewport.bounds, results],
  );
  const nearbyDockPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 8,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy < -18) setViewMode('split');
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
    setPendingMapSearch(null);
    setMapViewport({
      center: criteria.center,
      radiusMeters: criteria.radiusMeters,
      bounds: criteria.areaBounds,
    });
    setAreaInput(criteria.areaLabel);
  }, [
    criteria.areaBounds,
    criteria.areaLabel,
    criteria.center,
    criteria.radiusMeters,
  ]);

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

  useEffect(() => {
    let active = true;
    const input = queryInput.trim();
    if (input.length < 2 || input === (criteria.query ?? '').trim()) {
      setQueryAreaSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      void autocompleteArea(input)
        .then((areas) => {
          if (active) setQueryAreaSuggestions(areas);
        })
        .catch(() => {
          if (active) setQueryAreaSuggestions([]);
        });
    }, MAP_QUERY_SUGGESTION_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [autocompleteArea, criteria.query, queryInput]);

  const submitQuery = () => {
    setQueryAreaSuggestions([]);
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
    const selectedArea = { ...area, label: areaDisplayLabel(area) };
    setSuggestions([]);
    setAreaInput(selectedArea.label);
    setViewMode('map');
    void selectArea(selectedArea);
  };

  const chooseQueryArea = (area: AreaSuggestion) => {
    const selectedArea = { ...area, label: areaDisplayLabel(area) };
    Keyboard.dismiss();
    setQueryAreaSuggestions([]);
    setQueryInput('');
    setAreaInput(selectedArea.label);
    setViewMode('map');
    void selectArea(selectedArea, { query: undefined });
  };

  const runMapAreaSearch = useCallback(
    (viewport: MapViewport) =>
      search({
        ...criteria,
        areaBounds: undefined,
        center: viewport.center,
        areaLabel: i18n.t('mapAreaLabel'),
        radiusMeters: viewport.radiusMeters,
        rankPreference: 'POPULARITY',
      }),
    [criteria, search],
  );

  const searchMapArea = () => {
    setPendingMapSearch(null);
    return runMapAreaSearch(mapViewport);
  };

  const handleViewportChange = useCallback(
    (
      viewport: MapViewport,
      source: 'gesture' | 'programmatic',
    ) => {
      setMapViewport(viewport);
      if (source === 'gesture') setPendingMapSearch(viewport);
    },
    [],
  );

  useEffect(() => {
    if (!pendingMapSearch || status === 'loading') return;
    const timeout = setTimeout(() => {
      setPendingMapSearch(null);
      void runMapAreaSearch(pendingMapSearch);
    }, MAP_AUTO_SEARCH_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [pendingMapSearch, runMapAreaSearch, status]);

  const listHeader = (
    <View style={styles.listHeader}>
      <View
        style={[
          styles.areaControl,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}>
        <View style={styles.areaRow}>
          <Ionicons
            color={colors.accentForeground}
            name="location-outline"
            size={19}
          />
          <TextInput
            accessibilityLabel={i18n.t('mapAreaAccessibility')}
            onChangeText={setAreaInput}
            placeholder={i18n.t('mapAreaPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[styles.areaInput, { color: colors.text }]}
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
              { backgroundColor: colors.surfaceElevated },
            ]}>
            <Ionicons
              color={colors.text}
              name={
                locationStatus === 'requesting'
                  ? 'hourglass-outline'
                  : 'locate-outline'
              }
              size={20}
            />
          </TouchableOpacity>
        </View>
        {suggestions.length > 0 ? (
          <View style={styles.suggestions}>
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
                    style={[
                      styles.suggestionSecondary,
                      { color: colors.textMuted },
                    ]}>
                    {area.secondaryLabel}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.resultHeader}>
        <View style={styles.resultCopy}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {i18n.t('mapResultsTitle')}
          </Text>
          <Text style={{ color: colors.textMuted }}>
            {i18n.t('mapResultCount', {
              count: visibleResults.length,
              spotLabel:
                visibleResults.length === 1
                  ? i18n.t('mapSpot')
                  : i18n.t('mapSpots'),
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
            distance: Number((criteria.radiusMeters / 1000).toFixed(1)),
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
      {!listFocused ? (
        <View testID="map-pane" style={styles.mapPane}>
          <MapCanvas
            center={mapViewport.center}
            highlightedArea={criteria.areaBounds}
            onViewportChange={handleViewportChange}
            onMapPress={() => setViewMode('map')}
            onPlacePress={openPlace}
            places={visibleResults}
            showsUserLocation={locationStatus === 'granted'}
            userCoordinates={userCoordinates}
          />

        {criteria.areaBounds ? (
          <View
            pointerEvents="none"
            style={[
              styles.areaBoundsBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentForeground,
              },
            ]}>
            <Ionicons
              color={colors.accentForeground}
              name="map-outline"
              size={16}
            />
            <Text
              numberOfLines={1}
              style={[styles.areaBoundsText, { color: colors.text }]}>
              {i18n.t('mapApproximateArea', { area: criteria.areaLabel })}
            </Text>
          </View>
        ) : null}

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
            <Ionicons color={colors.textMuted} name="search" size={22} />
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
              accessibilityLabel="Show search filters and nearby results"
              accessibilityRole="button"
              onPress={() => setViewMode('split')}
              style={[
                styles.submitButton,
                { backgroundColor: colors.surfaceElevated },
              ]}>
              <Ionicons color={colors.text} name="options-outline" size={20} />
            </TouchableOpacity>
          </View>
          {queryAreaSuggestions.length > 0 ? (
            <View
              style={[
                styles.querySuggestions,
                { borderColor: colors.border },
              ]}>
              <Text
                accessibilityRole="header"
                style={[
                  styles.querySuggestionHeading,
                  { color: colors.textMuted },
                ]}>
                {i18n.t('mapLocationSuggestions')}
              </Text>
              {queryAreaSuggestions.slice(0, 4).map((area) => {
                const label = areaDisplayLabel(area);
                return (
                  <TouchableOpacity
                    key={area.id}
                    accessibilityLabel={i18n.t('mapGoToArea', { area: label })}
                    accessibilityRole="button"
                    onPress={() => chooseQueryArea(area)}
                    style={styles.querySuggestion}>
                    <View
                      style={[
                        styles.querySuggestionIcon,
                        { backgroundColor: colors.surfaceElevated },
                      ]}>
                      <Ionicons
                        color={colors.accentForeground}
                        name="location-outline"
                        size={18}
                      />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.querySuggestionLabel,
                        { color: colors.text },
                      ]}>
                      {label}
                    </Text>
                    <Ionicons
                      color={colors.textMuted}
                      name="chevron-forward"
                      size={17}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
        </View>
      ) : null}

      {!mapFocused ? (
        <View
          testID="results-pane"
          style={[
            listFocused ? styles.resultsPaneFocused : styles.resultsPane,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}>
          <Pressable
            accessibilityLabel={i18n.t('mapFocusViewAccessibility')}
            accessibilityRole="button"
            accessibilityState={{ expanded: true }}
            onPress={() => setViewMode('map')}
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
            data={visibleResults}
            ItemSeparatorComponent={() => <View style={styles.resultGap} />}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(place) => place.id}
            onScrollBeginDrag={() => setViewMode('list')}
            ListFooterComponent={
              <View style={styles.attribution}>
                <GoogleMapsAttribution />
              </View>
            }
            ListHeaderComponent={listHeader}
            onScroll={(event) => {
              if (
                viewMode === 'split' &&
                event.nativeEvent.contentOffset.y > 12
              ) {
                setViewMode('list');
              }
            }}
            renderItem={({ item }) => (
              <CompactPlaceRow
                image={
                  DISCOVERY_PLACES.find(
                    (candidate) => candidate.id === item.id,
                  )?.image
                }
                place={item}
                onPress={() => openPlace(item.id)}
              />
            )}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <Pressable
          {...nearbyDockPanResponder.panHandlers}
          accessibilityHint={i18n.t('mapNearbyHint')}
          accessibilityLabel={i18n.t('mapShowNearbyAccessibility', {
            count: visibleResults.length,
            placeLabel:
              visibleResults.length === 1
                ? i18n.t('mapNearbyPlace')
                : i18n.t('mapNearbyPlaces'),
          })}
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          onPress={() => setViewMode('split')}
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
                count: visibleResults.length,
                placeLabel:
                  visibleResults.length === 1
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    bottom: 0,
    height: '46%',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  resultsPaneFocused: {
    bottom: 0,
    height: '100%',
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    zIndex: 3,
  },
  searchOverlay: {
    borderRadius: 22,
    borderWidth: 1,
    left: spacing.lg,
    padding: 7,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.md,
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
  searchAreaButtonExpanded: { bottom: '48%' },
  searchAreaButtonFocused: { bottom: 128 },
  areaBoundsBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    left: spacing.lg,
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    top: 84,
    zIndex: 2,
  },
  areaBoundsText: {
    flexShrink: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  queryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: 8,
  },
  queryInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  querySuggestions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
  },
  querySuggestionHeading: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.7,
    paddingHorizontal: spacing.sm,
    textTransform: 'uppercase',
  },
  querySuggestion: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  querySuggestionIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  querySuggestionLabel: {
    flex: 1,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 15,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  areaControl: {
    borderRadius: 15,
    borderWidth: 1,
    padding: 8,
  },
  areaRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  areaInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    minHeight: 44,
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
  },
  locationButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  suggestions: {
    overflow: 'hidden',
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
  resultTitle: { fontFamily: fontFamily.semibold, fontSize: 20 },
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
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    left: 0,
    minHeight: 112,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
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
