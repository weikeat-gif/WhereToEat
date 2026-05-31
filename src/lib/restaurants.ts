import { type Coordinates } from './maps'

export type Restaurant = {
  id: string
  name: string
  cuisine: string
  source: 'live' | 'sample'
  openStatus: string
  price: string
  vibe: string
  address: string
  hours: string
  lat: number
  lng: number
  distanceKm?: number
  menuHighlights: string[]
  amenities: string[]
  tags: string[]
}

type OverpassElement = {
  id: number
  type: string
  lat?: number
  lon?: number
  center?: {
    lat: number
    lon: number
  }
  tags?: Record<string, string>
}

export const sampleRestaurants: Restaurant[] = [
  {
    id: 'sample-mamak',
    name: 'Training Night Mamak',
    cuisine: 'Malaysian, Indian',
    source: 'sample',
    openStatus: 'Usually late',
    price: '$',
    vibe: 'Big tables, fast food, easy team hangout',
    address: 'Use your area search to find the closest match',
    hours: 'Check live hours in Maps',
    lat: 3.139,
    lng: 101.6869,
    distanceKm: 1.2,
    menuHighlights: ['Roti canai', 'Mee goreng', 'Nasi lemak', 'Teh tarik'],
    amenities: ['Group tables', 'Quick service', 'Takeaway'],
    tags: ['mamak', 'halal-friendly', 'cheap', 'late night'],
  },
  {
    id: 'sample-cafe',
    name: 'Recovery Cafe',
    cuisine: 'Cafe, Drinks',
    source: 'sample',
    openStatus: 'Check hours',
    price: '$$',
    vibe: 'Quieter place for drinks, dessert, and talking',
    address: 'Use your area search to find the closest match',
    hours: 'Check live hours in Maps',
    lat: 3.143,
    lng: 101.693,
    distanceKm: 2.4,
    menuHighlights: ['Iced coffee', 'Cakes', 'Sandwiches', 'Fries'],
    amenities: ['Air conditioning', 'Good for chilling', 'Card payment'],
    tags: ['cafe', 'drinks', 'dessert', 'chill'],
  },
  {
    id: 'sample-food-court',
    name: 'Food Court Mix',
    cuisine: 'Mixed stalls',
    source: 'sample',
    openStatus: 'Many choices',
    price: '$',
    vibe: 'Best when everyone wants different food',
    address: 'Use your area search to find the closest match',
    hours: 'Check live hours in Maps',
    lat: 3.134,
    lng: 101.682,
    distanceKm: 3.1,
    menuHighlights: ['Chicken rice', 'Fried noodles', 'Soup', 'Fresh drinks'],
    amenities: ['Many stalls', 'Budget options', 'Shared seating'],
    tags: ['food court', 'cheap', 'group', 'variety'],
  },
]

export function buildOverpassQuery(coordinates: Coordinates, radiusKm: number) {
  const radiusMeters = Math.max(500, Math.round(radiusKm * 1000))

  return `
[out:json][timeout:12];
(
  node["amenity"~"restaurant|fast_food|cafe|food_court"](around:${radiusMeters},${coordinates.lat},${coordinates.lng});
  way["amenity"~"restaurant|fast_food|cafe|food_court"](around:${radiusMeters},${coordinates.lat},${coordinates.lng});
  relation["amenity"~"restaurant|fast_food|cafe|food_court"](around:${radiusMeters},${coordinates.lat},${coordinates.lng});
);
out center 30;
`.trim()
}

export async function fetchNearbyRestaurants(
  coordinates: Coordinates,
  radiusKm: number,
) {
  const body = new URLSearchParams({
    data: buildOverpassQuery(coordinates, radiusKm),
  })

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body,
  })

  if (!response.ok) {
    throw new Error('Could not load nearby places')
  }

  const data = (await response.json()) as { elements?: OverpassElement[] }

  return parseOverpassRestaurants(data.elements ?? [], coordinates)
}

export function parseOverpassRestaurants(
  elements: OverpassElement[],
  origin?: Coordinates,
) {
  return elements
    .map((element): Restaurant | null => {
      const tags = element.tags ?? {}
      const lat = element.lat ?? element.center?.lat
      const lng = element.lon ?? element.center?.lon
      const name = tags.name?.trim()

      if (!name || lat === undefined || lng === undefined) {
        return null
      }

      const cuisine = formatCuisine(tags.cuisine, tags.amenity)
      const menuHighlights = inferMenuHighlights(tags.cuisine, tags.amenity, name)
      const amenities = inferAmenities(tags)
      const address = [tags['addr:housenumber'], tags['addr:street']]
        .filter(Boolean)
        .join(' ')

      return {
        id: `${element.type}-${element.id}`,
        name,
        cuisine,
        source: 'live',
        openStatus: tags.opening_hours ? 'Hours listed' : 'Check hours',
        price: inferPrice(tags),
        vibe: inferVibe(tags),
        address: address || tags['addr:full'] || 'Open in Maps for exact address',
        hours: tags.opening_hours || 'Check live hours in Maps',
        lat,
        lng,
        distanceKm: origin ? calculateDistanceKm(origin, { lat, lng }) : undefined,
        menuHighlights,
        amenities,
        tags: buildTags(tags, cuisine),
      }
    })
    .filter((restaurant): restaurant is Restaurant => restaurant !== null)
    .sort((first, second) => (first.distanceKm ?? 99) - (second.distanceKm ?? 99))
    .slice(0, 30)
}

