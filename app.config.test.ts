import {
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
