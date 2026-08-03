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
    const markerOptions: Record<string, unknown>[] = [];
    const polygonOptions: Record<string, unknown>[] = [];
    const fitBounds = jest.fn();
    let currentCenter = { lat: () => 3.2, lng: () => 101.7 };
    let idleListener: (() => void) | undefined;
    let dragStartListener: (() => void) | undefined;
    let mapPressListener: (() => void) | undefined;
    const onCenterChange = jest.fn();
    const onMapPress = jest.fn();
    class FakeMap {
      constructor(_element: HTMLElement, options: Record<string, unknown>) {
        mapOptions = options;
      }
      addListener(event: string, listener: () => void) {
        if (event === 'idle') idleListener = listener;
        if (event === 'dragstart') dragStartListener = listener;
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
      fitBounds(bounds: Record<string, number>, padding?: number) {
        fitBounds(bounds, padding);
      }
    }
    class FakeMarker {
      constructor(options: Record<string, unknown>) {
        markerOptions.push(options);
      }
      addListener() {
        return { remove: jest.fn() };
      }
      setMap() {}
    }
    class FakePolygon {
      constructor(options: Record<string, unknown>) {
        polygonOptions.push(options);
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
    const focusedAreaBounds = {
      northEast: { latitude: 3.0975, longitude: 101.4975 },
      southWest: { latitude: 3.0225, longitude: 101.4225 },
    };
    const focusedAreaBoundary = {
      source: 'openstreetmap' as const,
      sourceUrl: 'https://www.openstreetmap.org/relation/18743759',
      label: 'Bandar Sentosa',
      polygons: [
        {
          outer: [
            { latitude: 3.0225, longitude: 101.4225 },
            { latitude: 3.0975, longitude: 101.43 },
            { latitude: 3.08, longitude: 101.4975 },
            { latitude: 3.0225, longitude: 101.4225 },
          ],
          holes: [],
        },
      ],
    };
    const props = {
      center: firstCenter,
      focusedAreaBoundary,
      focusedAreaBounds,
      places: [],
      onViewportChange: onCenterChange,
      onMapPress,
      onPlacePress: jest.fn(),
      showsUserLocation: true,
      userCoordinates: gpsCenter,
    };
    const view = render(<MapCanvas {...props} />);

    view.rerender(<MapCanvas {...props} center={gpsCenter} />);
    await act(async () => {
      window.google = {
        maps: {
          Map: FakeMap,
          Marker: FakeMarker,
          InfoWindow: class FakeInfoWindow {
            close() {}
            open() {}
            setContent() {}
          },
          Polygon: FakePolygon,
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
    expect(fitBounds).toHaveBeenCalledWith(
      {
        east: 101.4975,
        north: 3.0975,
        south: 3.0225,
        west: 101.4225,
      },
      48,
    );
    expect(polygonOptions).toContainEqual(
      expect.objectContaining({
        fillOpacity: expect.any(Number),
        paths: [
          [
            { lat: 3.0225, lng: 101.4225 },
            { lat: 3.0975, lng: 101.43 },
            { lat: 3.08, lng: 101.4975 },
            { lat: 3.0225, lng: 101.4225 },
          ],
        ],
        strokeWeight: 3,
      }),
    );
    currentCenter = { lat: () => 3.06, lng: () => 101.46 };
    act(() => dragStartListener?.());
    act(() => idleListener?.());
    expect(onCenterChange).toHaveBeenCalledWith(
      {
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
      },
      'gesture',
    );
    expect(markerOptions).toContainEqual(
      expect.objectContaining({
        position: { lat: gpsCenter.latitude, lng: gpsCenter.longitude },
        title: 'Your current location',
      }),
    );

    act(() => dragStartListener?.());
    act(() => idleListener?.());
    currentCenter = { lat: () => 3.07, lng: () => 101.47 };
    act(() => idleListener?.());
    expect(onCenterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: { latitude: 3.07, longitude: 101.47 },
      }),
      'programmatic',
    );

    act(() => mapPressListener?.());
    expect(onMapPress).toHaveBeenCalledTimes(1);
  });

  it('shows restaurant, user distance, and opening status while hovering a web marker', async () => {
    const markerListeners = new Map<string, () => void>();
    const openInfoWindow = jest.fn();
    const closeInfoWindow = jest.fn();
    const onPlacePress = jest.fn();
    let infoWindowOptions: Record<string, unknown> | undefined;
    let infoContent: HTMLElement | undefined;

    class FakeMap {
      constructor(element: HTMLElement, options: Record<string, unknown>) {
        void element;
        void options;
      }
      addListener() {
        return { remove: jest.fn() };
      }
      getCenter() {
        return { lat: () => 3.139, lng: () => 101.6869 };
      }
      getBounds() {
        return undefined;
      }
      fitBounds() {}
      setCenter() {}
    }
    class FakeMarker {
      constructor(options: Record<string, unknown>) {
        if (options.title === 'Your current location') return;
      }
      addListener(event: string, listener: () => void) {
        markerListeners.set(event, listener);
        return { remove: jest.fn() };
      }
      setMap() {}
    }
    class FakeInfoWindow {
      constructor(options?: Record<string, unknown>) {
        infoWindowOptions = options;
      }
      setContent(content: HTMLElement) {
        infoContent = content;
      }
      open = openInfoWindow;
      close = closeInfoWindow;
    }

    const coordinates = { latitude: 3.139, longitude: 101.6869 };
    render(
      <MapCanvas
        center={coordinates}
        onMapPress={jest.fn()}
        onPlacePress={onPlacePress}
        onViewportChange={jest.fn()}
        places={[
          {
            id: 'hover-place',
            name: 'Hover Kopitiam',
            subtitle: 'Breakfast and coffee',
            coordinates,
            distanceMeters: 9_999,
            rating: 4.6,
            reviewCount: 80,
            isOpen: true,
            nextCloseTime: '2026-08-03T14:00:00Z',
            categories: ['Cafe'],
          },
        ]}
        showsUserLocation
        userCoordinates={coordinates}
      />,
    );

    await act(async () => {
      window.google = {
        maps: {
          Map: FakeMap,
          Marker: FakeMarker,
          InfoWindow: FakeInfoWindow,
        },
      };
      window.__makanManaGoogleMapsReady?.();
      await Promise.resolve();
    });

    await waitFor(() => expect(markerListeners.has('mouseover')).toBe(true));
    expect(infoWindowOptions).toEqual({ disableAutoPan: true });
    act(() => markerListeners.get('mouseover')?.());

    expect(infoContent?.textContent).toContain('Hover Kopitiam');
    expect(infoContent?.textContent).toContain('0 m from you');
    expect(infoContent?.textContent).toContain('Open now');
    expect(infoContent?.textContent).toContain('Closes');
    expect(openInfoWindow).toHaveBeenCalledTimes(1);
    expect(onPlacePress).not.toHaveBeenCalled();

    act(() => markerListeners.get('mouseout')?.());
    expect(closeInfoWindow).toHaveBeenCalledTimes(1);

    act(() => markerListeners.get('click')?.());
    expect(onPlacePress).toHaveBeenCalledWith('hover-place');
  });

});
