# MakanMana Supabase setup

Apply migrations before deploying `functions/places`, then set the function
secret `GOOGLE_PLACES_API_KEY`. The function reads the platform-provided
`SUPABASE_URL` and `SUPABASE_ANON_KEY`; no Google or service-role secret belongs
in Expo public environment variables.

In the Supabase Auth dashboard:

- enable Google and add `makanmana://auth` to the redirect allow list;
- enable Apple for the iOS bundle ID `com.makanmana.app`;
- configure the email template to send `{{ .Token }}` for one-time-code entry.

Google and Apple provider-console client IDs/secrets remain dashboard/server
configuration. Apple OAuth client secrets require rotation if a web OAuth flow
is later added. The current Edge Function uses isolate-local rate limiting and
30-second caching as hooks; replace them with a shared store before relying on
them for multi-region abuse prevention or cache consistency.
