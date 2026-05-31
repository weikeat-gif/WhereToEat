import { describe, expect, it } from 'vitest'

import {
  buildGoogleMapsRestaurantUrl,
  buildOverpassQuery,
  filterRestaurants,
  parseOverpassRestaurants,
} from './restaurants'

describe('restaurants', () => {
  it('builds an Overpass query around the user coordinates', () => {
    const query = buildOverpassQuery({ lat: 3.139, lng: 101.6869 }, 3)

    expect(query).toContain('[out:json]')
    expect(query).toContain('around:3000,3.139,101.6869')
    expect(query).toContain('"amenity"~"restaurant|fast_food|cafe|food_court"')
  })

  it('parses live restaurant tags into selectable restaurant details', () => {
    const restaurants = parseOverpassRestaurants([
      {
        id: 10,
        type: 'node',
        lat: 3.14,
        lon: 101.68,
        tags: {
          name: 'Mamak Corner',
          cuisine: 'malaysian;indian',
          opening_hours: 'Mo-Su 18:00-02:00',
          'addr:street': 'Jalan Training',
          takeaway: 'yes',
        },
      },
    ])

    expect(restaurants).toHaveLength(1)
    expect(restaurants[0]).toMatchObject({
      id: 'node-10',
      name: 'Mamak Corner',
      cuisine: 'Malaysian, Indian',
      source: 'live',
      openStatus: 'Hours listed',
      address: 'Jalan Training',
    })
    expect(restaurants[0].menuHighlights).toContain('Roti canai')
    expect(restaurants[0].amenities).toContain('Takeaway')
  })

  it('filters restaurants by name, cuisine, and menu highlights', () => {
    const restaurants = parseOverpassRestaurants([
      {
        id: 1,
        type: 'node',
        lat: 1,
        lon: 1,
        tags: { name: 'Campus Cafe', cuisine: 'coffee_shop' },
      },
      {
        id: 2,
        type: 'node',
        lat: 2,
        lon: 2,
        tags: { name: 'Nasi Spot', cuisine: 'malaysian' },
      },
    ])

    expect(filterRestaurants(restaurants, 'coffee')).toHaveLength(1)
    expect(filterRestaurants(restaurants, 'nasi')[0].name).toBe('Nasi Spot')
  })

  it('builds a Maps link for a selected restaurant', () => {
    const url = buildGoogleMapsRestaurantUrl({
      name: 'Campus Cafe',
      lat: 3.139,
      lng: 101.6869,
    })

    expect(url).toBe(
      'https://www.google.com/maps/search/Campus+Cafe/@3.139,101.6869,17z',
    )
  })
})
