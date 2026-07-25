# MakanMana Supabase setup

Apply both migrations before deploying `functions/places`, then set the
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
