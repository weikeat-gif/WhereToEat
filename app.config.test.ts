import {
  assertLiveDataBuildConfiguration,
  assertMapsBuildConfiguration,
  createMapsPlugin,
} from './app.config';

describe('Google Maps Expo configuration', () => {
  it('fails an iOS EAS build before producing a blank map', () => {
    expect(() =>
      assertMapsBuildConfiguration({
        EAS_BUILD: 'true',
        EAS_BUILD_PLATFORM: 'ios',
      }),
    ).toThrow('GOOGLE_MAPS_IOS_API_KEY');
  });

  it('blocks preview and production builds that could ship demo restaurants', () => {
    expect(() =>
      assertLiveDataBuildConfiguration({
        EAS_BUILD: 'true',
        EAS_BUILD_PROFILE: 'production',
        EXPO_PUBLIC_DATA_MODE: 'mock',
      }),
    ).toThrow('EXPO_PUBLIC_DATA_MODE=live');

    expect(() =>
      assertLiveDataBuildConfiguration({
        EAS_BUILD: 'true',
        EAS_BUILD_PROFILE: 'preview',
        EXPO_PUBLIC_DATA_MODE: 'live',
      }),
    ).toThrow('EXPO_PUBLIC_SUPABASE_URL');
  });

  it('accepts a live Places backend for release builds', () => {
    expect(() =>
      assertLiveDataBuildConfiguration({
        EAS_BUILD: 'true',
        EAS_BUILD_PROFILE: 'production',
        EXPO_PUBLIC_DATA_MODE: 'live',
        EXPO_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: 'publishable-key',
        EXPO_PUBLIC_PLACES_PROXY_URL:
          'https://project.supabase.co/functions/v1/places',
      }),
    ).not.toThrow();
  });

  it('configures the native plugin for the target keys', () => {
    expect(
      createMapsPlugin({
        GOOGLE_MAPS_IOS_API_KEY: 'ios-key',
        GOOGLE_MAPS_ANDROID_API_KEY: 'android-key',
      }),
    ).toEqual([
      'react-native-maps',
      {
        iosGoogleMapsApiKey: 'ios-key',
        androidGoogleMapsApiKey: 'android-key',
      },
    ]);
  });
});
