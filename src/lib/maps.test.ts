import { describe, expect, it } from 'vitest'

import {
  buildGoogleMapsSearchUrl,
  searchIntents,
  type SearchIntentId,
} from './maps'

describe('buildGoogleMapsSearchUrl', () => {
  it('builds a Maps search URL from GPS coordinates', () => {
    const url = buildGoogleMapsSearchUrl({
      intent: 'food-after-training',
      coordinates: { lat: 3.139, lng: 101.6869 },
      manualLocation: '',
      radiusKm: 3,
    })

    expect(url).toBe(
      'https://www.google.com/maps/search/food+after+training+open+now+within+3km/@3.139,101.6869,15z',
    )
  })

  it('builds a Maps search URL from a typed location when GPS is missing', () => {
    const url = buildGoogleMapsSearchUrl({
      intent: 'chill-place',
      coordinates: null,
      manualLocation: 'Bukit Jalil Stadium',
      radiusKm: 5,
    })

    expect(url).toBe(
      'https://www.google.com/maps/search/chill+place+open+now+within+5km+near+Bukit+Jalil+Stadium',
    )
  })

  it('falls back to a broad Maps search when no location is available', () => {
    const url = buildGoogleMapsSearchUrl({
      intent: 'late-night-food',
      coordinates: null,
      manualLocation: '   ',
      radiusKm: 8,
    })

    expect(url).toBe(
      'https://www.google.com/maps/search/late-night+food+open+now+within+8km',
    )
  })

  it.each(searchIntents.map((intent) => [intent.id] as const))(
    'supports the %s search intent',
    (intent: SearchIntentId) => {
      const url = buildGoogleMapsSearchUrl({
        intent,
        coordinates: { lat: 1.4927, lng: 103.7414 },
        manualLocation: '',
        radiusKm: 2,
      })

      expect(url).toContain('https://www.google.com/maps/search/')
      expect(url).toContain('within+2km')
      expect(url).toContain('@1.4927,103.7414,15z')
    },
  )
})
