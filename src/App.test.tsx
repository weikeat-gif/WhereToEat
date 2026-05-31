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
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    })
    vi.restoreAllMocks()
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
    await user.click(screen.getByRole('button', { name: /find nearby/i }))

    expect(await screen.findByText('GPS ready')).toBeInTheDocument()
    expect(screen.getByText(/@3\.139,101\.6869,15z/)).toBeInTheDocument()
  })

  it('falls back to a typed location', async () => {
    const user = userEvent.setup()
    setGeolocation(undefined)

    render(<App />)
    await user.type(screen.getByLabelText(/location fallback/i), 'Bukit Jalil')
    await user.click(screen.getByRole('button', { name: /find nearby/i }))

    expect(screen.getByText(/near\+Bukit\+Jalil/)).toBeInTheDocument()
  })

  it('asks for typed location when geolocation is denied', async () => {
    const user = userEvent.setup()
    setGeolocation(
      vi.fn((_success, error) => {
        error?.({ code: 1, message: 'Denied' } as GeolocationPositionError)
      }),
    )

    render(<App />)
    await user.click(screen.getByRole('button', { name: /find nearby/i }))

    expect(await screen.findByText('Type location')).toBeInTheDocument()
  })
})
