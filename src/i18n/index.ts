import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

const translations = {
  en: {
    appName: 'MakanMana',
    nearbyNow: 'Nearby now',
    surpriseMe: 'Surprise me',
    home: 'Home',
    map: 'Map',
    saved: 'Saved',
    profile: 'Profile',
  },
};

export const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = getLocales()[0]?.languageCode === 'en' ? 'en' : 'en';
