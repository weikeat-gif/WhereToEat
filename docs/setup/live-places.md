# Live Google Places setup

MakanMana never calls Google Places directly from the mobile app. The app sends
the user's search location and filters to the protected Supabase `places` Edge
Function. That function calls Google Places (New) with the server-only key and
returns the real nearby businesses.

Google does not expose every business on Earth in one response. MakanMana asks
for up to 20 nearby food businesses inside the selected radius, ranked by
distance. Text searches use Google's paginated Text Search and currently return
the first 20 strongest matches. Moving the map and pressing **Search this area**
retrieves businesses around the new map centre.

## 1. Google Cloud

Create a billed Google Cloud project and enable:

- Places API (New)
- Routes API
- Maps SDK for iOS
- Maps SDK for Android
- Maps JavaScript API for the optional laptop web preview

Create separate restricted keys:

- iOS key: restrict to bundle ID `com.makanmana.app`; allow Maps SDK for iOS.
- Android key: restrict to package `com.makanmana.app` and the EAS SHA-1
  fingerprints; allow Maps SDK for Android.
- Web key: restrict to the exact development/production web origins; allow Maps
  JavaScript API.
- Server key: keep only in Supabase secrets; allow Places API (New) and Routes
  API. Never prefix it with `EXPO_PUBLIC_`.

## 2. Supabase

Create or select the Supabase project and enable anonymous sign-ins. The CLI is
not installed globally in this repository, so run its current package through
`pnpm dlx`:

```powershell
pnpm dlx supabase login
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF
pnpm dlx supabase db push
```

Store the server secrets without putting their values in Git:

```powershell
pnpm dlx supabase secrets set GOOGLE_MAPS_SERVER_API_KEY=YOUR_SERVER_KEY
pnpm dlx supabase secrets set RATE_LIMIT_HMAC_SECRET=YOUR_RANDOM_SECRET
pnpm dlx supabase functions deploy places
```

`RATE_LIMIT_HMAC_SECRET` should be a long random value. Keep it in the Supabase
secret store only.

## 3. Local live environment

Copy the example and change the data mode:

```powershell
Copy-Item .env.example .env
```

Set these values in `.env`:

```dotenv
EXPO_PUBLIC_DATA_MODE=live
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_PLACES_PROXY_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/places
EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY=YOUR_BROWSER_RESTRICTED_KEY
GOOGLE_MAPS_IOS_API_KEY=YOUR_IOS_RESTRICTED_KEY
GOOGLE_MAPS_ANDROID_API_KEY=YOUR_ANDROID_RESTRICTED_KEY
```

Then restart Metro so Expo embeds the changed public variables:

```powershell
pnpm exec expo start --clear
```

## 4. EAS environment

Add the same public backend variables and the target-specific native Maps key
to the EAS environment used by the build. Do not add the Google server key to
EAS; it belongs only in Supabase.

Preview and production builds intentionally fail when live mode or its backend
variables are missing. This prevents a TestFlight or Play build from showing
the local demo restaurants.

SDK 55 EAS Updates must also select their environment. The same configuration
guard runs before the update bundle is published:

```powershell
pnpm dlx eas-cli update --environment production
```

Do not publish a release update without the `--environment production` flag.

## 5. Verify

On the iPhone build:

1. Allow foreground location access.
2. Confirm Home and Map show businesses that also exist in Google Maps.
3. Move the map and press **Search this area**.
4. Search a known nearby restaurant by name.
5. Open a result, save it, and open in-app directions.
6. Deny location once and confirm manual area search still works.

The app displays a Halal label only when a current trusted verification record
exists in `halal_verifications`; Google category data alone never creates a
Halal claim.
