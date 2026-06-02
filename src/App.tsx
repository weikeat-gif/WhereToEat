import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import {
  Bookmark,
  Clock3,
  Compass,
  Copy,
  Filter,
  Heart,
  History,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  Star,
  UserRound,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import {
  buildGoogleMapsSearchUrl,
  type Coordinates,
  type LocationPermissionState,
} from '@/lib/maps'
import {
  buildGoogleMapsRestaurantUrl,
  fetchNearbyRestaurants,
  filterRestaurants,
  sampleRestaurants,
  type Restaurant,
} from '@/lib/restaurants'

const preferenceKey = 'makanmana.preferences'
const savedRestaurantsKey = 'makanmana.saved-restaurants'

type Preferences = {
  radiusKm: number
  priceLevel: '$' | '$$' | '$$$' | '$$$$'
  halalOnly: boolean
  groupFriendly: boolean
}

const radiusOptions = [1, 3, 5, 10, 20] as const
const priceLevels = ['$', '$$', '$$$', '$$$$'] as const

const defaultPreferences: Preferences = {
  radiusKm: 3,
  priceLevel: '$$',
  halalOnly: false,
  groupFriendly: true,
}

type ActiveView = 'discover' | 'search' | 'saved' | 'activity' | 'profile' | 'settings'
type SortOption = 'nearest' | 'cheapest' | 'rating' | 'group'

const categories = [
  { label: 'Open Now', query: '' },
  { label: 'Halal', query: 'halal' },
  { label: 'Cafe', query: 'cafe' },
  { label: 'Cheap Eats', query: 'cheap' },
  { label: 'Group Friendly', query: 'group' },
  { label: 'Dessert', query: 'dessert' },
  { label: 'Late Night', query: 'late night' },
] as const

const cuisineFilters = ['Malay', 'Chinese', 'Indian', 'Western', 'Japanese', 'Korean', 'Thai']
const sortOptions: Array<{ label: string; value: SortOption }> = [
  { label: 'Nearest', value: 'nearest' },
  { label: 'Cheapest', value: 'cheapest' },
  { label: 'Top rated', value: 'rating' },
  { label: 'Group', value: 'group' },
]

function readPreferences(): Preferences {
  try {
    const stored = window.localStorage.getItem(preferenceKey)
    if (!stored) {
      return defaultPreferences
    }

    const parsed = JSON.parse(stored) as Partial<Preferences>

    return {
      radiusKm:
        typeof parsed.radiusKm === 'number'
          ? Math.min(20, Math.max(1, Math.round(parsed.radiusKm)))
          : defaultPreferences.radiusKm,
      priceLevel: parsed.priceLevel ?? defaultPreferences.priceLevel,
      halalOnly: parsed.halalOnly ?? defaultPreferences.halalOnly,
      groupFriendly: parsed.groupFriendly ?? defaultPreferences.groupFriendly,
    }
  } catch {
    return defaultPreferences
  }
}

function readSavedRestaurants(): Restaurant[] {
  try {
    const stored = window.localStorage.getItem(savedRestaurantsKey)

    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(isStoredRestaurant).slice(0, 30)
  } catch {
    return []
  }
}

function isStoredRestaurant(value: unknown): value is Restaurant {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'lat' in value &&
    'lng' in value
  )
}