export function filterRestaurants(restaurants: Restaurant[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return restaurants
  }

  return restaurants.filter((restaurant) =>
    [
      restaurant.name,
      restaurant.cuisine,
      restaurant.vibe,
      ...restaurant.menuHighlights,
      ...restaurant.amenities,
      ...restaurant.tags,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  )
}

export function buildGoogleMapsRestaurantUrl({
  name,
  lat,
  lng,
}: Pick<Restaurant, 'name' | 'lat' | 'lng'>) {
  const encodedName = encodeURIComponent(name).replaceAll('%20', '+')

  return `https://www.google.com/maps/search/${encodedName}/@${lat},${lng},17z`
}

function formatCuisine(cuisine: string | undefined, amenity: string | undefined) {
  const source = cuisine || amenity || 'Food'

  return source
    .split(/[;,]/)
    .map((item) => item.trim().replaceAll('_', ' '))
    .filter(Boolean)
    .map(toTitleCase)
    .join(', ')
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function inferMenuHighlights(
  cuisine = '',
  amenity = '',
  name = '',
) {
  const text = `${cuisine} ${amenity} ${name}`.toLowerCase()

  if (text.includes('coffee') || text.includes('cafe')) {
    return ['Coffee', 'Iced drinks', 'Cakes', 'Sandwiches']
  }

  if (text.includes('malaysian') || text.includes('mamak') || text.includes('indian')) {
    return ['Roti canai', 'Nasi lemak', 'Mee goreng', 'Teh tarik']
  }

  if (text.includes('japanese') || text.includes('ramen') || text.includes('sushi')) {
    return ['Ramen', 'Rice bowls', 'Sushi', 'Green tea']
  }

  if (text.includes('chinese')) {
    return ['Fried rice', 'Noodles', 'Soup', 'Shared dishes']
  }

  if (text.includes('thai')) {
    return ['Tom yum', 'Basil rice', 'Fried noodles', 'Iced tea']
  }

  if (text.includes('burger') || text.includes('western') || text.includes('fast_food')) {
    return ['Burgers', 'Fries', 'Chicken', 'Soft drinks']
  }

  return ['Rice meals', 'Noodles', 'Drinks', 'Shared plates']
}

function inferAmenities(tags: Record<string, string>) {
  const amenities = new Set<string>()

  if (tags.takeaway === 'yes') amenities.add('Takeaway')
  if (tags.delivery === 'yes') amenities.add('Delivery')
  if (tags.outdoor_seating === 'yes') amenities.add('Outdoor seating')
  if (tags.indoor_seating === 'yes') amenities.add('Indoor seating')
  if (tags.internet_access === 'wlan') amenities.add('Wi-Fi')
  if (tags.phone) amenities.add('Phone listed')
  if (tags.website) amenities.add('Website')
  if (tags['diet:halal'] === 'yes') amenities.add('Halal listed')

  if (amenities.size === 0) {
    amenities.add('Open in Maps for details')
  }

  return Array.from(amenities)
}

function inferPrice(tags: Record<string, string>) {
  if (tags.amenity === 'fast_food' || tags.amenity === 'food_court') {
    return '$'
  }

  if (tags.amenity === 'cafe') {
    return '$$'
  }

  return '$-$$'
}

function inferVibe(tags: Record<string, string>) {
  if (tags.amenity === 'cafe') {
    return 'Good for drinks, dessert, and a calmer sit-down'
  }

  if (tags.amenity === 'food_court') {
    return 'Many choices for a group with different cravings'
  }

  if (tags.amenity === 'fast_food') {
    return 'Fast, simple, and easy when everyone is tired'
  }

  return 'Sit-down food spot for a proper post-training meal'
}

function buildTags(tags: Record<string, string>, cuisine: string) {
  return [
    cuisine,
    tags.amenity,
    tags.opening_hours ? 'hours listed' : 'check hours',
    tags['diet:halal'] === 'yes' ? 'halal' : '',
  ].filter(Boolean)
}

function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371
  const dLat = degreesToRadians(to.lat - from.lat)
  const dLng = degreesToRadians(to.lng - from.lng)
  const lat1 = degreesToRadians(from.lat)
  const lat2 = degreesToRadians(to.lat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  return Number((earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1))
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180
}
