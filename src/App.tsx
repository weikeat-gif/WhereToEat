import { useEffect, useMemo, useState } from 'react'
import {
  Clock3,
  Coffee,
  Copy,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  Share2,
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
  const [manualLocation, setManualLocation] = useState('')
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>('idle')
  const [mapsUrl, setMapsUrl] = useState('')

  useEffect(() => {
    window.localStorage.setItem(preferenceKey, JSON.stringify(preferences))
  }, [preferences])

  const selectedIntent = getSearchIntent(preferences.searchIntent)

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

  function findNearby() {
    if (manualLocation.trim()) {
      setPermissionState((current) => (current === 'requesting' ? 'idle' : current))
      setGeneratedUrl(null)
      return
    }

    if (!('geolocation' in navigator)) {
      setPermissionState('unavailable')
      setGeneratedUrl(null)
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
      },
      () => {
        setUserLocation(null)
        setPermissionState('denied')
        setGeneratedUrl(null)
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

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-4 px-4 py-4 sm:py-6">
      <section className="flex items-center justify-between gap-3 rounded-lg border bg-card/90 p-3 shadow-sm backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">WhereToEat</p>
          <h1 className="text-2xl font-bold leading-tight text-foreground">
            Open food near the team
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
            <CardTitle>Find a spot</CardTitle>
            <CardDescription>
              {selectedIntent.tone} within {preferences.radiusKm} km.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
            disabled={permissionState === 'requesting'}
            className="w-full"
          >
            <LocateFixed className="size-5" aria-hidden="true" />
            {permissionState === 'requesting' ? 'Finding...' : 'Find nearby'}
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
          <CardTitle>Maps link</CardTitle>
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

      <p className="pb-2 text-center text-xs leading-5 text-muted-foreground">
        No login. No saved GPS history. Google Maps handles live shop details.
      </p>
      <Toaster richColors position="bottom-center" />
    </main>
  )
}

export default App
