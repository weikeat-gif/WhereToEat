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

## Useful post-MVP additions

- Malay, Simplified Chinese, and Tamil.
- Group voting and shareable shortlists.
- Dietary and cuisine preferences with explainable recommendations.
- Better opening-hours confidence and “open until” filtering.
- Curated lists, friend recommendations, and reporting stale information.
- Privacy-respecting personalization based on explicit user choices.