function App() {
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences())
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>(() =>
    readSavedRestaurants(),
  )
  const [activeView, setActiveView] = useState<ActiveView>('discover')
  const [foodQuery, setFoodQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Open Now')
  const [sortOption, setSortOption] = useState<SortOption>('nearest')
  const [manualLocation, setManualLocation] = useState('')
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>('idle')
  const [restaurants, setRestaurants] = useState<Restaurant[]>(sampleRestaurants)
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(
    null,
  )

  useEffect(() => {
    window.localStorage.setItem(preferenceKey, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    window.localStorage.setItem(
      savedRestaurantsKey,
      JSON.stringify(savedRestaurants),
    )
  }, [savedRestaurants])

  const visibleRestaurants = useMemo(
    () => sortRestaurants(filterRestaurants(restaurants, foodQuery), sortOption),
    [foodQuery, restaurants, sortOption],
  )

  const recommendedRestaurants = visibleRestaurants.slice(0, 4)
  const popularRestaurants = visibleRestaurants.slice(0, 6)
  const savedRestaurantIds = useMemo(
    () => new Set(savedRestaurants.map((restaurant) => restaurant.id)),
    [savedRestaurants],
  )
  const hasResults = visibleRestaurants.length > 0

  const quickMapsUrl = useMemo(
    () =>
      buildGoogleMapsSearchUrl({
        intent: 'open-nearby',
        coordinates: userLocation,
        manualLocation,
        radiusKm: preferences.radiusKm,
      }),
    [manualLocation, preferences.radiusKm, userLocation],
  )

  const statusLabel = {
    idle: 'Ready',
    requesting: 'Locating',
    granted: 'GPS ready',
    denied: 'Type location',
    unavailable: 'Type location',
  }[permissionState]

  function updatePreferences(nextPreferences: Partial<Preferences>) {
    setPreferences((current) => ({ ...current, ...nextPreferences }))
  }

  function selectCategory(category: (typeof categories)[number]) {
    setActiveCategory(category.label)
    setFoodQuery(category.query)
  }

  function selectCuisine(cuisine: string) {
    setActiveCategory(cuisine)
    setFoodQuery(cuisine.toLowerCase())
  }

  function updateFoodQuery(value: string) {
    setFoodQuery(value)
    setActiveCategory('')
  }

  function updateManualLocation(value: string) {
    setManualLocation(value)
    setUserLocation(null)
  }

  function clearSearch() {
    setFoodQuery('')
    setActiveCategory('Open Now')
  }

  function increaseRadiusForResults() {
    updatePreferences({ radiusKm: Math.min(20, preferences.radiusKm + 5) })
    toast.info('Radius increased')
  }

  function pickRestaurantForGroup() {
    if (!hasResults) {
      toast.info('Try a wider radius or another food type first.')
      return
    }

    const pick =
      visibleRestaurants[Math.floor(Math.random() * visibleRestaurants.length)]
    setSelectedRestaurant(pick)
    toast.success(`Picked ${pick.name}`)
  }

  function toggleSavedRestaurant(restaurant: Restaurant) {
    const willSave = !savedRestaurantIds.has(restaurant.id)

    setSavedRestaurants((current) => {
      if (current.some((savedRestaurant) => savedRestaurant.id === restaurant.id)) {
        return current.filter(
          (savedRestaurant) => savedRestaurant.id !== restaurant.id,
        )
      }

      return [
        restaurant,
        ...current.filter(
          (savedRestaurant) => savedRestaurant.id !== restaurant.id,
        ),
      ].slice(0, 30)
    })

    toast.success(willSave ? 'Saved to your food list' : 'Removed from saved')
  }

  async function loadRestaurantResults(coordinates: Coordinates | null) {
    setIsLoadingPlaces(true)

    try {
      if (!coordinates) {
        setRestaurants(sampleRestaurants)
        return
      }

      const nearbyRestaurants = await fetchNearbyRestaurants(
        coordinates,
        preferences.radiusKm,
      )

      setRestaurants(
        nearbyRestaurants.length > 0 ? nearbyRestaurants : sampleRestaurants,
      )
    } catch {
      setRestaurants(sampleRestaurants)
      toast.warning('Showing sample picks. Live nearby places did not load.')
    } finally {
      setIsLoadingPlaces(false)
    }
  }

  function searchNearbyFood() {
    if (manualLocation.trim()) {
      setPermissionState((current) => (current === 'requesting' ? 'idle' : current))
      void loadRestaurantResults(null)
      return
    }

    if (!('geolocation' in navigator)) {
      setPermissionState('unavailable')
      void loadRestaurantResults(null)
      return
    }

    setPermissionState('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        }
        setUserLocation(coordinates)
        setPermissionState('granted')
        void loadRestaurantResults(coordinates)
      },
      () => {
        setUserLocation(null)
        setPermissionState('denied')
        void loadRestaurantResults(null)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    )
  }

  function openRestaurantMaps(restaurant: Restaurant) {
    window.open(
      buildGoogleMapsRestaurantUrl(restaurant),
      '_blank',
      'noopener,noreferrer',
    )
  }

  async function copyRestaurantLink(restaurant: Restaurant) {
    await navigator.clipboard.writeText(buildGoogleMapsRestaurantUrl(restaurant))
    toast.success('Restaurant link copied')
  }

  async function shareRestaurant(restaurant: Restaurant) {
    const url = buildGoogleMapsRestaurantUrl(restaurant)
    const planText = [
      `Jom makan at ${restaurant.name}`,
      `Food: ${restaurant.menuHighlights.slice(0, 3).join(', ')}`,
      `Price: ${restaurant.price}`,
      `Why: ${restaurant.vibe}`,
    ].join('\n')

    if (navigator.share) {
      await navigator.share({
        title: restaurant.name,
        text: planText,
        url,
      })
      return
    }

    await navigator.clipboard.writeText(`${planText}\nMaps: ${url}`)
    toast.success('Food plan copied')
  }

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-xl overflow-x-hidden bg-background pb-28 text-foreground shadow-[0_0_0_1px_rgba(190,200,202,0.35)]">
      <header className="sticky top-0 z-30 w-full overflow-hidden border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open food search"
            onClick={() => setActiveView('search')}
          >
            <img src="/pwa-icon.svg" alt="" className="size-8" />
          </Button>
          <h1 className="truncate text-center text-3xl font-bold tracking-tight text-primary">
            MakanMana
          </h1>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open settings"
            onClick={() => setActiveView('settings')}
          >
            <Settings className="size-6" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {activeView === 'discover' ? (
        <>
      <section className="space-y-3 overflow-hidden px-4 py-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_56px] gap-3">
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search food"
              value={foodQuery}
              onChange={(event) => updateFoodQuery(event.target.value)}
              placeholder="Search food, cafe, restaurant..."
              className="h-14 rounded-xl border-border/60 bg-card pl-11 text-base shadow-sm"
            />
          </div>

          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-14 rounded-xl bg-card"
                aria-label="Filters"
              >
                <SlidersHorizontal className="size-6 text-primary" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent className="max-h-[92svh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Tune distance, price, cuisine, and suitability.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-7">
                <section className="space-y-3">
                  <h3 className="text-base font-semibold">Mode</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => (
                      <Button
                        key={category.label}
                        variant={activeCategory === category.label ? 'default' : 'outline'}
                        onClick={() => selectCategory(category)}
                        className="justify-start rounded-lg"
                      >
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Distance</h3>
                    <span className="font-bold text-primary">{preferences.radiusKm} km</span>
                  </div>
                  <Card className="rounded-xl border-border/50 p-4 shadow-sm">
                    <Slider
                      value={[preferences.radiusKm]}
                      min={1}
                      max={20}
                      step={1}
                      onValueChange={([radiusKm]) => updatePreferences({ radiusKm })}
                      aria-label="Distance range"
                    />
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {radiusOptions.slice(0, 4).map((radius) => (
                        <Button
                          key={radius}
                          variant={preferences.radiusKm === radius ? 'default' : 'outline'}
                          onClick={() => updatePreferences({ radiusKm: radius })}
                          className="rounded-md"
                        >
                          {radius} km
                        </Button>
                      ))}
                    </div>
                  </Card>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold">Price Range</h3>
                  <div className="grid grid-cols-4 overflow-hidden rounded-lg border bg-card">
                    {priceLevels.map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() => updatePreferences({ priceLevel: price })}
                        className={`h-12 border-r text-base font-bold last:border-r-0 ${
                          preferences.priceLevel === price
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card text-foreground'
                        }`}
                      >
                        {price}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Cuisine</h3>
                    <button className="text-sm font-semibold text-primary" type="button">
                      View All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {cuisineFilters.map((cuisine) => (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => selectCuisine(cuisine)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                          activeCategory === cuisine
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border/70 bg-card text-primary'
                        }`}
                      >
                        {cuisine}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold">Dietary and amenities</h3>
                  <div className="rounded-xl border bg-card shadow-sm">
                    <label className="flex items-center justify-between border-b p-4">
                      <span>Halal</span>
                      <input
                        type="checkbox"
                        checked={preferences.halalOnly}
                        onChange={(event) =>
                          updatePreferences({ halalOnly: event.target.checked })
                        }
                        className="size-5"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4">
                      <span>Group Friendly</span>
                      <input
                        type="checkbox"
                        checked={preferences.groupFriendly}
                        onChange={(event) =>
                          updatePreferences({ groupFriendly: event.target.checked })
                        }
                        className="size-5"
                      />
                    </label>
                  </div>
                </section>

                <Button
                  className="h-12 w-full rounded-lg"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Show Results
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <CategoryScroller
          activeCategory={activeCategory}
          onSelectCategory={selectCategory}
        />

        <div className="space-y-2 overflow-hidden rounded-xl border bg-card p-3 shadow-sm">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              aria-label="Location fallback"
              value={manualLocation}
              onChange={(event) => updateManualLocation(event.target.value)}
              placeholder="Type area or venue if GPS is off"
              className="h-11 rounded-lg bg-background"
            />
            <Button
              onClick={searchNearbyFood}
              disabled={permissionState === 'requesting' || isLoadingPlaces}
              className="h-11 min-w-20 rounded-lg px-3"
              aria-label="Search nearby food"
            >
              <LocateFixed className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {permissionState === 'requesting' || isLoadingPlaces
                  ? 'Searching...'
                  : 'Search nearby food'}
              </span>
              <span className="sm:hidden">
                {permissionState === 'requesting' || isLoadingPlaces ? 'Searching' : 'Search'}
              </span>
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {statusLabel}
            </span>
            <span>{visibleRestaurants.length} options found</span>
          </div>
        </div>
      </section>

      <section className="px-4">
        <StatusControls
          activeCategory={activeCategory}
          preferences={preferences}
          onSelectCategory={selectCategory}
          onSelectCuisine={selectCuisine}
          onUpdatePreferences={updatePreferences}
        />
      </section>

      <QuickDecisionBar
        onPick={pickRestaurantForGroup}
        onSelectCategory={selectCategory}
      />

      <SortControls value={sortOption} onChange={setSortOption} />

      {!hasResults ? (
        <EmptyResults
          query={foodQuery}
          onClear={clearSearch}
          onIncreaseRadius={increaseRadiusForResults}
          onOpenMaps={() =>
            window.open(quickMapsUrl, '_blank', 'noopener,noreferrer')
          }
          onTryCafe={() =>
            selectCategory(categories.find((item) => item.label === 'Cafe') ?? categories[0])
          }
        />
      ) : null}

      {hasResults ? (
        <section className="mt-4 space-y-3 overflow-hidden pl-4">
        <SectionHeader title="Recommended Nearby" action="See All" />
        <DragScrollArea className="flex w-full max-w-full gap-4 overflow-x-auto pb-4 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoadingPlaces
            ? [1, 2].map((item) => <RecommendedSkeleton key={item} />)
            : recommendedRestaurants.map((restaurant) => (
                <RecommendedCard
                  key={restaurant.id}
                  isSaved={savedRestaurantIds.has(restaurant.id)}
                  restaurant={restaurant}
                  onOpenMaps={() => openRestaurantMaps(restaurant)}
                  onSelect={() => setSelectedRestaurant(restaurant)}
                  onShare={() => void shareRestaurant(restaurant)}
                  onToggleSaved={() => toggleSavedRestaurant(restaurant)}
                />
              ))}
        </DragScrollArea>
        </section>
      ) : null}

      {hasResults ? (
        <section className="mt-4 space-y-3 px-4">
        <SectionHeader title="Popular Around You" />
        <div className="grid gap-3">
          {popularRestaurants.map((restaurant) => (
            <PopularCard
              key={restaurant.id}
              isSaved={savedRestaurantIds.has(restaurant.id)}
              restaurant={restaurant}
              onOpenMaps={() => openRestaurantMaps(restaurant)}
              onSelect={() => setSelectedRestaurant(restaurant)}
              onShare={() => void shareRestaurant(restaurant)}
              onToggleSaved={() => toggleSavedRestaurant(restaurant)}
            />
          ))}
        </div>
        </section>
      ) : null}

      <section className="mt-6 space-y-3 px-4">
        <SectionHeader title="Saved Places" action="Open saved" />
        <div className="grid gap-3">
          {savedRestaurants.map((restaurant) => (
            <SavedCard
              key={restaurant.id}
              restaurant={restaurant}
              onOpenMaps={() => openRestaurantMaps(restaurant)}
              onRemove={() => toggleSavedRestaurant(restaurant)}
              onSelect={() => setSelectedRestaurant(restaurant)}
              onShare={() => void shareRestaurant(restaurant)}
            />
          ))}
          {savedRestaurants.length === 0 ? (
            <SavedEmptyCard onBrowse={() => setActiveView('discover')} />
          ) : null}
        </div>
      </section>

      <section className="mt-6 px-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="size-5 text-primary" aria-hidden="true" />
              Quick Maps Search
            </CardTitle>
            <CardDescription>Food results on Google Maps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-lg bg-secondary p-3 text-xs leading-5 text-muted-foreground break-words">
              {quickMapsUrl}
            </p>
            <Button
              variant="outline"
              className="w-full rounded-lg"
              onClick={() => window.open(quickMapsUrl, '_blank', 'noopener,noreferrer')}
            >
              <Navigation className="size-4" aria-hidden="true" />
              Open broad Maps search
            </Button>
          </CardContent>
        </Card>
      </section>
        </>
      ) : null}

      {activeView === 'search' ? (
        <SearchView
          activeCategory={activeCategory}
          foodQuery={foodQuery}
          isLoadingPlaces={isLoadingPlaces}
          manualLocation={manualLocation}
          permissionState={permissionState}
          restaurants={visibleRestaurants}
          savedRestaurantIds={savedRestaurantIds}
          sortOption={sortOption}
          statusLabel={statusLabel}
          onFoodQueryChange={updateFoodQuery}
          onManualLocationChange={updateManualLocation}
          onOpenMaps={openRestaurantMaps}
          onSearchNearby={searchNearbyFood}
          onSelectCategory={selectCategory}
          onSelectRestaurant={setSelectedRestaurant}
          onSortChange={setSortOption}
          onShare={(restaurant) => void shareRestaurant(restaurant)}
          onToggleSaved={toggleSavedRestaurant}
        />
      ) : null}

      {activeView === 'saved' ? (
        <SavedView
          restaurants={savedRestaurants}
          onBrowse={() => setActiveView('discover')}
          onOpenMaps={openRestaurantMaps}
          onRemove={toggleSavedRestaurant}
          onSelectRestaurant={setSelectedRestaurant}
          onShare={(restaurant) => void shareRestaurant(restaurant)}
        />
      ) : null}

      {activeView === 'activity' ? (
        <ActivityView
          activeCategory={activeCategory || 'Custom'}
          preferences={preferences}
          statusLabel={statusLabel}
          restaurants={popularRestaurants}
          onSelectRestaurant={setSelectedRestaurant}
        />
      ) : null}

      {activeView === 'profile' ? (
        <ProfileView preferences={preferences} statusLabel={statusLabel} />
      ) : null}

      {activeView === 'settings' ? (
        <SettingsView preferences={preferences} onUpdatePreferences={updatePreferences} />
      ) : null}

      <RestaurantDetailSheet
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
        isSaved={
          selectedRestaurant ? savedRestaurantIds.has(selectedRestaurant.id) : false
        }
        onOpenMaps={openRestaurantMaps}
        onCopy={(restaurant) => void copyRestaurantLink(restaurant)}
        onShare={(restaurant) => void shareRestaurant(restaurant)}
        onToggleSaved={(restaurant) => toggleSavedRestaurant(restaurant)}
      />

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl border-t border-border/70 bg-card/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          <NavItem
            active={activeView === 'discover'}
            icon={<Compass className="size-6" />}
            label="Discover"
            onClick={() => setActiveView('discover')}
          />
          <NavItem
            active={activeView === 'saved'}
            icon={<Bookmark className="size-6" />}
            label="Saved"
            onClick={() => setActiveView('saved')}
          />
          <NavItem
            active={activeView === 'activity'}
            icon={<History className="size-6" />}
            label="Activity"
            onClick={() => setActiveView('activity')}
          />
          <NavItem
            active={activeView === 'profile'}
            icon={<UserRound className="size-6" />}
            label="Profile"
            onClick={() => setActiveView('profile')}
          />
        </div>
      </nav>

      <Toaster richColors position="bottom-center" />
    </main>
  )
}

function StatusControls({
  activeCategory,
  preferences,
  onSelectCategory,
  onSelectCuisine,
  onUpdatePreferences,
}: {
  activeCategory: string
  preferences: Preferences
  onSelectCategory: (category: (typeof categories)[number]) => void
  onSelectCuisine: (cuisine: string) => void
  onUpdatePreferences: (nextPreferences: Partial<Preferences>) => void
}) {
  const modeOptions = [
    ...categories.map((category) => category.label),
    ...cuisineFilters,
  ]
  const modeValue = modeOptions.includes(activeCategory) ? activeCategory : 'Custom'

  function handleModeChange(value: string) {
    const category = categories.find((item) => item.label === value)

    if (category) {
      onSelectCategory(category)
      return
    }

    if (cuisineFilters.includes(value)) {
      onSelectCuisine(value)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-card p-2 text-center shadow-sm">
      <StatusSelect
        label="Mode"
        value={modeValue}
        options={modeValue === 'Custom' ? ['Custom', ...modeOptions] : modeOptions}
        onChange={handleModeChange}
      />
      <StatusSelect
        label="Radius"
        value={String(preferences.radiusKm)}
        options={radiusOptions.map(String)}
        suffix=" km"
        onChange={(value) => onUpdatePreferences({ radiusKm: Number(value) })}
      />
      <StatusSelect
        label="Price"
        value={preferences.priceLevel}
        options={[...priceLevels]}
        onChange={(value) =>
          onUpdatePreferences({ priceLevel: value as Preferences['priceLevel'] })
        }
      />
    </div>
  )
}

function StatusSelect({
  label,
  value,
  options,
  suffix = '',
  onChange,
}: {
  label: string
  value: string
  options: string[]
  suffix?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="rounded-lg bg-secondary px-2 py-2">
      <span className="block text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-0.5 w-full min-w-0 appearance-none truncate bg-transparent text-center text-sm font-bold text-primary outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
            {suffix}
          </option>
        ))}
      </select>
    </label>
  )
}

function SortControls({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (value: SortOption) => void
}) {
  return (
    <section className="px-4 pt-3">
      <div className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-primary">Sort results</p>
          <select
            aria-label="Sort results"
            value={value}
            onChange={(event) => onChange(event.target.value as SortOption)}
            className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm font-semibold text-primary outline-none"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-10 rounded-lg px-2 text-xs font-bold transition ${
                value === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-primary hover:bg-[#ffdea9] hover:text-[#271900]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function EmptyResults({
  query,
  onClear,
  onIncreaseRadius,
  onOpenMaps,
  onTryCafe,
}: {
  query: string
  onClear: () => void
  onIncreaseRadius: () => void
  onOpenMaps: () => void
  onTryCafe: () => void
}) {
  return (
    <section className="px-4 pt-5">
      <div className="rounded-xl border border-border/70 bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary">
          <Search className="size-6 text-primary" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-bold">No matching places</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          {query ? `No picks for "${query}" right now.` : 'No picks available right now.'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onTryCafe} className="rounded-lg">
            Try Cafe
          </Button>
          <Button variant="outline" onClick={onIncreaseRadius} className="rounded-lg">
            Wider Radius
          </Button>
          <Button variant="outline" onClick={onClear} className="rounded-lg">
            Reset
          </Button>
          <Button variant="outline" onClick={onOpenMaps} className="rounded-lg">
            Open Maps
          </Button>
        </div>
      </div>
    </section>
  )
}

function sortRestaurants(restaurants: Restaurant[], sortOption: SortOption) {
  return [...restaurants].sort((first, second) => {
    if (sortOption === 'cheapest') {
      return getPriceRank(first.price) - getPriceRank(second.price)
    }

    if (sortOption === 'rating') {
      return second.rating - first.rating
    }

    if (sortOption === 'group') {
      return getGroupRank(second) - getGroupRank(first)
    }

    return (first.distanceKm ?? 99) - (second.distanceKm ?? 99)
  })
}

function getPriceRank(price: string) {
  return price.replaceAll('-', '').length || 2
}

function getGroupRank(restaurant: Restaurant) {
  const text = [...restaurant.tags, ...restaurant.amenities, restaurant.vibe]
    .join(' ')
    .toLowerCase()

  return Number(text.includes('group')) + Number(text.includes('table'))
}

function getOpenStatusLabel(restaurant: Restaurant) {
  const status = restaurant.openStatus.toLowerCase()
  const tags = restaurant.tags.join(' ').toLowerCase()

  if (status.includes('hours listed')) {
    return 'Hours listed'
  }

  if (status.includes('late') || tags.includes('late night')) {
    return 'Late-night friendly'
  }

  if (status.includes('many choices')) {
    return 'Many choices'
  }

  return 'Check live hours'
}

function QuickDecisionBar({
  onPick,
  onSelectCategory,
}: {
  onPick: () => void
  onSelectCategory: (category: (typeof categories)[number]) => void
}) {
  const cheapCategory =
    categories.find((item) => item.label === 'Cheap Eats') ?? categories[0]
  const cafeCategory =
    categories.find((item) => item.label === 'Cafe') ?? categories[0]
  const lateNightCategory =
    categories.find((item) => item.label === 'Late Night') ?? categories[0]

  const quickModes = [
    { label: 'Pick for us', action: onPick },
    {
      label: 'Cheap',
      action: () => onSelectCategory(cheapCategory),
    },
    {
      label: 'Cafe',
      action: () => onSelectCategory(cafeCategory),
    },
    {
      label: 'Late',
      action: () => onSelectCategory(lateNightCategory),
    },
  ]

  return (
    <section className="px-4 pt-3">
      <div className="grid grid-cols-4 gap-2 rounded-xl border border-border/70 bg-card p-2 shadow-sm">
        {quickModes.map((mode) => (
          <button
            key={mode.label}
            type="button"
            onClick={mode.action}
            className="min-h-12 rounded-lg bg-secondary px-2 text-xs font-bold text-primary transition hover:bg-[#ffdea9] hover:text-[#271900]"
          >
            {mode.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function DragScrollArea({
  ariaLabel,
  children,
  className,
}: {
  ariaLabel?: string
  children: ReactNode
  className: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({
    active: false,
    moved: false,
    scrollLeft: 0,
    startX: 0,
  })

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollRef.current

    if (!scroller || event.pointerType === 'touch') {
      return
    }

    dragState.current = {
      active: true,
      moved: false,
      scrollLeft: scroller.scrollLeft,
      startX: event.clientX,
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const scroller = scrollRef.current

    if (!scroller || !dragState.current.active) {
      return
    }

    const distance = event.clientX - dragState.current.startX

    if (Math.abs(distance) > 12) {
      dragState.current.moved = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
      event.preventDefault()
      scroller.scrollLeft = dragState.current.scrollLeft - distance
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    dragState.current.active = false
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    window.setTimeout(() => {
      dragState.current.moved = false
    }, 120)
  }

  return (
    <div
      ref={scrollRef}
      aria-label={ariaLabel}
      className={className}
      onClickCapture={(event) => {
        if (dragState.current.moved) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {children}
    </div>
  )
}

function CategoryScroller({
  activeCategory,
  onSelectCategory,
}: {
  activeCategory: string
  onSelectCategory: (category: (typeof categories)[number]) => void
}) {
  return (
    <DragScrollArea
      ariaLabel="Food type filters"
      className="flex max-w-full cursor-grab touch-pan-x select-none gap-2 overflow-x-auto pb-1 pr-2 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
        {categories.map((category) => (
          <button
            key={category.label}
            type="button"
            onClick={() => onSelectCategory(category)}
            aria-pressed={activeCategory === category.label}
            className={`min-h-10 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-primary hover:shadow-sm ${
              activeCategory === category.label
                ? 'border-[#ffba27] bg-[#ffdea9] text-[#271900]'
                : 'border-border/70 bg-card text-primary'
            }`}
          >
            {category.label}
          </button>
        ))}
    </DragScrollArea>
  )
}

function SearchView({
  activeCategory,
  foodQuery,
  isLoadingPlaces,
  manualLocation,
  permissionState,
  restaurants,
  savedRestaurantIds,
  sortOption,
  statusLabel,
  onFoodQueryChange,
  onManualLocationChange,
  onOpenMaps,
  onSearchNearby,
  onSelectCategory,
  onSelectRestaurant,
  onSortChange,
  onShare,
  onToggleSaved,
}: {
  activeCategory: string
  foodQuery: string
  isLoadingPlaces: boolean
  manualLocation: string
  permissionState: LocationPermissionState
  restaurants: Restaurant[]
  savedRestaurantIds: Set<string>
  sortOption: SortOption
  statusLabel: string
  onFoodQueryChange: (value: string) => void
  onManualLocationChange: (value: string) => void
  onOpenMaps: (restaurant: Restaurant) => void
  onSearchNearby: () => void
  onSelectCategory: (category: (typeof categories)[number]) => void
  onSelectRestaurant: (restaurant: Restaurant) => void
  onSortChange: (value: SortOption) => void
  onShare: (restaurant: Restaurant) => void
  onToggleSaved: (restaurant: Restaurant) => void
}) {
  const isSearching = permissionState === 'requesting' || isLoadingPlaces

  return (
    <section className="space-y-5 px-4 py-5">
      <PageTitle title="Search Food" subtitle="Find food, cafes, and chill spots" />

      <Card className="rounded-xl border-border/70">
        <CardContent className="space-y-3 p-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search food page"
              value={foodQuery}
              onChange={(event) => onFoodQueryChange(event.target.value)}
              placeholder="Search food, cafe, dessert..."
              className="h-14 rounded-xl border-border/60 bg-background pl-11 text-base"
            />
          </div>
          <CategoryScroller
            activeCategory={activeCategory}
            onSelectCategory={onSelectCategory}
          />
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              aria-label="Search page location"
              value={manualLocation}
              onChange={(event) => onManualLocationChange(event.target.value)}
              placeholder="Type area or use GPS"
              className="h-11 rounded-lg bg-background"
            />
            <Button
              onClick={onSearchNearby}
              disabled={isSearching}
              className="h-11 rounded-lg px-3"
            >
              <LocateFixed className="size-4" aria-hidden="true" />
              {isSearching ? 'Searching' : 'Find'}
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {statusLabel}
            </span>
            <span>{restaurants.length} matches</span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader title="Search Results" />
        <SortControls value={sortOption} onChange={onSortChange} />
        <div className="grid gap-3">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <PopularCard
                key={`${restaurant.id}-search`}
                isSaved={savedRestaurantIds.has(restaurant.id)}
                restaurant={restaurant}
                onOpenMaps={() => onOpenMaps(restaurant)}
                onSelect={() => onSelectRestaurant(restaurant)}
                onShare={() => onShare(restaurant)}
                onToggleSaved={() => onToggleSaved(restaurant)}
              />
            ))
          ) : (
            <div className="rounded-xl border border-border/70 bg-card p-5 text-center text-sm text-muted-foreground">
              No matching food places right now.
            </div>
          )}
        </div>
      </section>
    </section>
  )
}

function SavedView({
  restaurants,
  onBrowse,
  onOpenMaps,
  onRemove,
  onSelectRestaurant,
  onShare,
}: {
  restaurants: Restaurant[]
  onBrowse: () => void
  onOpenMaps: (restaurant: Restaurant) => void
  onRemove: (restaurant: Restaurant) => void
  onSelectRestaurant: (restaurant: Restaurant) => void
  onShare: (restaurant: Restaurant) => void
}) {
  return (
    <section className="space-y-5 px-4 py-5">
      <PageTitle
        title="Saved Places"
        subtitle={`${restaurants.length} ready picks`}
      />
      <div className="grid gap-3">
        {restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <SavedCard
              key={restaurant.id}
              restaurant={restaurant}
              onOpenMaps={() => onOpenMaps(restaurant)}
              onRemove={() => onRemove(restaurant)}
              onSelect={() => onSelectRestaurant(restaurant)}
              onShare={() => onShare(restaurant)}
            />
          ))
        ) : (
          <SavedEmptyCard onBrowse={onBrowse} />
        )}
      </div>
      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle>Shortcut List</CardTitle>
          <CardDescription>
            {restaurants.length > 0
              ? 'Quick food picks for repeat decisions'
              : 'Save restaurants to build your shortcut list'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <button
                key={`${restaurant.id}-shortcut`}
                type="button"
                onClick={() => onOpenMaps(restaurant)}
                className="flex items-center justify-between rounded-lg bg-secondary p-3 text-left"
              >
                <span className="truncate font-semibold">{restaurant.name}</span>
                <Navigation className="size-4 text-primary" aria-hidden="true" />
              </button>
            ))
          ) : (
            <p className="rounded-lg bg-secondary p-3 text-sm text-muted-foreground">
              Your saved places will appear here after you tap a heart.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function SavedEmptyCard({ onBrowse }: { onBrowse: () => void }) {
  return (
    <Card className="rounded-xl border-border/70">
      <CardContent className="p-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary">
          <Bookmark className="size-6 text-primary" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-xl font-bold">No saved places yet</h3>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
          Tap the heart on any restaurant to keep it here for your next food run.
        </p>
        <Button onClick={onBrowse} className="mt-4 rounded-lg">
          Browse food
        </Button>
      </CardContent>
    </Card>
  )
}

function ActivityView({
  activeCategory,
  preferences,
  restaurants,
  statusLabel,
  onSelectRestaurant,
}: {
  activeCategory: string
  preferences: Preferences
  restaurants: Restaurant[]
  statusLabel: string
  onSelectRestaurant: (restaurant: Restaurant) => void
}) {
  const recentPicks = restaurants.slice(0, 3)

  return (
    <section className="space-y-5 px-4 py-5">
      <PageTitle title="Activity" subtitle="Recent food decisions" />
      <div className="grid gap-3">
        <ActivityRow
          icon={<Search className="size-5 text-primary" />}
          title={activeCategory}
          detail={`Mode selected · ${preferences.radiusKm} km · ${preferences.priceLevel}`}
        />
        <ActivityRow
          icon={<MapPin className="size-5 text-primary" />}
          title={statusLabel}
          detail="Location search status"
        />
        <ActivityRow
          icon={<Clock3 className="size-5 text-primary" />}
          title="Live Maps handoff"
          detail="Reviews, directions, and opening hours stay in Google Maps"
        />
      </div>
      <section className="space-y-3">
        <SectionHeader title="Recently Viewed" />
        <div className="grid gap-3">
          {recentPicks.map((restaurant) => (
            <PopularCard
              key={`${restaurant.id}-activity`}
              restaurant={restaurant}
              onSelect={() => onSelectRestaurant(restaurant)}
            />
          ))}
        </div>
      </section>
    </section>
  )
}

function ProfileView({
  preferences,
  statusLabel,
}: {
  preferences: Preferences
  statusLabel: string
}) {
  return (
    <section className="space-y-5 px-4 py-5">
      <PageTitle title="Profile" subtitle="Food finder preferences" />
      <Card className="rounded-xl border-border/70">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary">
            <img src="/pwa-icon.svg" alt="" className="size-12" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">MakanMana</h2>
            <p className="text-sm text-muted-foreground">Mobile food finder</p>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <StatusCard label="Radius" value={`${preferences.radiusKm} km`} />
        <StatusCard label="Price" value={preferences.priceLevel} />
        <StatusCard label="Halal" value={preferences.halalOnly ? 'On' : 'Off'} />
        <StatusCard
          label="Group"
          value={preferences.groupFriendly ? 'Friendly' : 'Any'}
        />
      </div>
      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5 text-primary" aria-hidden="true" />
            App Status
          </CardTitle>
          <CardDescription>{statusLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProfileLine label="GPS history" value="Not stored" />
          <ProfileLine label="Accounts" value="Not required" />
          <ProfileLine label="Restaurant data" value="Google Maps handoff" />
        </CardContent>
      </Card>
    </section>
  )
}

function SettingsView({
  preferences,
  onUpdatePreferences,
}: {
  preferences: Preferences
  onUpdatePreferences: (nextPreferences: Partial<Preferences>) => void
}) {
  return (
    <section className="space-y-5 px-4 py-5">
      <PageTitle title="Settings" subtitle="Adjust your food finder defaults" />

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle>Search Distance</CardTitle>
          <CardDescription>{preferences.radiusKm} km around your area</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={[preferences.radiusKm]}
            min={1}
            max={20}
            step={1}
            onValueChange={([radiusKm]) => onUpdatePreferences({ radiusKm })}
            aria-label="Settings distance range"
          />
          <div className="grid grid-cols-4 gap-2">
            {[1, 3, 5, 10].map((radius) => (
              <Button
                key={radius}
                variant={preferences.radiusKm === radius ? 'default' : 'outline'}
                onClick={() => onUpdatePreferences({ radiusKm: radius })}
                className="rounded-lg"
              >
                {radius} km
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle>Price Range</CardTitle>
          <CardDescription>Default budget level for food searches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 overflow-hidden rounded-lg border bg-card">
            {(['$', '$$', '$$$', '$$$$'] as const).map((price) => (
              <button
                key={price}
                type="button"
                onClick={() => onUpdatePreferences({ priceLevel: price })}
                className={`h-12 border-r text-base font-bold last:border-r-0 ${
                  preferences.priceLevel === price
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground'
                }`}
              >
                {price}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <CardTitle>Food Preferences</CardTitle>
          <CardDescription>Quick filters for your searches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingToggle
            checked={preferences.halalOnly}
            label="Halal"
            onChange={(checked) => onUpdatePreferences({ halalOnly: checked })}
          />
          <SettingToggle
            checked={preferences.groupFriendly}
            label="Group Friendly"
            onChange={(checked) =>
              onUpdatePreferences({ groupFriendly: checked })
            }
          />
        </CardContent>
      </Card>
    </section>
  )
}

function SettingToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
      <span className="font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5"
      />
    </label>
  )
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight text-primary">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function ActivityRow({
  detail,
  icon,
  title,
}: {
  detail: string
  icon: ReactNode
  title: string
}) {
  return (
    <Card className="rounded-xl border-border/70">
      <CardContent className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 p-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-secondary">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-bold">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-xl border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold text-primary">{value}</p>
      </CardContent>
    </Card>
  )
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-primary">{value}</span>
    </div>
  )
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex min-w-0 items-end justify-between gap-3 pr-4">
      <h2 className="min-w-0 truncate text-2xl font-bold tracking-tight">{title}</h2>
      {action ? (
        <button type="button" className="shrink-0 text-sm font-bold text-primary">
          {action}
        </button>
      ) : null}
    </div>
  )
}

function RecommendedSkeleton() {
  return (
    <div className="w-72 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="h-40 animate-pulse bg-secondary" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-44 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
        <div className="flex gap-3">
          <div className="h-4 w-16 animate-pulse rounded bg-secondary" />
          <div className="h-4 w-24 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    </div>
  )
}

function FoodImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[linear-gradient(135deg,#ffdea9_0%,#f7fafa_45%,#9ff0fb_100%)] ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(150deg,rgba(255,183,2,0.35)_0%,transparent_34%,rgba(0,83,91,0.14)_70%,transparent_100%)]" />
      <img
        src={src}
        alt={alt}
        loading="eager"
        onError={(event) => {
          event.currentTarget.style.display = 'none'
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )
}

function RecommendedCard({
  isSaved,
  restaurant,
  onOpenMaps,
  onSelect,
  onShare,
  onToggleSaved,
}: {
  isSaved: boolean
  restaurant: Restaurant
  onOpenMaps: () => void
  onSelect: () => void
  onShare: () => void
  onToggleSaved: () => void
}) {
  return (
    <article className="w-72 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card text-left shadow-sm transition hover:border-primary hover:shadow-md">
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="relative h-40">
          <FoodImage
            src={restaurant.imageUrl}
            alt={`${restaurant.name} preview`}
            className="h-full w-full"
          />
          <span className="absolute left-3 top-3 rounded-lg bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow-sm">
            {restaurant.source === 'live' ? 'Live nearby' : 'Demo spot'}
          </span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-card/95 px-2 py-1 text-sm font-semibold shadow-sm">
            <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
            {restaurant.rating}
          </span>
        </div>
        <div className="space-y-3 p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold">{restaurant.name}</h3>
              <p className="text-sm text-muted-foreground">
                {restaurant.cuisine} · {restaurant.price}
              </p>
            </div>
            <Heart
              className={`size-6 ${
                isSaved ? 'fill-primary text-primary' : 'text-border'
              }`}
              aria-hidden="true"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <MiniStat label="Distance" value={`${restaurant.distanceKm ?? '-'} km`} />
            <MiniStat label="Price" value={restaurant.price} />
            <MiniStat label="Time" value={restaurant.travelTime} />
          </div>
          <div className="rounded-lg border border-border/40 bg-secondary p-2 text-sm text-muted-foreground">
            <span className="font-bold text-primary">Popular:</span>{' '}
            {restaurant.menuHighlights.slice(0, 2).join(', ')}
          </div>
          <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {restaurant.vibe}
          </p>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <Button onClick={onSelect} className="h-10 rounded-lg">
          View
        </Button>
        <Button
          variant={isSaved ? 'default' : 'outline'}
          onClick={onToggleSaved}
          aria-label={`${isSaved ? 'Unsave' : 'Save'} ${restaurant.name}`}
          className="h-10 rounded-lg"
        >
          <Heart
            className={`size-4 ${isSaved ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
          {isSaved ? 'Saved' : 'Save'}
        </Button>
        <Button
          variant="outline"
          onClick={onOpenMaps}
          aria-label={`Open ${restaurant.name} in Maps`}
          className="h-10 rounded-lg"
        >
          <Navigation className="size-4" aria-hidden="true" />
          Maps
        </Button>
        <Button
          variant="outline"
          onClick={onShare}
          aria-label={`Share ${restaurant.name}`}
          className="h-10 rounded-lg"
        >
          <Share2 className="size-4" aria-hidden="true" />
          Share
        </Button>
      </div>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary px-2 py-2">
      <p className="truncate text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-bold text-primary">{value}</p>
    </div>
  )
}

function PopularCard({
  isSaved = false,
  restaurant,
  onOpenMaps,
  onSelect,
  onShare,
  onToggleSaved,
}: {
  isSaved?: boolean
  restaurant: Restaurant
  onOpenMaps?: () => void
  onSelect: () => void
  onShare?: () => void
  onToggleSaved?: () => void
}) {
  return (
    <article className="rounded-xl border border-border/50 bg-card shadow-sm transition hover:border-primary hover:shadow-md">
      <button
        type="button"
        onClick={onSelect}
        className="grid w-full min-w-0 cursor-pointer grid-cols-[104px_minmax(0,1fr)] gap-4 p-3 text-left sm:grid-cols-[112px_minmax(0,1fr)]"
      >
        <FoodImage
          src={restaurant.imageUrl}
          alt={`${restaurant.name} food`}
          className="size-[104px] rounded-lg sm:size-28"
        />
        <div className="min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold">{restaurant.name}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {restaurant.cuisine} · {restaurant.price}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm">
              <Star className="size-4 text-accent" aria-hidden="true" />
              {restaurant.rating}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {restaurant.vibe}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            <Badge variant="secondary" className="rounded-md">
              {restaurant.tags[0] ?? 'Popular'}
            </Badge>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-4" aria-hidden="true" />
              {restaurant.distanceKm ?? '-'} km
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#b07800]">
              <Clock3 className="size-4" aria-hidden="true" />
              {getOpenStatusLabel(restaurant)}
            </span>
          </div>
        </div>
      </button>
      {onOpenMaps || onShare || onToggleSaved ? (
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          <Button onClick={onSelect} className="h-10 rounded-lg">
            View details
          </Button>
          {onToggleSaved ? (
            <Button
              variant={isSaved ? 'default' : 'outline'}
              onClick={onToggleSaved}
              aria-label={`${isSaved ? 'Unsave' : 'Save'} ${restaurant.name}`}
              className="h-10 rounded-lg"
            >
              <Heart
                className={`size-4 ${isSaved ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          ) : null}
          {onOpenMaps ? (
            <Button
              variant="outline"
              onClick={onOpenMaps}
              aria-label={`Open ${restaurant.name} in Maps`}
              className="h-10 rounded-lg"
            >
              <Navigation className="size-4" aria-hidden="true" />
              Maps
            </Button>
          ) : null}
          {onShare ? (
            <Button
              variant="outline"
              onClick={onShare}
              aria-label={`Share ${restaurant.name}`}
              className="h-10 rounded-lg"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Share
            </Button>
          ) : null}
      </div>
      ) : null}
    </article>
  )
}

function SavedCard({
  restaurant,
  onOpenMaps,
  onRemove,
  onSelect,
  onShare,
}: {
  restaurant: Restaurant
  onOpenMaps: () => void
  onRemove: () => void
  onSelect: () => void
  onShare: () => void
}) {
  return (
    <Card className="rounded-xl">
      <CardContent className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)]">
        <div className="relative">
          <FoodImage
            src={restaurant.imageUrl}
            alt={`${restaurant.name} saved`}
            className="size-[88px] rounded-lg sm:size-24"
          />
          <span className="absolute right-2 top-2 rounded-full bg-card p-2 shadow-sm">
            <Bookmark className="size-4 text-[#7d5800]" aria-hidden="true" />
          </span>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold">{restaurant.name}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {restaurant.cuisine} · {restaurant.distanceKm} km · {restaurant.rating}
              </p>
            </div>
            <Badge variant="accent" className="rounded-full">
              {getOpenStatusLabel(restaurant)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={onSelect} className="rounded-lg">
              View
            </Button>
            <Button
              variant="outline"
              onClick={onOpenMaps}
              aria-label={`Open ${restaurant.name} in Maps`}
              className="rounded-lg"
            >
              <Navigation className="size-4" aria-hidden="true" />
              Maps
            </Button>
            <Button
              variant="outline"
              onClick={onShare}
              aria-label={`Share ${restaurant.name}`}
              className="rounded-lg"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={onRemove}
              aria-label={`Remove ${restaurant.name} from saved`}
              className="rounded-lg"
            >
              <Heart className="size-4 fill-primary text-primary" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RestaurantDetailSheet({
  isSaved,
  restaurant,
  onClose,
  onOpenMaps,
  onCopy,
  onShare,
  onToggleSaved,
}: {
  isSaved: boolean
  restaurant: Restaurant | null
  onClose: () => void
  onOpenMaps: (restaurant: Restaurant) => void
  onCopy: (restaurant: Restaurant) => void
  onShare: (restaurant: Restaurant) => void
  onToggleSaved: (restaurant: Restaurant) => void
}) {
  return (
    <Sheet open={restaurant !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="max-h-[94svh] overflow-y-auto px-0 pb-28">
        {restaurant ? (
          <div className="space-y-6 px-6">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-border" />
            <div className="relative overflow-hidden rounded-xl">
              <FoodImage
                src={restaurant.imageUrl}
                alt={`${restaurant.name} detail`}
                className="h-56 w-full"
              />
            </div>

            <SheetHeader className="mb-0 pr-0">
              <SheetTitle className="text-3xl font-bold">{restaurant.name}</SheetTitle>
              <SheetDescription className="text-base">
                {restaurant.cuisine} · {restaurant.vibe}
              </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-3 gap-2">
              <DecisionStat label="Rating" value={String(restaurant.rating)} />
              <DecisionStat label="Price" value={restaurant.price} />
              <DecisionStat
                label="Distance"
                value={`${restaurant.distanceKm ?? '-'} km`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-12 rounded-lg"
                onClick={() => onOpenMaps(restaurant)}
              >
                <Navigation className="size-5" aria-hidden="true" />
                Go Now
              </Button>
              <Button
                variant={isSaved ? 'default' : 'outline'}
                onClick={() => onToggleSaved(restaurant)}
                aria-label={`${isSaved ? 'Unsave' : 'Save'} ${restaurant.name}`}
                className="h-12 rounded-lg"
              >
                <Heart
                  className={`size-5 ${isSaved ? 'fill-current' : ''}`}
                  aria-hidden="true"
                />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onShare(restaurant)}
                aria-label={`Share ${restaurant.name}`}
                className="h-12 rounded-lg"
              >
                <Share2 className="size-5" aria-hidden="true" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={() => onCopy(restaurant)}
                aria-label={`Copy ${restaurant.name} link`}
                className="h-12 rounded-lg"
              >
                <Copy className="size-5" aria-hidden="true" />
                Copy
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="accent" className="rounded-full px-3 py-2">
                <Clock3 className="size-4" aria-hidden="true" />
                {getOpenStatusLabel(restaurant)}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-2">
                {restaurant.price}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-2">
                <MapPin className="size-4" aria-hidden="true" />
                {restaurant.distanceKm ?? '-'} km
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-2">
                <Star className="size-4" aria-hidden="true" />
                {restaurant.rating}
              </Badge>
            </div>

            <section className="space-y-3">
              <h3 className="text-xl font-bold">Why This Place</h3>
              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <p className="text-base leading-6 text-foreground">
                  {restaurant.vibe}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {restaurant.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-md">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-5 text-muted-foreground">
                  {restaurant.source === 'live'
                    ? 'Loaded from nearby map data. Open Maps for live reviews, directions, and exact hours.'
                    : 'Real demo listing for app preview. Open Maps for live reviews, directions, and exact hours.'}
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xl font-bold">What's Inside</h3>
              <div className="grid grid-cols-2 gap-2">
                {restaurant.menuHighlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-xl bg-[#9ff0fb] px-4 py-3 text-sm font-bold text-[#001f23]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xl font-bold">Place Details</h3>
              <div className="divide-y rounded-xl border bg-card">
                <DetailRow icon={<MapPin className="size-6 text-primary" />} text={restaurant.address} />
                <DetailRow icon={<Clock3 className="size-6 text-muted-foreground" />} text={restaurant.hours} />
                <DetailRow
                  icon={<Filter className="size-6 text-muted-foreground" />}
                  text={restaurant.amenities.join(', ')}
                />
              </div>
            </section>

            <Button
              variant="outline"
              className="h-12 w-full rounded-lg"
              onClick={() => onShare(restaurant)}
            >
              <Share2 className="size-4" aria-hidden="true" />
              Share food plan
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function DecisionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary px-3 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold text-primary">{value}</p>
    </div>
  )
}

function DetailRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="grid grid-cols-[32px_1fr] gap-4 p-4 text-base">
      {icon}
      <p className="leading-6">{text}</p>
    </div>
  )
}

function NavItem({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} tab`}
      className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-sm transition duration-200 hover:-translate-y-0.5 hover:bg-card hover:shadow-[0_10px_24px_rgba(0,83,91,0.18)] ${
        active
          ? 'bg-[#dceff1] text-primary shadow-[0_8px_18px_rgba(0,83,91,0.14)]'
          : 'text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default App
