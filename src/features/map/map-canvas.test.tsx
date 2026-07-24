/** @jest-environment jsdom */

import { act, render, waitFor } from '@testing-library/react-native';

import type { Coordinates } from '@/contracts/place';

import { MapCanvas } from './map-canvas.tsx';

jest.mock('@/config/env', () => ({
  env: { EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY: 'browser-restricted-key' },
}));

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: jest.requireActual('@/theme/tokens').themeColors.dark,
  }),
}));

describe('web MapCanvas', () => {
  afterEach(() => {
    document.getElementById('makanmana-google-maps-js')?.remove();
    delete window.google;
    delete window.__makanManaGoogleMapsReady;
  });

  it('initializes at the latest area when GPS changes while Maps is loading', async () => {
    let mapOptions: Record<string, unknown> | undefined;
    let currentCenter = { lat: () => 3.2, lng: () => 101.7 };
    let idleListener: (() => void) | undefined;
    const onCenterChange = jest.fn();
    class FakeMap {
      constructor(_element: HTMLElement, options: Record<string, unknown>) {
        mapOptions = options;
      }
      addListener(_event: string, listener: () => void) {
        idleListener = listener;
        return { remove: jest.fn() };
      }
      getCenter() {
        return currentCenter;
      }
      setCenter(next: { lat: number; lng: number }) {
        currentCenter = { lat: () => next.lat, lng: () => next.lng };
      }
    }
    class FakeMarker {
      addListener() {
        return { remove: jest.fn() };
      }
      setMap() {}
    }
    const firstCenter: Coordinates = {
      latitude: 3.139,
      longitude: 101.6869,
    };
    const gpsCenter: Coordinates = {
      latitude: 3.05,
      longitude: 101.45,
    };
    const props = {
      center: firstCenter,
      places: [],
      loading: false,
      onCenterChange,
      onSearchArea: jest.fn(),
      onPlacePress: jest.fn(),
      showsUserLocation: true,
    };
    const view = render(<MapCanvas {...props} />);

    view.rerender(<MapCanvas {...props} center={gpsCenter} />);
    await act(async () => {
      window.google = {
        maps: {
          Map: FakeMap,
          Marker: FakeMarker,
        },
      };
      window.__makanManaGoogleMapsReady?.();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(mapOptions).toMatchObject({
        center: { lat: gpsCenter.latitude, lng: gpsCenter.longitude },
      }),
    );

    currentCenter = { lat: () => 3.06, lng: () => 101.46 };
    act(() => idleListener?.());
    expect(onCenterChange).toHaveBeenCalledWith({
      latitude: 3.06,
      longitude: 101.46,
    });
  });
});
