# MakanMana

MakanMana is an English-first iOS and Android restaurant-discovery app built
with Expo SDK 55, Expo Router, Google Places, and Supabase.

## Local development

```powershell
Copy-Item .env.example .env
pnpm install
pnpm start
```

The default `EXPO_PUBLIC_DATA_MODE=mock` keeps local development independent of
production credentials.

For a laptop browser preview with a fresh Metro cache:

```powershell
pnpm exec expo start --web --clear
```

The web app stays centred in a 430 px phone canvas so editing at a desktop
resolution does not stretch the mobile UI.

## Google Maps configuration

- `GOOGLE_MAPS_IOS_API_KEY`: restricted native iOS key used only while building.
- `GOOGLE_MAPS_ANDROID_API_KEY`: restricted native Android key used only while building.
- `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY`: browser-restricted Maps Embed API key.
- `GOOGLE_MAPS_SERVER_API_KEY`: server-only Places/Routes key set as a Supabase secret.

EAS builds fail early if their target native Maps key is missing. Never prefix
the server key with `EXPO_PUBLIC_`; see `supabase/README.md` for the JWT,
database-rate-limit migration, and Edge Function setup.

Before live testing, enable Supabase anonymous sign-ins. Guest discovery uses
that anonymous-user session JWT for the protected Edge Function while the UI
continues to treat the person as a guest until Google, Apple, or email sign-in.

## Verification

```powershell
pnpm verify
```

## Architecture

- `src/app`: Expo Router route entry points
- `src/features`: feature-owned UI and state
- `src/contracts`: shared app types
- `src/services`: service interfaces and adapters
- `src/theme`: light/dark semantic design tokens
- `supabase`: database migrations and edge functions

The selected visual reference is stored under `docs/reference`.
The product problem, MVP, launch requirements, and post-MVP scope are in
`docs/product/mvp.md`.
