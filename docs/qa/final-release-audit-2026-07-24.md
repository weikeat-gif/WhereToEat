# MakanMana final QA and release audit

Date: 2026-07-24

Integrated application commit: `784fcaa`

Decision: **GO for local/mock testing; credentials required for store beta**

The English-first Expo application now has a connected Home → Map → Details →
Saved flow, matching warm-light and cinematic-dark themes, and a working
mock-data mode. The source is ready for local iOS, Android, and web testing.
TestFlight and Play closed testing remain external release steps because this
workspace does not contain the user's Apple, Google, EAS, Maps, or production
Supabase credentials.

## Executable verification

| Check | Result |
| --- | --- |
| `pnpm verify` | Pass: lint, TypeScript, 21 suites, 73 tests |
| `pnpm exec expo install --check` | Pass: dependencies match Expo SDK 55 |
| `pnpm dlx expo-doctor@latest` | Pass: 19/19 checks |
| `pnpm exec expo export --platform all --output-dir dist-qa` | Pass: iOS, Android, web, 12 static routes |
| `pnpm audit --prod --audit-level high` | Pass: no high/critical findings |

The dependency audit reports one moderate advisory in Expo's transitive
build-time `xcode > uuid@7.0.3` path. There is no direct safe application-level
upgrade without moving outside Expo SDK 55's supported dependency graph.

## Closed QA findings

- The live Places client and Supabase function now use one POST action-envelope
  contract, normalize raw Google payloads, and have an end-to-end handler/client
  contract test.
- Autocomplete now returns prediction labels in one request and resolves
  coordinates only after selection, avoiding request amplification while typing.
- Home renders shared search results and applies open, price, category, and
  verified-only Halal criteria instead of injecting fixtures after a search.
- Home and Map share criteria/results; Map cards and map pins open Details.
- Details loads unknown/live IDs through `PlacesService`, reports loading/error
  states, never substitutes an unrelated restaurant, gates guests through Auth,
  and persists signed-in saves through the shared Saved provider.
- Saved state is shared across screens, owner-tagged state hides the previous
  account synchronously, stale loads/mutation rollbacks are rejected, and a
  bounded-concurrency virtualized list caches resolved restaurant names with
  links back to Details.
- Mobile Supabase sessions use chunked Expo SecureStore storage, migrate legacy
  AsyncStorage sessions, and retry plaintext cleanup after secure reads/writes.
- iOS uses Expo's native Apple Authentication button.
- Profile provides a reachable account route for sign-in and sign-out management.
- Auth restore, theme hydration, manual-area selection, slow area resolution,
  and slow current-location races have regression coverage.
- Failed area resolution enters the shared error state, and mobile-to-proxy plus
  Edge-to-upstream Places requests use explicit 10-second abort deadlines.
- Details uses real open/closed/unknown status and a labelled no-photo state
  instead of unrelated fixture imagery.
- Share and Directions failures are announced safely without unhandled OS
  promise rejections.
- Halal enrichment accepts only current `JAKIM Halal Malaysia` records on exact
  `halal.gov.my` hosts; missing, expired, malformed, or lookalike records are not
  presented as verified.
- Edge Function fallback cache and rate-limit maps have hard entry caps; shared
  production enforcement remains required across function isolates.
- React Native is aligned to Expo's expected `0.83.6`.
- Light-theme accent and semantic label foregrounds meet automated WCAG AA
  contrast assertions while lime remains the filled-action colour.
- Theme radios expose checked state on web, inactive tab scenes are hidden from
  assistive technology, and primary chips/removal controls meet 44 px targets.
- Core safe-area imports use `react-native-safe-area-context`; test icon loading
  is stabilized to keep the suite warning-free.

## Remaining production setup

These are credential/infrastructure tasks, not local code failures:

- Link the EAS project and provide `EAS_PROJECT_ID`.
- Set production Supabase URL/anon key and deploy the Places Edge Function.
- Put production rate limiting/cache in shared infrastructure and add platform
  attestation or another abuse-control layer before exposing guest Places search.
- Configure restricted iOS/Android Google Maps keys.
- Configure Supabase Google/Apple/email providers, redirect allowlists, CAPTCHA,
  and universal links.
- Run native accessibility checks for screen reader, Dynamic Type, touch targets,
  location approval/denial, maps, and provider authentication.
- Run `eas build`/`eas submit` with the user's Apple Developer/App Store Connect
  and Google Play accounts, then complete TestFlight and Play closed testing.

## Acceptance status

- [x] English-first Home, Map, Saved, Profile, Auth, and Details.
- [x] Warm light, cinematic dark, and system theme selection.
- [x] Colourful labels use text/icons and pass automated light contrast checks.
- [x] Current-location denial/manual fallback and stale-result protection.
- [x] Shared list/map search criteria, filters, and results.
- [x] Surprise me uses only current valid results.
- [x] Guest save gate and account-scoped saved repository/RLS.
- [x] Trusted-only Halal rules at app and function boundaries.
- [x] Offline, empty, missing-photo, invalid-details, API, and rate-limit states.
- [x] Lint, TypeScript, unit/integration tests, Expo Doctor, and all-platform export.
- [ ] Production credentials and live service deployment.
- [ ] Physical iOS/Android accessibility and provider testing.
- [ ] TestFlight and Play closed-testing builds/uploads.
