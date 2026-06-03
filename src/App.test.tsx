import { render, screen, within } from '@testing-library/react'
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
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    await user.click(screen.getByRole('button', { name: 'Find' }))

    expect(await screen.findByText('GPS ready')).toBeInTheDocument()
    expect(await screen.findAllByText('Stadium Cafe')).not.toHaveLength(0)
  })

  it('falls back to a typed location', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    await user.type(screen.getByLabelText(/search page location/i), 'Bukit Jalil')
    await user.click(screen.getByRole('button', { name: 'Find' }))

    expect(screen.getAllByText('Restoran Nasi Kandar Pelita KLCC')).not.toHaveLength(0)
  })

  it('keeps search results empty until Find is pressed', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open search' }))

    expect(screen.getByText('Sort results')).toBeInTheDocument()
    expect(
      screen.getByText('Type food or location, then press Find to show matches.'),
    ).toBeInTheDocument()
    expect(screen.getByText('0 matches')).toBeInTheDocument()
    expect(
      screen.queryByText('Restoran Nasi Kandar Pelita KLCC'),
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/search food page/i), 'nasi')
    await user.click(screen.getByRole('button', { name: 'Find' }))

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
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    await user.click(screen.getByRole('button', { name: 'Find' }))

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

  it('opens search from the header actions', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /open food search/i }))
    expect(screen.getByRole('heading', { name: 'Search Food' })).toBeInTheDocument()
    expect(screen.getByLabelText(/search food page/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /discover tab/i }))
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    expect(screen.getByRole('heading', { name: 'Search Food' })).toBeInTheDocument()
  })

  it('selects food type chips from the horizontal row', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.click(screen.getByRole('button', { name: /open search/i }))

    await user.click(
      within(screen.getByLabelText('Food type filters')).getByRole('button', {
        name: 'Cafe',
      }),
    )

    expect(screen.getByLabelText(/search food page/i)).toHaveValue('cafe')
  })

  it('shows nearest beside the discover quick food buttons', () => {
    setGeolocation(undefined)

    render(<App />)

    expect(screen.getByRole('button', { name: 'Nearest' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cheap' })).toBeInTheDocument()
  })

  it('shows that status controls are selectable dropdowns', () => {
    setGeolocation(undefined)

    render(<App />)

    expect(screen.getByText('Tap Mode, Radius, or Price to choose.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mode' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Radius' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Price' })).toBeInTheDocument()
  })

  it('lets the whole status control area change a dropdown value', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Radius' }), '10')

    expect(screen.getByRole('combobox', { name: 'Radius' })).toHaveValue('10')
    expect(screen.getAllByText('10 km')).not.toHaveLength(0)
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
