import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { isCoordinateWithinAreaBoundary } from '@/features/map/area-boundary';
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
const DEFAULT_RADIUS_METERS = 3000;
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
    clearRecentAreas,
    criteria,
    error,
    locationCanAskAgain,
    locationMessage,
    locationStatus,
    userCoordinates,
    results,
    recentAreas,
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
  const [queryFocused, setQueryFocused] = useState(false);
  const queryBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [queryAreaSuggestions, setQueryAreaSuggestions] = useState<
    AreaSuggestion[]
  >([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(() => ({
    openNow: criteria.openNow,
    verifiedHalalOnly: criteria.verifiedHalalOnly,
    priceLevels: [...criteria.priceLevels],
    categories: [...criteria.categories],
    radiusMeters: criteria.radiusMeters,
  }));
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MapViewMode>('split');
  const [pendingMapSearch, setPendingMapSearch] =
    useState<MapViewport | null>(null);
  const mapFocused = viewMode === 'map';
  const listFocused = viewMode === 'list';
  const activeFilterCount =
    Number(criteria.openNow) +
    Number(criteria.verifiedHalalOnly) +
    Number(criteria.priceLevels.length > 0) +
    Number(criteria.categories.length > 0) +
    Number(criteria.radiusMeters !== DEFAULT_RADIUS_METERS);
  const keepQueryOpen = () => {
    if (queryBlurTimer.current) clearTimeout(queryBlurTimer.current);
    queryBlurTimer.current = null;
  };
  const closeQueryAfterInteraction = () => {
    keepQueryOpen();
    queryBlurTimer.current = setTimeout(() => {
      setQueryFocused(false);
      queryBlurTimer.current = null;
    }, 150);
  };
  const visibleResults = useMemo(
    () => {
      const areaBoundary = criteria.areaBoundary;
      const areaBounds = criteria.areaBounds;
      const areaResults = areaBoundary
        ? results.filter((place) =>
            isCoordinateWithinAreaBoundary(
              place.coordinates,
              areaBoundary,
            ),
          )
        : areaBounds
          ? results.filter((place) =>
              isCoordinateWithinMapBounds(place.coordinates, areaBounds),
            )
          : results;
      const bounds = mapViewport.bounds;
      return bounds
        ? selectMapPlacesForViewport(areaResults, bounds)
        : areaResults;
    },
    [
      criteria.areaBoundary,
      criteria.areaBounds,
      mapViewport.bounds,
      results,
    ],
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
    setQueryFocused(false);
    setFiltersOpen(false);
    if (locationCanAskAgain !== false) {
      await searchCurrentLocation();
      setViewMode('map');
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
  }, [
    criteria.areaBounds,
    criteria.areaLabel,
    criteria.center,
    criteria.radiusMeters,
  ]);

  useEffect(() => {
    setQueryInput(criteria.query ?? '');
  }, [criteria.query]);

  useEffect(
    () => () => {
      if (queryBlurTimer.current) clearTimeout(queryBlurTimer.current);
    },
    [],
  );

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
    Keyboard.dismiss();
    setQueryFocused(false);
    setQueryAreaSuggestions([]);
    setFiltersOpen(false);
    setViewMode('split');
    void updateCriteriaAndSearch({
      query: queryInput.trim() || undefined,
    });
  };

  const chooseQueryArea = (area: AreaSuggestion) => {
    const selectedArea = { ...area, label: areaDisplayLabel(area) };
    Keyboard.dismiss();
    setQueryFocused(false);
    setFiltersOpen(false);
    setQueryAreaSuggestions([]);
    setQueryInput('');
    setViewMode('map');
    void selectArea(selectedArea, { query: undefined });
  };

  const openFilters = () => {
    setQueryFocused(false);
    setDraftFilters({
      openNow: criteria.openNow,
      verifiedHalalOnly: criteria.verifiedHalalOnly,
      priceLevels: [...criteria.priceLevels],
      categories: [...criteria.categories],
      radiusMeters: criteria.radiusMeters,
    });
    setFiltersOpen((current) => !current);
  };

  const applyFilters = () => {
    setFiltersOpen(false);
    setViewMode('split');
    void updateCriteriaAndSearch(draftFilters);
  };

  const resetDraftFilters = () => {
    setDraftFilters({
      openNow: false,
      verifiedHalalOnly: false,
      priceLevels: [],
      categories: [],
      radiusMeters: DEFAULT_RADIUS_METERS,
    });
  };

  const toggleDraftPrice = (price: PriceLevel) => {
    setDraftFilters((current) => ({
      ...current,
      priceLevels: current.priceLevels.includes(price)
        ? current.priceLevels.filter((candidate) => candidate !== price)
        : [...current.priceLevels, price],
    }));
  };

  const toggleDraftCategory = (category: string) => {
    setDraftFilters((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((candidate) => candidate !== category)
        : [...current.categories, category],
    }));
  };

  const runMapAreaSearch = useCallback(
    (viewport: MapViewport) =>
      search({
        ...criteria,
        areaBounds: undefined,
        areaBoundary: undefined,
        areaPlaceId: undefined,
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
            focusedAreaBoundary={criteria.areaBoundary}
            focusedAreaBounds={criteria.areaBounds}
            onViewportChange={handleViewportChange}
            onMapPress={() => {
              setQueryFocused(false);
              setFiltersOpen(false);
              setViewMode('map');
            }}
            onPlacePress={openPlace}
            places={visibleResults}
            showsUserLocation={locationStatus === 'granted'}
            userCoordinates={userCoordinates}
          />

        {criteria.areaBoundary ? (
          <TouchableOpacity
            accessibilityLabel={i18n.t('mapBoundaryAttributionAccessibility')}
            accessibilityRole="link"
            onPress={() =>
              void Linking.openURL('https://www.openstreetmap.org/copyright')
            }
            style={[
              styles.boundaryAttribution,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            <Text style={[styles.boundaryAttributionText, { color: colors.textMuted }]}>
              {i18n.t('mapBoundaryAttribution')}
            </Text>
          </TouchableOpacity>
        ) : null}

        {!filtersOpen ? (
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
        ) : null}

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
              onFocus={() => {
                keepQueryOpen();
                setQueryFocused(true);
                setFiltersOpen(false);
              }}
              onBlur={closeQueryAfterInteraction}
              onSubmitEditing={submitQuery}
              placeholder={i18n.t('mapQueryPlaceholder')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={[styles.queryInput, { color: colors.text }]}
              value={queryInput}
            />
            <TouchableOpacity
              accessibilityLabel={i18n.t('mapOpenFilters')}
              accessibilityRole="button"
              onPress={openFilters}
              style={[
                styles.submitButton,
                { backgroundColor: colors.surfaceElevated },
              ]}>
              <Ionicons color={colors.text} name="options-outline" size={20} />
              {activeFilterCount > 0 ? (
                <View
                  style={[
                    styles.filterBadge,
                    { backgroundColor: colors.accentForeground },
                  ]}>
                  <Text style={[styles.filterBadgeText, { color: colors.background }]}>
                    {activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
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
                styles.submitButton,
                {
                  backgroundColor:
                    locationStatus === 'granted'
                      ? `${colors.accent}32`
                      : colors.surfaceElevated,
                },
              ]}>
              <Ionicons
                color={
                  locationStatus === 'granted'
                    ? colors.accentForeground
                    : colors.text
                }
                name={
                  locationStatus === 'requesting'
                    ? 'hourglass-outline'
                    : 'navigate'
                }
                size={20}
              />
            </TouchableOpacity>
          </View>
          {filtersOpen ? (
            <View
              testID="filter-panel"
              style={[styles.filterPanel, { borderColor: colors.border }]}>
              <View style={styles.filterPanelHeader}>
                <View>
                  <Text style={[styles.filterTitle, { color: colors.text }]}>
                    {i18n.t('mapFiltersTitle')}
                  </Text>
                  <Text style={[styles.filterHint, { color: colors.textMuted }]}>
                    {i18n.t('mapFiltersHint')}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel={i18n.t('mapResetFilters')}
                  accessibilityRole="button"
                  onPress={resetDraftFilters}>
                  <Text style={[styles.resetFilters, { color: colors.accentForeground }]}>
                    {i18n.t('mapReset')}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                contentContainerStyle={styles.filterPanelContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.filterPanelScroll}>
                <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>
                  {i18n.t('mapAvailability')}
                </Text>
                <View style={styles.filterWrap}>
                  <FilterChip
                    active={draftFilters.openNow}
                    label={i18n.t('mapFilterOpenNow')}
                    onPress={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        openNow: !current.openNow,
                      }))
                    }
                  />
                  <FilterChip
                    active={draftFilters.verifiedHalalOnly}
                    label={i18n.t('mapFilterVerifiedHalal')}
                    onPress={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        verifiedHalalOnly: !current.verifiedHalalOnly,
                      }))
                    }
                  />
                </View>
                <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>
                  {i18n.t('mapAverageSpend')}
                </Text>
                <View style={styles.filterWrap}>
                  {PRICES.map((price) => (
                    <FilterChip
                      key={price}
                      active={draftFilters.priceLevels.includes(price)}
                      label={
                        [
                          'Budget-friendly',
                          'Moderate',
                          'Pricey',
                          'Premium',
                        ][price - 1]
                      }
                      onPress={() => toggleDraftPrice(price)}
                    />
                  ))}
                </View>
                <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>
                  {i18n.t('mapCuisine')}
                </Text>
                <View style={styles.filterWrap}>
                  {CATEGORIES.map((category) => (
                    <FilterChip
                      key={category.value}
                      active={draftFilters.categories.includes(category.value)}
                      label={i18n.t(category.labelKey)}
                      onPress={() => toggleDraftCategory(category.value)}
                    />
                  ))}
                </View>
                <Text style={[styles.filterSectionTitle, { color: colors.textMuted }]}>
                  {i18n.t('mapDistance')}
                </Text>
                <View style={styles.filterWrap}>
                  {RADII.map((radiusMeters) => (
                    <FilterChip
                      key={radiusMeters}
                      active={draftFilters.radiusMeters === radiusMeters}
                      label={i18n.t('mapRadius', {
                        distance: Number((radiusMeters / 1000).toFixed(1)),
                      })}
                      onPress={() =>
                        setDraftFilters((current) => ({
                          ...current,
                          radiusMeters,
                        }))
                      }
                    />
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity
                accessibilityLabel={i18n.t('mapApplyFilters')}
                accessibilityRole="button"
                onPress={applyFilters}
                style={[styles.applyFilters, { backgroundColor: colors.accent }]}>
                <Text style={[styles.applyFiltersText, { color: colors.accentText }]}>
                  {i18n.t('mapShowResults')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {queryFocused &&
          queryInput.trim().length === 0 &&
          recentAreas.length > 0 ? (
            <View
              style={[
                styles.querySuggestions,
                { borderColor: colors.border },
              ]}>
              <View style={styles.querySuggestionHeader}>
                <Text
                  accessibilityRole="header"
                  style={[
                    styles.querySuggestionHeading,
                    { color: colors.textMuted },
                  ]}>
                  {i18n.t('mapRecentAreas')}
                </Text>
                <TouchableOpacity
                  accessibilityLabel={i18n.t('mapClearRecentAreas')}
                  accessibilityRole="button"
                  onPress={clearRecentAreas}>
                  <Text
                    style={[
                      styles.clearRecentAreas,
                      { color: colors.accentForeground },
                    ]}>
                    {i18n.t('mapClear')}
                  </Text>
                </TouchableOpacity>
              </View>
              {recentAreas.slice(0, 5).map((area) => {
                const label = areaDisplayLabel(area);
                return (
                  <AreaSuggestionRow
                    key={area.id}
                    area={area}
                    label={label}
                    onPressIn={keepQueryOpen}
                    onPress={() => chooseQueryArea(area)}
                  />
                );
              })}
            </View>
          ) : null}
          {queryFocused && queryAreaSuggestions.length > 0 ? (
            <View
              style={[
                styles.querySuggestions,
                { borderColor: colors.border },
              ]}>
              <View style={styles.querySuggestionHeader}>
                <Text
                  accessibilityRole="header"
                  style={[
                    styles.querySuggestionHeading,
                    { color: colors.textMuted },
                  ]}>
                  {i18n.t('mapLocationSuggestions')}
                </Text>
              </View>
              {queryInput.trim() ? (
                <TouchableOpacity
                  accessibilityLabel={i18n.t('mapQuerySubmitAccessibility')}
                  accessibilityRole="button"
                  onPress={submitQuery}
                  onPressIn={keepQueryOpen}
                  style={styles.querySuggestion}>
                  <View
                    style={[
                      styles.querySuggestionIcon,
                      { backgroundColor: colors.surfaceElevated },
                    ]}>
                    <Ionicons
                      color={colors.accentForeground}
                      name="restaurant-outline"
                      size={18}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.querySuggestionLabel, { color: colors.text }]}>
                    {i18n.t('mapSearchFoodFor', { query: queryInput.trim() })}
                  </Text>
                  <Ionicons color={colors.textMuted} name="arrow-forward" size={17} />
                </TouchableOpacity>
              ) : null}
              {queryAreaSuggestions.slice(0, 5).map((area) => {
                const label = areaDisplayLabel(area);
                return (
                  <AreaSuggestionRow
                    key={area.id}
                    area={area}
                    label={label}
                    onPressIn={keepQueryOpen}
                    onPress={() => chooseQueryArea(area)}
                  />
                );
              })}
            </View>
          ) : null}
        </View>
        </View>
      ) : null}

      {filtersOpen ? null : !mapFocused ? (
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

function AreaSuggestionRow({
  area,
  label,
  onPressIn,
  onPress,
}: {
  area: AreaSuggestion;
  label: string;
  onPressIn?: () => void;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      accessibilityLabel={i18n.t('mapGoToArea', { area: label })}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={onPressIn}
      style={styles.querySuggestion}>
      <View
        style={[
          styles.querySuggestionIcon,
          { backgroundColor: colors.surfaceElevated },
        ]}>
        <Ionicons
          color={colors.accentForeground}
          name={area.id.startsWith('recent:') ? 'time-outline' : 'location-outline'}
          size={18}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.querySuggestionLabel, { color: colors.text }]}>
        {label}
      </Text>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={17} />
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
    zIndex: 4,
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
  boundaryAttribution: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    position: 'absolute',
    top: 80,
    zIndex: 2,
  },
  boundaryAttributionText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
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
  querySuggestionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  clearRecentAreas: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    padding: spacing.xs,
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
  filterBadge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 17,
    justifyContent: 'center',
    minWidth: 17,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -3,
    top: -3,
  },
  filterBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
  },
  filterPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: 480,
    overflow: 'hidden',
    paddingBottom: spacing.xs,
    paddingTop: spacing.md,
  },
  filterPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  filterTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
  },
  filterHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    marginTop: 2,
  },
  resetFilters: {
    fontFamily: fontFamily.semibold,
    padding: spacing.sm,
  },
  filterPanelContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  filterPanelScroll: {
    flexShrink: 1,
    minHeight: 0,
  },
  filterSectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.7,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  applyFilters: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    minHeight: 46,
  },
  applyFiltersText: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
  },
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
