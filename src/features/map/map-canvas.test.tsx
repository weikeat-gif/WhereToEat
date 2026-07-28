/** @jest-environment jsdom */

import { act, render, waitFor } from '@testing-library/react-native';

import type { Coordinates } from '@/contracts/place';

import { FOOD_PIN_ICON_URL, MapCanvas } from './map-canvas.tsx';

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

  it('uses the MakanMana red and lime food pin artwork', () => {
    const icon = decodeURIComponent(FOOD_PIN_ICON_URL);

    expect(icon).toContain('#E64B3C');
    expect(icon).toContain('#C6FF00');
  });

  it('initializes at the latest area when GPS changes while Maps is loading', async () => {
    let mapOptions: Record<string, unknown> | undefined;
    let currentCenter = { lat: () => 3.2, lng: () => 101.7 };
    let idleListener: (() => void) | undefined;
    let mapPressListener: (() => void) | undefined;
    const onCenterChange = jest.fn();
    const onMapPress = jest.fn();
    class FakeMap {
      constructor(_element: HTMLElement, options: Record<string, unknown>) {
        mapOptions = options;
      }
      addListener(event: string, listener: () => void) {
        if (event === 'idle') idleListener = listener;
        if (event === 'click') mapPressListener = listener;
        return { remove: jest.fn() };
      }
      getCenter() {
        return currentCenter;
      }
      getBounds() {
        return {
          getNorthEast: () => ({
            lat: () => 3.0975,
            lng: () => 101.4975,
          }),
          getSouthWest: () => ({
            lat: () => 3.0225,
            lng: () => 101.4225,
          }),
        };
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
      onViewportChange: onCenterChange,
      onMapPress,
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
        styles: expect.arrayContaining([
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ]),
      }),
    );

    currentCenter = { lat: () => 3.06, lng: () => 101.46 };
    act(() => idleListener?.());
    expect(onCenterChange).toHaveBeenCalledWith({
      center: {
        latitude: 3.06,
        longitude: 101.46,
      },
      radiusMeters: expect.any(Number),
      bounds: {
        northEast: {
          latitude: 3.0975,
          longitude: 101.4975,
        },
        southWest: {
          latitude: 3.0225,
          longitude: 101.4225,
        },
      },
    });

    act(() => mapPressListener?.());
    expect(onMapPress).toHaveBeenCalledTimes(1);
  });
});
