# Domain Finder

Drop a CSV or paste company names, get back `company, domain, source`.

Order: cache → Clearbit Autocomplete (free) → Cognism company enrich (no credits) → Clay webhook (leftovers only).

## Deploy (GitHub → Vercel)

1. Push this folder to a new GitHub repo.
2. Vercel → Add New Project → import the repo. No framework, no build command.
3. Vercel → Storage / Marketplace → add **Upstash Redis** and connect it to the project.
   This sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Needed for the cache and Clay.
4. Project → Settings → Environment Variables, add from `.env.example`:
   `ACCESS_CODE`, `COGNISM_API_KEY`, `CLAY_WEBHOOK_URL`, `CLAY_WEBHOOK_TOKEN`, `CLAY_CALLBACK_SECRET`.
5. Redeploy.

## Check Cognism first

The field names Cognism returns aren't confirmed yet. After deploying, run:

```
curl -H "x-access-code: YOUR_CODE" "https://YOUR-APP.vercel.app/api/test_cognism?name=Hyve%20Group"
```

If the domain is under a field `pickDomain()` in `lib/domain_sources.js` doesn't check, add it there.
If the enrich call returns 400, the request body shape needs adjusting in `cognismEnrichRaw()`.

## Clay setup

1. New table → Add → Webhooks → Monitor webhook. Copy the URL (and auth token if you set one) into Vercel env.
2. Incoming columns: `job_id`, `company_name`.
3. Add your domain-finding enrichment on `company_name` (e.g. Clay's company-to-domain waterfall).
4. Add an **HTTP API** column at the end:
   - Method `POST`, URL `https://YOUR-APP.vercel.app/api/clay_callback`
   - Header `x-callback-secret: <CLAY_CALLBACK_SECRET>`
   - Body: `{ "job_id": "{{job_id}}", "company_name": "{{company_name}}", "domain": "{{your domain column}}" }`
   - Set it to run when the domain column finishes, including when it's empty, so misses come back too.

Clay webhook sources cap at 50,000 submissions total. Make a new webhook when you hit it.

## Files

- `public/index.html` — drag and drop page, batching, CSV download
- `api/resolve.js` — Clearbit + Cognism for up to 50 names per call
- `api/clay_send.js` / `api/clay_callback.js` / `api/clay_status.js` — Clay round trip
- `api/config.js` — tells the page which sources are on
- `api/test_cognism.js` — raw Cognism response for debugging
- `lib/normalize.js` — name cleaning and the strict match rule for Clearbit
- `lib/domain_sources.js` — Clearbit and Cognism calls
- `lib/kv.js` — Upstash REST client
