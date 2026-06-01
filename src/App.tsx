import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bookmark,
  Clock3,
  Compass,
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
  X,
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

const preferenceKey = 'wheretoeat.preferences'

type Preferences = {
  radiusKm: number
  priceLevel: '$' | '$$' | '$$$' | '$$$$'
  halalOnly: boolean
  groupFriendly: boolean
}

const defaultPreferences: Preferences = {
  radiusKm: 3,
  priceLevel: '$$',
  halalOnly: false,
  groupFriendly: true,
}

const categories = [
  'Open Now',
  'Halal',
  'Cafe',
  'Cheap Eats',
  'Group Friendly',
  'Dessert',
  'Late Night',
]

const cuisineFilters = ['Malay', 'Chinese', 'Indian', 'Western', 'Japanese', 'Korean', 'Thai']

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

function App() {
  const [preferences, setPreferences] = useState<Preferences>(() => readPreferences())
  const [foodQuery, setFoodQuery] = useState('')
  const [manualLocation, setManualLocation] = useState('')
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>('idle')
  const [restaurants, setRestaurants] = useState<Restaurant[]>(sampleRestaurants)
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(
    null,
  )

  useEffect(() => {
    window.localStorage.setItem(preferenceKey, JSON.stringify(preferences))
  }, [preferences])

  const visibleRestaurants = useMemo(
    () => filterRestaurants(restaurants, foodQuery),
    [foodQuery, restaurants],
  )

  const recommendedRestaurants = visibleRestaurants.slice(0, 4)
  const popularRestaurants = visibleRestaurants.slice(0, 6)
  const savedRestaurants = sampleRestaurants.slice(0, 3)

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

    if (navigator.share) {
      await navigator.share({
        title: restaurant.name,
        text: `Food idea: ${restaurant.name}`,
        url,
      })
      return
    }

    await navigator.clipboard.writeText(url)
    toast.success('Restaurant link copied')
  }

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-xl overflow-x-hidden bg-background pb-28 text-foreground shadow-[0_0_0_1px_rgba(190,200,202,0.35)]">
      <header className="sticky top-0 z-30 w-full overflow-hidden border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Food discovery">
            <img src="/pwa-icon.svg" alt="" className="size-8" />
          </Button>
          <h1 className="truncate text-center text-3xl font-bold tracking-tight text-primary">
            WhereToEat
          </h1>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="size-6" aria-hidden="true" />
          </Button>
        </div>
      </header>

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
              onChange={(event) => setFoodQuery(event.target.value)}
              placeholder="Search food, cafe, restaurant..."
              className="h-14 rounded-xl border-border/60 bg-card pl-11 text-base shadow-sm"
            />
          </div>

          <Sheet>
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
                      {[1, 3, 5, 10].map((radius) => (
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
                    {(['$', '$$', '$$$', '$$$$'] as const).map((price) => (
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
                      <Badge key={cuisine} variant="outline" className="rounded-full px-4 py-2">
                        {cuisine}
                      </Badge>
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

                <Button className="h-12 w-full rounded-lg">Show Results</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category, index) => (
            <button
              key={category}
              type="button"
              onClick={() => setFoodQuery(index === 0 ? '' : category)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
                index === 0
                  ? 'border-[#ffba27] bg-[#ffdea9] text-[#271900]'
                  : 'border-border/70 bg-card text-primary'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="space-y-2 overflow-hidden rounded-xl border bg-card p-3 shadow-sm">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Input
              aria-label="Location fallback"
              value={manualLocation}
              onChange={(event) => {
                setManualLocation(event.target.value)
                setUserLocation(null)
              }}
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

      <section className="mt-2 space-y-3 overflow-hidden pl-4">
        <SectionHeader title="Recommended Nearby" action="See All" />
        <div className="flex w-full max-w-full gap-4 overflow-x-auto pb-4 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recommendedRestaurants.map((restaurant) => (
            <RecommendedCard
              key={restaurant.id}
              restaurant={restaurant}
              onSelect={() => setSelectedRestaurant(restaurant)}
            />
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-3 px-4">
        <SectionHeader title="Popular Around You" />
        <div className="grid gap-3">
          {popularRestaurants.map((restaurant) => (
            <PopularCard
              key={restaurant.id}
              restaurant={restaurant}
              onSelect={() => setSelectedRestaurant(restaurant)}
            />
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-3 px-4">
        <SectionHeader title="Saved Places" action="Open saved" />
        <div className="grid gap-3">
          {savedRestaurants.map((restaurant) => (
            <SavedCard
              key={restaurant.id}
              restaurant={restaurant}
              onOpenMaps={() => openRestaurantMaps(restaurant)}
              onShare={() => void shareRestaurant(restaurant)}
            />
          ))}
        </div>
      </section>

      <section className="mt-6 px-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Quick Maps search</CardTitle>
            <CardDescription className="break-words">{quickMapsUrl}</CardDescription>
          </CardHeader>
          <CardContent>
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

      <RestaurantDetailSheet
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
        onOpenMaps={openRestaurantMaps}
        onCopy={(restaurant) => void copyRestaurantLink(restaurant)}
      />

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl border-t border-border/70 bg-card/95 px-4 py-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          <NavItem active icon={<Compass className="size-6" />} label="Discover" />
          <NavItem icon={<Bookmark className="size-6" />} label="Saved" />
          <NavItem icon={<History className="size-6" />} label="Activity" />
          <NavItem icon={<UserRound className="size-6" />} label="Profile" />
        </div>
      </nav>

      <Toaster richColors position="bottom-center" />
    </main>
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
  restaurant,
  onSelect,
}: {
  restaurant: Restaurant
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-72 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card text-left shadow-sm transition hover:border-primary"
    >
      <div className="relative h-40">
        <FoodImage
          src={restaurant.imageUrl}
          alt={`${restaurant.name} preview`}
          className="h-full w-full"
        />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-card/95 px-2 py-1 text-sm font-semibold shadow-sm">
          <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
          {restaurant.rating}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-bold">{restaurant.name}</h3>
            <p className="text-sm text-muted-foreground">
              {restaurant.cuisine} · {restaurant.price}
            </p>
          </div>
          <Heart className="size-6 text-border" aria-hidden="true" />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden="true" />
            {restaurant.distanceKm ?? '-'} km
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[#b07800]">
            <Clock3 className="size-4" aria-hidden="true" />
            {restaurant.openStatus}
          </span>
        </div>
        <div className="rounded-lg border border-border/40 bg-secondary p-2 text-sm text-muted-foreground">
          <span className="font-bold text-primary">Popular:</span>{' '}
          {restaurant.menuHighlights.slice(0, 2).join(', ')}
        </div>
      </div>
    </button>
  )
}

function PopularCard({
  restaurant,
  onSelect,
}: {
  restaurant: Restaurant
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full min-w-0 grid-cols-[104px_minmax(0,1fr)] gap-4 rounded-xl border border-border/50 bg-card p-3 text-left shadow-sm transition hover:border-primary sm:grid-cols-[112px_minmax(0,1fr)]"
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
        <div className="flex items-center justify-between gap-2 pt-3 text-sm">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-4" aria-hidden="true" />
            {restaurant.travelTime}
          </span>
          <Badge variant="secondary" className="rounded-md">
            {restaurant.tags[0] ?? 'Popular'}
          </Badge>
        </div>
      </div>
    </button>
  )
}

function SavedCard({
  restaurant,
  onOpenMaps,
  onShare,
}: {
  restaurant: Restaurant
  onOpenMaps: () => void
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
              {restaurant.openStatus}
            </Badge>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button onClick={onOpenMaps} className="rounded-lg">
              <Navigation className="size-4" aria-hidden="true" />
              Open Maps
            </Button>
            <Button variant="outline" size="icon" onClick={onShare} aria-label="Share">
              <Share2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RestaurantDetailSheet({
  restaurant,
  onClose,
  onOpenMaps,
  onCopy,
}: {
  restaurant: Restaurant | null
  onClose: () => void
  onOpenMaps: (restaurant: Restaurant) => void
  onCopy: (restaurant: Restaurant) => void
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
              <Button
                variant="secondary"
                size="icon"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-full bg-card/90"
                aria-label="Close"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>

            <SheetHeader className="mb-0 pr-0">
              <SheetTitle className="text-3xl font-bold">{restaurant.name}</SheetTitle>
              <SheetDescription className="text-base">
                {restaurant.cuisine} · {restaurant.vibe}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap gap-2">
              <Badge variant="accent" className="rounded-full px-3 py-2">
                <Clock3 className="size-4" aria-hidden="true" />
                {restaurant.openStatus}
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
              <h3 className="text-xl font-bold">What's Inside</h3>
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {restaurant.menuHighlights.map((item) => (
                  <span
                    key={item}
                    className="shrink-0 rounded-xl bg-[#9ff0fb] px-4 py-3 text-sm font-bold text-[#001f23]"
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

            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Button
                variant="outline"
                className="h-14 rounded-lg px-5"
                onClick={() => onCopy(restaurant)}
              >
                Copy Link
              </Button>
              <Button
                className="h-14 rounded-lg"
                onClick={() => onOpenMaps(restaurant)}
              >
                <Navigation className="size-5" aria-hidden="true" />
                Open Maps
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
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
  active = false,
}: {
  icon: ReactNode
  label: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-sm ${
        active ? 'bg-[#dceff1] text-primary' : 'text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default App
