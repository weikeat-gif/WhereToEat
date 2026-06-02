import { type Coordinates } from './maps'

export type Restaurant = {
  id: string
  name: string
  cuisine: string
  source: 'live' | 'sample'
  openStatus: string
  price: string
  rating: number
  travelTime: string
  vibe: string
  address: string
  hours: string
  lat: number
  lng: number
  distanceKm?: number
  imageUrl: string
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
    id: 'sample-pelita-klcc',
    name: 'Restoran Nasi Kandar Pelita KLCC',
    cuisine: 'Malaysian, Indian',
    source: 'sample',
    openStatus: 'Check live hours',
    price: '$',
    rating: 4.8,
    travelTime: 'Open Maps',
    vibe: 'Fast nasi kandar, big tables, and reliable group meals',
    address: 'Jalan Ampang, Kuala Lumpur City Centre, Kuala Lumpur',
    hours: 'Check live hours in Maps',
    lat: 3.1592,
    lng: 101.7156,
    distanceKm: 1.1,
    imageUrl:
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
    menuHighlights: ['Nasi kandar', 'Ayam goreng', 'Roti canai', 'Teh tarik'],
    amenities: ['Group tables', 'Quick service', 'Takeaway', 'Halal-friendly'],
    tags: ['mamak', 'halal', 'cheap', 'late night', 'nasi kandar'],
  },
  {
    id: 'sample-village-park',
    name: 'Village Park Restaurant',
    cuisine: 'Malaysian, Nasi Lemak',
    source: 'sample',
    openStatus: 'Check live hours',
    price: '$$',
    rating: 4.7,
    travelTime: 'Open Maps',
    vibe: 'Busy local favorite for nasi lemak and quick comfort food',
    address: '5, Jalan SS 21/37, Damansara Utama, Petaling Jaya',
    hours: 'Check live hours in Maps',
    lat: 3.1347,
    lng: 101.6234,
    distanceKm: 2.0,
    imageUrl:
      'https://images.unsplash.com/photo-1626776876729-bab4369a5a9f?auto=format&fit=crop&w=900&q=80',
    menuHighlights: ['Nasi lemak ayam goreng', 'Rendang', 'Sambal', 'Iced drinks'],
    amenities: ['Local favorite', 'Quick turnover', 'Takeaway'],
    tags: ['malay', 'nasi lemak', 'cheap eats', 'halal-friendly'],
  },
  {
    id: 'sample-murni-ss2',
    name: 'Murni Discovery SS2',
    cuisine: 'Malaysian, Western',
    source: 'sample',
    openStatus: 'Check live hours',
    price: '$$',
    rating: 4.6,
    travelTime: 'Open Maps',
    vibe: 'Large menu, casual tables, and easy group ordering',
    address: 'SS2, Petaling Jaya, Selangor',
    hours: 'Check live hours in Maps',
    lat: 3.1172,
    lng: 101.6227,
    distanceKm: 2.8,
    imageUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    menuHighlights: ['Mee raja', 'Nasi goreng', 'Chicken chop', 'Fresh juice'],
    amenities: ['Group tables', 'Wide menu', 'Late-night friendly'],
    tags: ['western', 'mamak', 'group', 'late night', 'cheap eats'],
  },
  {
    id: 'sample-inside-scoop-bangsar',
    name: 'Inside Scoop Bangsar',
    cuisine: 'Dessert, Cafe',
    source: 'sample',
    openStatus: 'Check live hours',
    price: '$$',
    rating: 4.5,
    travelTime: 'Open Maps',
    vibe: 'Ice cream and waffles for dessert or a calmer chill session',
    address: 'Jalan Telawi 3, Bangsar Baru, Kuala Lumpur',
    hours: 'Check live hours in Maps',
    lat: 3.1295,
    lng: 101.6709,
    distanceKm: 3.2,
    imageUrl:
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80',
    menuHighlights: ['Ice cream', 'Waffles', 'Brownies', 'Coffee'],
    amenities: ['Dessert', 'Air conditioning', 'Good for chilling'],
    tags: ['dessert', 'cafe', 'drinks', 'chill'],
  },
  {
    id: 'sample-madam-kwans-klcc',
    name: "Madam Kwan's KLCC",
    cuisine: 'Malaysian',
    source: 'sample',
    openStatus: 'Check live hours',
    price: '$$$',
    rating: 4.4,
    travelTime: 'Open Maps',
    vibe: 'Comfortable sit-down Malaysian food for small groups',
    address: 'Suria KLCC, Kuala Lumpur City Centre, Kuala Lumpur',
    hours: 'Check live hours in Maps',
    lat: 3.1579,
    lng: 101.7123,
    distanceKm: 3.9,
    imageUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80',
    menuHighlights: ['Nasi lemak', 'Curry laksa', 'Char kuey teow', 'Satay'],
    amenities: ['Sit-down dining', 'Mall location', 'Card payment'],
    tags: ['malay', 'malaysian', 'group', 'comfort food'],
  },
  {
    id: 'sample-zus-bukit-jalil',
    name: 'ZUS Coffee Pavilion Bukit Jalil',
    cuisine: 'Cafe, Drinks',
    source: 'sample',
    openStatus: 'Check live hours',
    price: '$$',
    rating: 4.6,
    travelTime: 'Open Maps',
    vibe: 'Quick coffee stop for drinks, light bites, and charging up',
    address: 'Pavilion Bukit Jalil, Kuala Lumpur',
    hours: 'Check live hours in Maps',
    lat: 3.0529,
    lng: 101.6705,
    distanceKm: 4.4,
    imageUrl:
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80',
    menuHighlights: ['Iced latte', 'Spanish latte', 'Matcha', 'Pastries'],
    amenities: ['Coffee', 'Takeaway', 'Mall location'],
    tags: ['cafe', 'drinks', 'coffee', 'chill'],
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
        rating: inferRating(element.id),
        travelTime: origin
          ? `${Math.max(3, Math.round((calculateDistanceKm(origin, { lat, lng }) ?? 1) * 5))} min`
          : 'Open Maps',
        vibe: inferVibe(tags),
        address: address || tags['addr:full'] || 'Open in Maps for exact address',
        hours: tags.opening_hours || 'Check live hours in Maps',
        lat,
        lng,
        distanceKm: origin ? calculateDistanceKm(origin, { lat, lng }) : undefined,
        imageUrl: inferImageUrl(tags.cuisine, tags.amenity, name),
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

  return 'Sit-down food spot for a proper meal'
}

function inferRating(id: number) {
  return Number((4.2 + (id % 7) / 10).toFixed(1))
}

function inferImageUrl(cuisine = '', amenity = '', name = '') {
  const text = `${cuisine} ${amenity} ${name}`.toLowerCase()

  if (text.includes('coffee') || text.includes('cafe')) {
    return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80'
  }

  if (text.includes('japanese') || text.includes('sushi')) {
    return 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80'
  }

  if (text.includes('pizza') || text.includes('italian')) {
    return 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=900&q=80'
  }

  if (text.includes('burger') || text.includes('fast_food')) {
    return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80'
  }

  return 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80'
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
