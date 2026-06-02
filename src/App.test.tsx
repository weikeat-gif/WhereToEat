import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const originalGeolocation = navigator.geolocation

function setGeolocation(
  getCurrentPosition: Geolocation['getCurrentPosition'] | undefined,
) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: getCurrentPosition ? { getCurrentPosition } : undefined,
  })
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            elements: [
              {
                id: 100,
                type: 'node',
                lat: 3.1395,
                lon: 101.687,
                tags: {
                  name: 'Stadium Cafe',
                  amenity: 'cafe',
                  cuisine: 'coffee_shop',
                  opening_hours: 'Mo-Su 10:00-23:00',
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    )
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    })
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses phone location when geolocation succeeds', async () => {
    const user = userEvent.setup()
    setGeolocation(
      vi.fn((success) => {
        success({
          coords: {
            latitude: 3.139,
            longitude: 101.6869,
          },
        } as GeolocationPosition)
      }),
    )

    render(<App />)
    await user.click(screen.getByRole('button', { name: /search nearby food/i }))

    expect(await screen.findByText('GPS ready')).toBeInTheDocument()
    expect(screen.getByText(/@3\.139,101\.6869,15z/)).toBeInTheDocument()
    expect(await screen.findAllByText('Stadium Cafe')).not.toHaveLength(0)
  })

  it('falls back to a typed location', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.type(screen.getByLabelText(/location fallback/i), 'Bukit Jalil')
    await user.click(screen.getByRole('button', { name: /search nearby food/i }))

    expect(screen.getByText(/near\+Bukit\+Jalil/)).toBeInTheDocument()
    expect(screen.getAllByText('Restoran Nasi Kandar Pelita KLCC')).not.toHaveLength(0)
  })

  it('asks for typed location when geolocation is denied', async () => {
    const user = userEvent.setup()
    setGeolocation(
      vi.fn((_success, error) => {
        error?.({ code: 1, message: 'Denied' } as GeolocationPositionError)
      }),
    )

    render(<App />)
    await user.click(screen.getByRole('button', { name: /search nearby food/i }))

    expect(await screen.findByText('Type location')).toBeInTheDocument()
  })

  it('opens the saved, activity, and profile sections from bottom navigation', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /saved tab/i }))
    expect(screen.getByRole('heading', { name: 'Saved Places' })).toBeInTheDocument()
    expect(screen.getByText('Shortcut List')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /activity tab/i }))
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument()
    expect(screen.getByText('Recent food decisions')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /profile tab/i }))
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByText('Food finder preferences')).toBeInTheDocument()
  })

  it('opens search and settings from the header actions', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /open food search/i }))
    expect(screen.getByRole('heading', { name: 'Search Food' })).toBeInTheDocument()
    expect(screen.getByLabelText(/search food page/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open settings/i }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('Adjust your food finder defaults')).toBeInTheDocument()
  })

  it('saves and removes a restaurant from the saved page', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(
      screen.getAllByRole('button', {
        name: /save restoran nasi kandar pelita klcc/i,
      })[0],
    )

    await user.click(screen.getByRole('button', { name: /saved tab/i }))
    expect(
      screen.getAllByText('Restoran Nasi Kandar Pelita KLCC'),
    ).not.toHaveLength(0)

    await user.click(
      screen.getByRole('button', {
        name: /remove restoran nasi kandar pelita klcc from saved/i,
      }),
    )

    expect(screen.getByText('No saved places yet')).toBeInTheDocument()
  })
})
