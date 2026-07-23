# MakanMana final QA and release audit

Date: 2026-07-24
Audited commit: `dda09ce` (`main`)
Decision: **NO-GO for production beta distribution**

The mock-mode app is suitable for an internal web demo, but the live Places
path, cross-screen place flow, accessibility contrast, and release environment
must be corrected before TestFlight or Play closed testing.

## Executable verification

| Check | Result |
| --- | --- |
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm test` before QA additions | Pass: 13 suites, 23 tests |
| Focused Map and Saved tests | Pass: 2 suites, 7 tests |
| `pnpm exec expo config --type public` | Pass; SDK 55 config resolves |
| `pnpm exec expo install --check` | Fail: React Native patch mismatch |
| `pnpm dlx expo-doctor@latest` | Fail: 18/19 checks pass; same mismatch |
| `pnpm exec expo export --platform all` | Pass: iOS, Android, and web bundles plus 12 static routes |

The initial parallel lint/typecheck/test invocation exceeded the command
orchestration timeout and returned no trustworthy result. Each command was then
run individually and passed.

The full Jest run emits repeated React `act(...)` warnings from asynchronous
Expo vector-icon loading. Focused tests also expose the React Native 0.83
`SafeAreaView` deprecation in Map and `ScreenPlaceholder`. The web development
runtime emits only the known Expo Router `pointerEvents` deprecation warning;
no JavaScript errors were observed.

## Runtime coverage

Current browser QA used the mock adapter at a 393 x 852 mobile web viewport.

- Home rendered in dark mode and retained the intended four-tab layout.
- Web Map fallback rendered current coordinates, result pins, filters, and
  Search this area.
- Location denial produced an alert and manual-area guidance.
- Typing and selecting Klang worked and produced the expected empty state.
- Surprise me selected a current result; Try another selected a different one.
- Saved gated a guest and opened the mock-disabled Auth screen.
- System/Light/Dark controls changed appearance and persisted Light on web.
- An unknown Details URL incorrectly rendered Jalan 21 Burger.
- A guest could toggle Save on that unknown Details URL without authentication.
- Home's Halal chip left all three discovery cards visible and reported
  "3 late-night picks ready."

iOS and Android coverage is limited to Metro/Hermes export, Expo config, unit
tests, and static review. No physical device or simulator run was performed.
Native maps, OS permission approval, Apple sign-in, Google sign-in, and Supabase
session/persistence behavior remain unverified with production credentials.
The granted-location branch is covered by a unit test; denial/manual fallback
is covered by both a unit test and the web runtime.

## Release blockers

### P0 — Live Places client and function contracts do not match

The client calls three REST-style endpoints and expects normalized app models:

- `POST /autocomplete` with `{ input, sessionToken }`
- `POST /search` with `{ criteria }`
- `GET /places/:id`

The Supabase function accepts only `POST` action envelopes at one URL:

- `{ action: "autocomplete", input, sessionToken }`
- `{ action: "nearby", latitude, longitude, radiusMeters, includedTypes }`
- `{ action: "details", placeId }`

The function also returns raw Google fields such as `displayName` and
`location`; it does not return the normalized `SearchResults` or `PlaceDetails`
shape expected by `LivePlacesService`. Live autocomplete, search, and details
therefore cannot pass together.

Required fix: establish one canonical endpoint contract, normalize Google
payloads to shared app models, apply all filters, and add an integration test
that wires `LivePlacesService` to the function handler.

### P0 — Discovery, Details, and Saved are not connected end to end

- Home always renders and writes `DISCOVERY_PLACES`; it does not call the active
  mock/live adapter.
- Home filters do not filter the rendered cards. This includes verified-only
  Halal.
- Map result cards and markers cannot navigate to Details.
- Details reads only `DISCOVERY_PLACES` and silently substitutes the first demo
  place for any unknown/live place ID.
- Details Save is local component state. It bypasses the guest auth gate and
  never reads or writes the Supabase saved repository.

Required fix: render shared search results on Home; route Map results to
Details; load Details through `PlacesService.getPlaceDetails`; add
loading/not-found/network/rate-limit states; and wire Save to Auth plus the
saved repository.

### P1 — Expo SDK dependency validation fails

Expo `55.0.28` expects `react-native@0.83.6`; the project pins
`react-native@0.83.10`. Both `expo install --check` and Expo Doctor fail.

Required fix: use Expo's SDK-aware installer to align React Native, commit the
package and lockfile changes, and rerun the full verification/export matrix.

### P1 — Light-theme contrast fails WCAG AA

Measured contrast:

| Pair | Ratio |
| --- | ---: |
| Light accent on page background | 1.32:1 |
| Light accent on navigation background | 1.37:1 |
| Light Halal chip label on tint | 3.85:1 |
| Light price chip label on tint | 4.22:1 |
| Light supper chip label on tint | 3.61:1 |
| Light cafe chip label on tint | 4.25:1 |
| Dark accent on background | 16.64:1 |
| Dark muted text on background | 8.73:1 |

The light failures affect meaningful small text and icons, including the active
tab and semantic filters. Keep lime for filled surfaces with dark
`accentText`, but add a darker light-theme foreground token and darken semantic
label colors or their backgrounds. Add contrast assertions for actual
foreground/background pairings.

### P1 — Release environment is not resolved locally

Resolved public config has no EAS project ID, Google Maps keys, or live backend
configuration. Without build-environment values, the app defaults to mock data
and Auth remains disabled. Android's production Google map also requires its
external Maps API key.

Required before build:

- link/verify the EAS project and production environment;
- set live Supabase URL/anon key and Places function URL;
- set platform map keys where required;
- configure Supabase Google/Apple providers and redirect allow lists;
- verify Apple Developer/App Store Connect and Google Play credentials.

TestFlight and Play closed-testing builds/uploads require external credentials
and were not attempted.

## Additional functional findings

- **P1:** `filterCurrentHalalRecords` accepts any HTTPS source, and the database
  has no JAKIM source/domain allowlist. Enforce the same trusted-source policy at
  ingestion/function/UI boundaries before claiming "Verified Halal."
- **P1:** Auth operations set an error and then rethrow, while press handlers
  discard the promise with `void`; cancellation and backend failures can become
  unhandled promise rejections.
- **P2:** Signed-in users have no discoverable sign-out path in Profile. Sign
  out exists only on the direct Auth route.
- **P2:** Home's location control has button semantics but no action.
- **P2:** Map's top location button is announced as "◎" rather than by purpose.
- **P2:** Saved loading has no accessible label/status announcement, and Remove
  has no explicit minimum 44 x 44 target or hit slop.
- **P2:** On web, previously visited tab screens remain in the accessibility
  tree after navigation. After Home → Map → Saved, all three screen contents
  were exposed together even though only the active screen was visible.
- **P2:** Theme radios have no `aria-checked` state in the rendered web DOM, so
  the selected option is not announced reliably.
- **P2:** Several 36px chips are below the recommended 44px touch target.
- **P2:** Large-text risk remains in the fixed-height Home hero and tab bar,
  Details open-status row/fixed footer, and the non-scrollable Auth placeholder.
- **P3:** Map and `ScreenPlaceholder` import deprecated React Native
  `SafeAreaView` instead of `react-native-safe-area-context`.

## State coverage

| Area | Status | Evidence |
| --- | --- | --- |
| Home visual/navigation | Pass in mock web | Runtime at 393 x 852 |
| Home adapter/filter behavior | Fail | Static + Halal runtime check |
| Map mock results | Pass | Runtime + unit tests |
| Web map fallback | Pass | Runtime + all-platform export |
| Location granted | Pass in unit test only | `location.test.ts` |
| Location denied/manual | Pass | Unit + runtime |
| Surprise/Try another | Pass | Unit + runtime |
| Loading/empty/error/retry | Pass for Map | Existing UI + focused tests |
| Rate-limit/offline mapping | Pass at service/Map UI level | Existing + focused tests |
| Details loading/error/live | Fail | No adapter/state path |
| Saved guest gate | Pass on Saved tab | Runtime + focused test |
| Details guest save gate | Fail | Runtime |
| Supabase session restore | Pass in unit test | `auth-provider.test.tsx` |
| Live Auth providers/session | Blocked | External configuration |
| Verified-only Halal | Partial/fail | Mock service passes; Home/live fail |
| Light/dark/system switching | Functional | Runtime + profile test |
| Theme accessibility | Fail | Contrast + web radio-state audit |
| iOS/Android bundle export | Pass | Credential-free Expo export |
| Native device behavior | Not run | No simulator/device credentials |

## Acceptance checklist

- [x] Lint passes.
- [x] TypeScript passes.
- [x] Full unit suite passes.
- [x] iOS, Android, and web exports complete without credentials.
- [x] Mock web Home, Map fallback, empty, denial/manual, Surprise, Saved gate,
      Auth-disabled, Details, and theme controls were exercised.
- [ ] Expo Doctor passes all checks.
- [ ] Live Places client/function integration passes.
- [ ] Home, Map, Details, and Saved share one place-data flow.
- [ ] Unknown place IDs show not-found instead of unrelated content.
- [ ] Guest save routes to Auth; signed-in save persists and reloads.
- [ ] Verified Halal is enforced from a trusted JAKIM source at every boundary.
- [ ] Light-theme text/icon contrast meets WCAG AA.
- [ ] Web tabs and radios expose correct accessibility state.
- [ ] Dynamic Type/large text and 44px targets pass on representative devices.
- [ ] Production EAS project, live backend, Maps, and Auth environments resolve.
- [ ] iOS native map, permissions, Apple/Google Auth, and session restore pass.
- [ ] Android native map, permissions, Google Auth, and session restore pass.
- [ ] TestFlight build/upload succeeds with Apple credentials.
- [ ] Play closed-testing build/upload succeeds with Google Play credentials.
