import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
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
    await user.type(screen.getByLabelText(/search food page/i), 'Bukit Jalil')
    await user.click(screen.getByRole('button', { name: 'Find' }))

    expect(screen.getAllByText('ZUS Coffee Pavilion Bukit Jalil')).not.toHaveLength(0)
  })

  it('keeps search results empty until Find is pressed', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open search' }))

    expect(screen.getByText('Sort results')).toBeInTheDocument()
    expect(screen.queryByLabelText(/search page location/i)).not.toBeInTheDocument()
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

  it('sorts search results when sort buttons are pressed', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Open search' }))
    await user.type(screen.getByLabelText(/search food page/i), 'cafe')
    await user.click(screen.getByRole('button', { name: 'Find' }))

    const searchResults = screen.getByRole('region', { name: 'Search Results' })
    expect(await within(searchResults).findByText('Inside Scoop Bangsar')).toBeInTheDocument()
    expect(
      within(searchResults).queryByRole('combobox', { name: 'Sort results' }),
    ).not.toBeInTheDocument()
    expect(within(searchResults).getAllByRole('heading', { level: 3 })[0]).toHaveTextContent(
      'Inside Scoop Bangsar',
    )

    await user.click(within(searchResults).getByRole('button', { name: 'Top rated' }))

    expect(within(searchResults).getByRole('button', { name: 'Top rated' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(searchResults).getAllByRole('heading', { level: 3 })[0]).toHaveTextContent(
      'ZUS Coffee Pavilion Bukit Jalil',
    )
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

  it('opens the search, activity, and profile sections from bottom navigation', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /search tab/i }))
    expect(screen.getByRole('heading', { name: 'Search Food' })).toBeInTheDocument()
    expect(screen.getByLabelText(/search food page/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /activity tab/i }))
    expect(screen.getByRole('heading', { name: 'Team Activity' })).toBeInTheDocument()
    expect(screen.getByText('Active Polls')).toBeInTheDocument()
    expect(screen.getByText('Completed Polls')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start poll' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /profile tab/i }))
    expect(screen.getByRole('heading', { name: 'Alex Chen' })).toBeInTheDocument()
    expect(screen.getByText('Team Captain')).toBeInTheDocument()
    expect(screen.getByText('Dietary Requirements')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Saved Places' })).toBeInTheDocument()
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument()
  })

  it('adds profile preferences and keeps recommendations visible', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /profile tab/i }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    const dialog = screen.getByRole('dialog', { name: 'Add preference' })
    await user.type(within(dialog).getByLabelText('Preference'), 'Dessert')
    await user.click(within(dialog).getByRole('button', { name: 'Add Preference' }))

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: 'Add preference' }),
    )
    expect(
      screen.getByRole('button', { name: 'Remove Dessert preference' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /discover tab/i }))

    expect(screen.getByText('Recommended Nearby')).toBeInTheDocument()
    expect(screen.getAllByText('Inside Scoop Bangsar')).not.toHaveLength(0)
  })

  it('lets profile account fields be entered', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /profile tab/i }))
    await user.click(screen.getByRole('button', { name: 'Email Address' }))

    const dialog = screen.getByRole('dialog', { name: 'Email Address' })
    await user.type(within(dialog).getByLabelText('Email Address'), 'alex@test.com')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(screen.queryByRole('dialog', { name: 'Email Address' })).not.toBeInTheDocument()
    expect(screen.getByText('alex@test.com')).toBeInTheDocument()
  })

  it('toggles profile notifications with switch controls', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /profile tab/i }))

    const pushSwitch = screen.getByRole('switch', { name: 'Push Notifications' })
    expect(pushSwitch).toHaveAttribute('aria-checked', 'true')

    await user.click(pushSwitch)

    expect(pushSwitch).toHaveAttribute('aria-checked', 'false')
  })

  it('opens search from the header actions', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /open search/i }))
    expect(screen.getByRole('heading', { name: 'Search Food' })).toBeInTheDocument()
    expect(screen.getByLabelText(/search food page/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /open discover/i }))
    expect(screen.getByText('Recommended Nearby')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open search' }))
    expect(screen.getByRole('heading', { name: 'Search Food' })).toBeInTheDocument()
  })

  it('votes in a poll popup and updates the vote count', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.click(screen.getByRole('button', { name: /activity tab/i }))

    expect(screen.queryByText('MODE')).not.toBeInTheDocument()
    expect(screen.getByText('2 votes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Vote Now' }))
    const dialog = screen.getByRole('dialog', { name: 'Friday Lunch Walk' })
    await user.click(within(dialog).getByRole('button', { name: /Cafe Bowls/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Submit Vote' }))

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: 'Friday Lunch Walk' }),
    )
    expect(screen.getByText('3 votes')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Update Vote' }))
    const updateDialog = screen.getByRole('dialog', { name: 'Friday Lunch Walk' })
    await user.click(within(updateDialog).getByRole('button', { name: /Cafe Bowls/ }))
    await user.click(within(updateDialog).getByRole('button', { name: 'Remove Vote' }))

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: 'Friday Lunch Walk' }),
    )
    expect(screen.getByText('2 votes')).toBeInTheDocument()
  })

  it('requires joining a poll before voting', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.click(screen.getByRole('button', { name: /activity tab/i }))

    await user.click(screen.getByRole('button', { name: 'Join Poll' }))

    expect(
      screen.queryByRole('dialog', { name: 'Client Meeting Lunch' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Join Poll' })).not.toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Vote Now' })[1])

    expect(
      screen.getByRole('dialog', { name: 'Client Meeting Lunch' }),
    ).toBeInTheDocument()
  })

  it('starts a poll with selected places', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.click(screen.getByRole('button', { name: /activity tab/i }))
    await user.click(screen.getByRole('button', { name: 'Start poll' }))

    const dialog = screen.getByRole('dialog', { name: 'Start Poll' })
    await user.type(within(dialog).getByLabelText('Poll name'), 'Dinner Vote')
    await user.type(
      within(dialog).getByLabelText('Poll description'),
      'Choose where to eat tonight',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Add Poll' }))

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: 'Start Poll' }),
    )
    expect(screen.getByText('Dinner Vote')).toBeInTheDocument()
    expect(screen.getByText(/Choose where to eat tonight/)).toBeInTheDocument()
    expect(screen.getByText('Restoran Nasi Kandar Pelita KLCC')).toBeInTheDocument()
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

    expect(screen.getByRole('button', { name: 'Search nearby' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nearest' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cheap' })).toBeInTheDocument()
  })

  it('uses discover filters to search nearby restaurants', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Search nearby' }))

    expect(await screen.findAllByText('Stadium Cafe')).not.toHaveLength(0)
  })

  it('shows that status controls are selectable dropdowns', () => {
    setGeolocation(undefined)

    render(<App />)

    expect(screen.getByText('Tap Mode, Distance, or Price to choose.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mode' })).toHaveAttribute(
      'aria-haspopup',
      'listbox',
    )
    expect(screen.getByRole('button', { name: 'Distance' })).toHaveAttribute(
      'aria-haspopup',
      'listbox',
    )
    expect(screen.getByRole('button', { name: 'Price' })).toHaveAttribute(
      'aria-haspopup',
      'listbox',
    )
  })

  it('lets the whole status control area change a dropdown value', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Distance' }))
    await user.click(screen.getByRole('option', { name: '10 km' }))

    expect(screen.getByRole('button', { name: 'Distance' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getAllByText('10 km')).not.toHaveLength(0)
  })

  it('opens shop details as a popup dialog', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(screen.getAllByRole('button', { name: 'View' })[0])

    const dialog = screen.getByRole('dialog', {
      name: 'Restoran Nasi Kandar Pelita KLCC',
    })
    expect(
      within(dialog).getByRole('heading', {
        name: 'Restoran Nasi Kandar Pelita KLCC',
      }),
    ).toBeInTheDocument()
    expect(
      within(dialog).queryByRole('button', { name: 'Share food plan' }),
    ).not.toBeInTheDocument()
    expect(within(dialog).getByText("What's Inside")).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', {
        name: 'Restoran Nasi Kandar Pelita KLCC',
      }),
    )
  })

  it('saves and removes a restaurant from the profile saved section', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)

    await user.click(
      screen.getAllByRole('button', {
        name: /save restoran nasi kandar pelita klcc/i,
      })[0],
    )

    await user.click(screen.getByRole('button', { name: /profile tab/i }))
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
