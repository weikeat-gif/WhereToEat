# MakanMana Supabase setup

Apply all migrations before deploying `functions/places`, then set the
function secret `GOOGLE_MAPS_SERVER_API_KEY`. Enable both Places API (New) and
Routes API for that server key. `GOOGLE_PLACES_API_KEY` remains a
backwards-compatible fallback while existing environments are migrated. The
function reads the platform-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`; no Google or service-role secret belongs in Expo
public environment variables.

Create a random rate-limit signing secret and store both server secrets:

```powershell
supabase secrets set GOOGLE_MAPS_SERVER_API_KEY=...
supabase secrets set RATE_LIMIT_HMAC_SECRET=...
```

In the Supabase Auth dashboard:

- enable anonymous sign-ins so guest discovery receives a short-lived user JWT;
- enable Google and add `makanmana://auth` to the redirect allow list;
- enable Apple for the iOS bundle ID `com.makanmana.app`;
- configure the email template to send `{{ .Token }}` for one-time-code entry.

Google and Apple provider-console client IDs/secrets remain dashboard/server
configuration. Apple OAuth client secrets require rotation if a web OAuth flow
is later added.

Nearby discovery requests up to 20 real food businesses ranked by distance,
which is the current Google Nearby Search (New) response limit.
The supported discovery set includes restaurants, cafés, bakeries, coffee
shops, food courts, takeaway shops, dessert shops, and ice-cream shops. Google
may return fewer results depending on density, radius, ranking, availability,
quota, and its own data coverage.

The deployed function receives the Supabase publishable key only in the
`apikey` header. `Authorization` must contain a real signed-in or anonymous-user
session JWT with an authenticated role and non-empty user subject; a reusable
project anon JWT is rejected. Google server credentials never ship in the app.
Nearby and route requests are restricted to the Klang Valley service boundary;
routes are also capped at 100 km. Requests use a stricter local burst limit and
consume a durable Postgres rate bucket through the service role. Deploy
`202607240001_places_rate_limits.sql` before enabling live routes. Google route
and Places responses are not cached. Rate-limit bucket identifiers use a
server-keyed HMAC and rows older than 24 hours are deleted.

## Manual restaurant promotion pilot

Promotions are operator-managed in Supabase. Restaurants cannot write promotion
rows, alter their measurement events, or buy a verification label. Add a
time-limited campaign using the restaurant's real Google Place ID:

```sql
insert into public.restaurant_promotions
  (google_place_id, starts_at, ends_at)
values
  ('GOOGLE_PLACE_ID', now(), now() + interval '14 days')
returning id;
```

Redeploy `functions/places` after applying
`202607270001_restaurant_promotions.sql`. Active campaigns are enriched into
Google Places results by the protected function and the app shows the fixed
label **Sponsored**. Signed-in and anonymous Supabase sessions can record one
profile view per campaign through `record_promotion_view`; the underlying tables
remain private.

Measure the pilot from the Supabase SQL editor:

```sql
select promotion_id, count(*) as unique_profile_viewers
from public.promotion_events
group by promotion_id;
```

This is an interest metric, not proof of a restaurant visit or purchase. Keep
payments and campaign administration manual until repeat demand is validated.
Anonymous accounts can be recreated, so do not bill a restaurant from this
count.

Promotion events contain an account identifier and must be deleted after 90
days. Until an automated retention job is introduced, the operator must run this
cleanup at least monthly:

```sql
delete from public.promotion_events
where created_at < now() - interval '90 days';
```
