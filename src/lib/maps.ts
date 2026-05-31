export const searchIntents = [
  {
    id: 'open-nearby',
    label: 'Open nearby',
    query: 'food open now',
    tone: 'Fast picks around you',
  },
  {
    id: 'food-after-training',
    label: 'Food after training',
    query: 'food after training open now',
    tone: 'Proper meal first',
  },
  {
    id: 'chill-place',
    label: 'Chill place',
    query: 'chill place open now',
    tone: 'Sit, talk, recover',
  },
  {
    id: 'cheap-food',
    label: 'Cheap food',
    query: 'cheap food open now',
    tone: 'Budget friendly',
  },
  {
    id: 'drinks-cafe',
    label: 'Drinks/cafe',
    query: 'drinks cafe open now',
    tone: 'Light bites and drinks',
  },
  {
    id: 'late-night-food',
    label: 'Late-night food',
    query: 'late-night food open now',
    tone: 'Still serving',
  },
] as const

export type SearchIntentId = (typeof searchIntents)[number]['id']

export type Coordinates = {
  lat: number
  lng: number
}

export type LocationPermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'

type BuildGoogleMapsSearchUrlOptions = {
  intent: SearchIntentId
  coordinates: Coordinates | null
  manualLocation: string
  radiusKm: number
}

const DEFAULT_INTENT = searchIntents[0]

export function getSearchIntent(intentId: SearchIntentId) {
  return searchIntents.find((intent) => intent.id === intentId) ?? DEFAULT_INTENT
}

export function buildGoogleMapsSearchUrl({
  intent,
  coordinates,
  manualLocation,
  radiusKm,
}: BuildGoogleMapsSearchUrlOptions) {
  const selectedIntent = getSearchIntent(intent)
  const safeRadius = Math.max(1, Math.round(radiusKm))
  const trimmedLocation = manualLocation.trim()
  const queryParts = [`${selectedIntent.query} within ${safeRadius}km`]

  if (!coordinates && trimmedLocation) {
    queryParts.push(`near ${trimmedLocation}`)
  }

  const query = queryParts.join(' ')
  const encodedQuery = encodeURIComponent(query).replaceAll('%20', '+')
  const coordinateSuffix = coordinates
    ? `/@${coordinates.lat},${coordinates.lng},15z`
    : ''

  return `https://www.google.com/maps/search/${encodedQuery}${coordinateSuffix}`
}
