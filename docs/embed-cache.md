# Public iframe resilience

Only `/lot/live/[token]`, its auction variant, and `/pedigree/live/[token]` use this policy. Admin pages, authentication, bidding, Pweb scripts and Hippomundo are unchanged.

- Full-page ISR with a 60-second revalidation interval shares the rendered output between visitors. The first request generates a page; simultaneous requests collapse into that generation.
- Existing `?site=auction` URLs rewrite internally to `/lot/live/[token]/auction`. This gives `.auction` and `.be` separate full-page cache keys without changing the embed code.
- Public RPC responses also use the Next data cache, sharing data between site variants. Refresh happens on demand in the background; edits can take approximately one to two refresh cycles plus regeneration time to appear. An already open iframe does not refresh itself.
- RPCs have an eight-second timeout. Upstream HTTP errors, invalid JSON and malformed horse data throw instead of producing a false 404. ISR retains a previously generated page when regeneration fails.
- A successful null RPC response still produces a genuine 404 for unpublished/unknown tokens. Withdrawing previously published content is subject to cache refresh; cached public content can remain visible during an upstream outage.
- This protects previously warmed pages from transient database failures. It cannot serve a page that has never been generated during a database outage, survive all hosting outages, or guarantee provider quotas. New deployments need warming again.

## Verification

Run `npm run test:embed-cache`. This builds and runs production Next.js against local mock public RPCs. It sends six bursts of 500 simultaneous HTTP requests, verifies site isolation and cache reuse, waits for real expiry, simulates a 503 database outage, and checks automatic publication-update recovery. It does not load-test the real Supabase project or third-party sites. Its build uses a local fixture URL; rebuild with the real production variables before any deployment.

Before auction traffic, warm both lot variants and the pedigree URLs for every published token. After deploying, verify repeated GET responses show `x-vercel-cache: HIT` (or `STALE` during refresh), check the horse content and site variant, and inspect runtime errors. Do not delete a warm cache immediately before an event.
