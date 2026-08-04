# Pre-launch readiness

## Implemented Priority 0 behavior

- Search query criteria, filters, visible chips, filter badge, results list, and
  map markers share the Search provider state. `Clear all` also removes explicit
  Assistant defaults while preserving the selected area or current location.
- OpenStreetMap boundary results display a concise boundary type, retain source
  attribution, and continue to filter both the visible list and map data.
- Dense pins cluster without changing restaurant coordinates. A cluster zooms;
  a restaurant marker selects and highlights the matching list row before the
  user opens details.
- Sign-in and the Food Assistant have visible safe-area exits with direct-route
  fallbacks. Leaving the Assistant cancels its pending unsaved inference.
- Signed-in Profile and the public `/delete-account` route require confirmation.
  The Edge Function verifies the user, requires session-bound interactive-auth
  evidence within ten minutes, and deletes user-owned rows through database
  cascades. Local account area history is removed after successful deletion.
- Core controls use explicit accessibility names, decorative tab/control icons
  are hidden from accessibility names, frequent actions are at least 44 points,
  and result/status changes use live announcements.

## External release blockers

- Deploy the static web build to a stable HTTPS origin and provide
  `https://<production-origin>/delete-account` to Google Play. No production web
  origin is configured in this repository, so the store URL cannot be submitted
  from local code alone.
- Configure `APPLE_CLIENT_ID` and `APPLE_CLIENT_SECRET`, deploy both account
  functions, and production-test the implemented Apple authorization-code
  exchange and REST revocation with a real Sign in with Apple account.
- Run VoiceOver, TalkBack, large-text, location permission, and deletion tests on
  physical iOS and Android devices. Web screenshots and Jest do not prove those
  native behaviors.
- Complete TestFlight and Play closed-testing disclosure checks with real store
  credentials. Those external accounts and credentials are not available in the
  local workspace.

Priority 1 may proceed for a controlled beta, but the blockers above keep the
public-store readiness decision at **not ready** until verified externally.

## Implemented Priority 1 behavior

- Empty Assistant searches offer explicit distance, open-now, and preference
  recovery actions while retaining dietary and verified-Halal requirements.
- Restaurants without photos use a compact accessible placeholder, and detail
  loading reserves that same first-viewport space with theme colors.
- The map explains foreground location use before the OS prompt and offers a
  direct manual area-search path. Only a granted GPS result is labelled as the
  current location.
