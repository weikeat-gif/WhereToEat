# MakanMana product brief

## Problem it solves

Choosing where to eat is often slower than it should be. People switch between
maps, social posts, reviews, opening-hours pages, and group chats, then still
cannot tell which nearby choice fits tonight's distance, budget, opening time,
or trusted Halal requirement.

MakanMana turns that scattered decision into one short flow: choose the area or
current location, narrow the valid nearby results, compare them on a list or
map, and either choose directly or let Surprise me make the final call.

## Main MVP

1. Browse as a guest using current location or a manually entered area.
2. Search nearby restaurants through Google Places.
3. Keep Home and Map synchronized to one location, result set, and filter set.
4. Filter by open status, radius, price, category, and verified-only Halal.
5. Open restaurant details, hours, photos, and an in-app GPS driving route
   without leaving MakanMana.
6. Pick a random restaurant only from the current valid results.
7. Sign in with Google, Apple, or email when saving.
8. Sync saved places to the signed-in account.
9. Use system, warm-light, or cinematic-dark appearance.
10. Present English copy through localization-ready infrastructure.

## Necessary launch features

- Clear permission denial, no-results, offline, API, rate-limit, and missing-photo
  states.
- Trusted Halal records with an issuer, source, verification date, and expiry;
  absence of proof must never become a Halal claim.
- Protected server-side Places key, field masks, quotas, caching, and shared rate
  limiting.
- User-scoped database row-level security for favourites.
- Screen-reader labels, non-colour cues, AA contrast, large-text support, and
  practical touch targets.
- Restricted platform Maps keys, monitored billing, production Auth redirects,
  CAPTCHA for email OTP, and verified universal/app links.
- Native iOS and Android device testing before TestFlight or Play release.

## Business model and first promotion pilot

MakanMana stays free for diners and uses Google Places for dependable restaurant
discovery. MakanMana adds trusted local information, such as independently
verified Halal records, then gives restaurants an optional paid way to reach
nearby diners.

The first pilot is deliberately small:

- An operator schedules a promotion for a real Google Place ID in Supabase.
- The restaurant moves above organic results only while that promotion is
  active and always carries a visible **Sponsored** label.
- Opening a sponsored restaurant records one unique profile viewer per
  promotion and account. It does not store the diner's GPS coordinates.
- Paying for promotion never creates or changes a Halal verification.

Campaigns are managed manually for the pilot. A merchant portal, payments,
campaign dashboard, and broader analytics should be built only after restaurants
have paid for and renewed this simpler service. Unique viewers are a directional
interest signal and must not be used as a billing basis because anonymous
accounts can be recreated.

## Useful post-MVP additions

- Malay, Simplified Chinese, and Tamil.
- Group voting and shareable shortlists.
- Dietary and cuisine preferences with explainable recommendations.
- Better opening-hours confidence and “open until” filtering.
- Curated lists, friend recommendations, and reporting stale information.
- Privacy-respecting personalization based on explicit user choices.
