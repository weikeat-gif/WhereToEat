import { useEffect, useMemo, useState } from 'react'
import {
  Clock3,
  Coffee,
  Copy,
  Filter,
  Info,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Share2,
  Star,
  Utensils,
} from 'lucide-react'
import { toast, Toaster } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  buildGoogleMapsSearchUrl,
  getSearchIntent,
  searchIntents,
  type Coordinates,
  type LocationPermissionState,
  type SearchIntentId,
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
  searchIntent: SearchIntentId
  radiusKm: number
}

const defaultPreferences: Preferences = {
  searchIntent: 'open-nearby',
  radiusKm: 3,
}

function readPreferences(): Preferences {
  try {
    const stored = window.localStorage.getItem(preferenceKey)
    if (!stored) {
      return defaultPreferences
    }

    const parsed = JSON.parse(stored) as Partial<Preferences>
    const isKnownIntent = searchIntents.some(
      (intent) => intent.id === parsed.searchIntent,
    )

    return {
      searchIntent: isKnownIntent ? parsed.searchIntent! : defaultPreferences.searchIntent,
      radiusKm:
        typeof parsed.radiusKm === 'number'
          ? Math.min(10, Math.max(1, Math.round(parsed.radiusKm)))
          : defaultPreferences.radiusKm,
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
  const [mapsUrl, setMapsUrl] = useState('')
  const [restaurants, setRestaurants] = useState<Restaurant[]>(sampleRestaurants)
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(
    null,
  )

  useEffect(() => {
    window.localStorage.setItem(preferenceKey, JSON.stringify(preferences))
  }, [preferences])

  const selectedIntent = getSearchIntent(preferences.searchIntent)
  const visibleRestaurants = useMemo(
    () => filterRestaurants(restaurants, foodQuery),
    [foodQuery, restaurants],
  )

  const previewUrl = useMemo(
    () =>
      buildGoogleMapsSearchUrl({
        intent: preferences.searchIntent,
        coordinates: userLocation,
        manualLocation,
        radiusKm: preferences.radiusKm,
      }),
    [manualLocation, preferences.radiusKm, preferences.searchIntent, userLocation],
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

  function setGeneratedUrl(coordinates: Coordinates | null = userLocation) {
    const url = buildGoogleMapsSearchUrl({
      intent: preferences.searchIntent,
      coordinates,
      manualLocation,
      radiusKm: preferences.radiusKm,
    })
    setMapsUrl(url)
    return url
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

  function findNearby() {
    if (manualLocation.trim()) {
      setPermissionState((current) => (current === 'requesting' ? 'idle' : current))
      setGeneratedUrl(null)
      void loadRestaurantResults(null)
      return
    }

    if (!('geolocation' in navigator)) {
      setPermissionState('unavailable')
      setGeneratedUrl(null)
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
        setGeneratedUrl(coordinates)
        void loadRestaurantResults(coordinates)
      },
      () => {
        setUserLocation(null)
        setPermissionState('denied')
        setGeneratedUrl(null)
        void loadRestaurantResults(null)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    )
  }

  function openMaps() {
    const url = mapsUrl || previewUrl
    setMapsUrl(url)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function shareMapsLink() {
    const url = mapsUrl || previewUrl
    setMapsUrl(url)

    if (navigator.share) {
      await navigator.share({
        title: 'WhereToEat',
        text: `Team food idea: ${selectedIntent.label}`,
        url,
      })
      return
    }

    await navigator.clipboard.writeText(url)
    toast.success('Maps link copied')
  }

  async function copyMapsLink() {
    const url = mapsUrl || previewUrl
    setMapsUrl(url)
    await navigator.clipboard.writeText(url)
    toast.success('Maps link copied')
  }

  function openRestaurantMaps(restaurant: Restaurant) {
    window.open(
      buildGoogleMapsRestaurantUrl(restaurant),
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:py-6">
      <section className="flex items-center justify-between gap-3 rounded-lg border bg-card/90 p-3 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">WhereToEat</p>
          <h1 className="text-2xl font-bold leading-tight text-foreground">
            Pick food after training
          </h1>
        </div>
        <Badge variant={permissionState === 'granted' ? 'default' : 'secondary'}>
          <MapPin className="size-3.5" aria-hidden="true" />
          {statusLabel}
        </Badge>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Open now
            </Badge>
            <Badge variant="outline">
              <Coffee className="size-3.5" aria-hidden="true" />
              Chill
            </Badge>
            <Badge variant="outline">
              <Utensils className="size-3.5" aria-hidden="true" />
              After training
            </Badge>
          </div>
          <div>
            <CardTitle>Search nearby food</CardTitle>
            <CardDescription>
              {selectedIntent.tone} within {preferences.radiusKm} km, then pick from
              a list.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="food-query" className="text-sm font-semibold text-foreground">
              What are you craving?
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="food-query"
                value={foodQuery}
                onChange={(event) => setFoodQuery(event.target.value)}
                placeholder="Try nasi, cafe, coffee, halal, cheap..."
                className="pl-9"
              />
            </div>
          </div>

          <ToggleGroup
            type="single"
            value={preferences.searchIntent}
            onValueChange={(value) => {
              if (value) {
                updatePreferences({ searchIntent: value as SearchIntentId })
              }
            }}
            className="grid-cols-2"
            aria-label="Search modes"
          >
            {searchIntents.map((intent) => (
              <ToggleGroupItem key={intent.id} value={intent.id}>
                <span className="block leading-5">{intent.label}</span>
                <span className="block text-xs font-medium opacity-75">
                  {intent.tone}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <div className="space-y-2">
            <label
              htmlFor="manual-location"
              className="text-sm font-semibold text-foreground"
            >
              Location fallback
            </label>
            <Input
              id="manual-location"
              value={manualLocation}
              onChange={(event) => {
                setManualLocation(event.target.value)
                setUserLocation(null)
                setMapsUrl('')
              }}
              placeholder="Training venue or area"
              autoComplete="street-address"
            />
          </div>
        </CardContent>
        <CardFooter className="grid grid-cols-[1fr_auto]">
          <Button
            size="lg"
            onClick={findNearby}
            disabled={permissionState === 'requesting' || isLoadingPlaces}
            className="w-full"
          >
            <LocateFixed className="size-5" aria-hidden="true" />
            {permissionState === 'requesting' || isLoadingPlaces
              ? 'Searching...'
              : 'Search nearby food'}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Filters">
                <Filter className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Search range</SheetTitle>
                <SheetDescription>
                  {preferences.radiusKm} km around the current spot.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5">
                <Slider
                  value={[preferences.radiusKm]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([radiusKm]) => updatePreferences({ radiusKm })}
                  aria-label="Distance range"
                />
                <div className="grid grid-cols-5 text-center text-xs font-semibold text-muted-foreground">
                  <span>1</span>
                  <span>3</span>
                  <span>5</span>
                  <span>8</span>
                  <span>10</span>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Food options</CardTitle>
              <CardDescription>
                {visibleRestaurants.length} places match your search.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <Star className="size-3.5" aria-hidden="true" />
              Select one
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {visibleRestaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              type="button"
              onClick={() => setSelectedRestaurant(restaurant)}
              className="rounded-lg border bg-background p-3 text-left shadow-sm transition-colors hover:border-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold leading-6 text-foreground">
                    {restaurant.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                </div>
                <Badge variant={restaurant.source === 'live' ? 'default' : 'outline'}>
                  {restaurant.source === 'live' ? 'Live' : 'Sample'}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="accent">{restaurant.openStatus}</Badge>
                <Badge variant="outline">{restaurant.price}</Badge>
                {restaurant.distanceKm !== undefined ? (
                  <Badge variant="outline">{restaurant.distanceKm} km</Badge>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground">
                {restaurant.vibe}
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                Inside: {restaurant.menuHighlights.join(', ')}
              </p>
            </button>
          ))}
          {visibleRestaurants.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-center">
              <p className="font-semibold text-foreground">No matching places yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a broader search like food, cafe, rice, or drinks.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Maps search</CardTitle>
          <CardDescription className="break-words">
            {mapsUrl || previewUrl}
          </CardDescription>
        </CardHeader>
        <CardFooter className="grid grid-cols-3">
          <Button onClick={openMaps} className="col-span-2">
            <Navigation className="size-4" aria-hidden="true" />
            Open Maps
          </Button>
          <Button variant="outline" onClick={shareMapsLink} aria-label="Share link">
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
        </CardFooter>
        <CardContent>
          <Button variant="ghost" className="w-full" onClick={copyMapsLink}>
            <Copy className="size-4" aria-hidden="true" />
            Copy link
          </Button>
        </CardContent>
      </Card>

      <Sheet
        open={selectedRestaurant !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRestaurant(null)
          }
        }}
      >
        <SheetContent className="max-h-[88svh] overflow-y-auto">
          {selectedRestaurant ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedRestaurant.name}</SheetTitle>
                <SheetDescription>
                  {selectedRestaurant.cuisine} · {selectedRestaurant.vibe}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="accent">{selectedRestaurant.openStatus}</Badge>
                  <Badge variant="outline">{selectedRestaurant.price}</Badge>
                  {selectedRestaurant.distanceKm !== undefined ? (
                    <Badge variant="outline">
                      {selectedRestaurant.distanceKm} km away
                    </Badge>
                  ) : null}
                </div>

                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Utensils className="size-4" aria-hidden="true" />
                    What is inside
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRestaurant.menuHighlights.map((item) => (
                      <div
                        key={item}
                        className="rounded-md border bg-background px-3 py-2 text-sm font-semibold"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Info className="size-4" aria-hidden="true" />
                    Place details
                  </h3>
                  <div className="rounded-lg border bg-background p-3 text-sm leading-6">
                    <p>
                      <span className="font-semibold">Address:</span>{' '}
                      {selectedRestaurant.address}
                    </p>
                    <p>
                      <span className="font-semibold">Hours:</span>{' '}
                      {selectedRestaurant.hours}
                    </p>
                    <p>
                      <span className="font-semibold">Amenities:</span>{' '}
                      {selectedRestaurant.amenities.join(', ')}
                    </p>
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => openRestaurantMaps(selectedRestaurant)}>
                    <Navigation className="size-4" aria-hidden="true" />
                    Open Maps
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        buildGoogleMapsRestaurantUrl(selectedRestaurant),
                      )
                      toast.success('Restaurant link copied')
                    }}
                  >
                    <Copy className="size-4" aria-hidden="true" />
                    Copy
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <p className="pb-2 text-center text-xs leading-5 text-muted-foreground">
        Live nearby list uses OpenStreetMap data when location is allowed. Google
        Maps handles directions, latest photos, and full reviews.
      </p>
      <Toaster richColors position="bottom-center" />
    </main>
  )
}

export default App
