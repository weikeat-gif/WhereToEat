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
