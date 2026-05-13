# SEO Sprint Block C - Publish + KPI + SOP

Date: 2026-05-06
Owner: Growth + Engineering
Scope: outflint storefront (www.outflint.pk)

## 1) Publish Checklist (Go-Live)

- [ ] Deploy latest `main` to production and confirm build is green.
- [ ] Verify canonical host redirects:
  - `http://www.outflint.pk/*` -> `https://www.outflint.pk/*`
  - `https://outflint.pk/*` -> `https://www.outflint.pk/*`
- [ ] Confirm `robots.txt` is live and has correct allow/disallow rules.
- [ ] Confirm `sitemap.xml` is reachable and returns 200.
- [ ] Confirm key route canonicals are absolute and use `https://www.outflint.pk`.
- [ ] Confirm analytics mode behavior:
  - If GTM ID exists -> GTM is primary.
  - If GTM ID missing -> direct GA + optional Meta/TikTok snippets run.
- [ ] Verify AdSense assets:
  - `google-adsense-account` meta tag present.
  - `adsbygoogle.js` loaded.
  - `/ads.txt` returns `200`, `Content-Type: text/plain`, and the Google `DIRECT` line (see `app/ads.txt/route.ts` + `lib/seo/google-adsense.ts`; excluded from `proxy.ts` matcher so crawlers always get the file body).
- [ ] In GSC: submit sitemap and request re-indexing for priority pages.

## 2) Priority URLs to Validate

### Homepage + Core Routes
- `https://www.outflint.pk/`
- `https://www.outflint.pk/collections`
- `https://www.outflint.pk/contact`
- `https://www.outflint.pk/search?q=presser+foot`

### Top Collections (Money Pages)
- `https://www.outflint.pk/collections/presser-foot-collection`
- `https://www.outflint.pk/collections/stitching-accessories`
- `https://www.outflint.pk/collections/sewing-storage-and-organizer-cases`

### Section Listing Indexability
- `https://www.outflint.pk/s/needle-storage-case?sort=latest`
- `https://www.outflint.pk/s/needle-storage-case?stock=in`

## 3) KPI Targets (Next 14 Days)

### Indexing Health
- Valid indexed pages: +20% vs current baseline.
- "Discovered - currently not indexed": reduce by >= 30%.
- "Crawled - currently not indexed": reduce by >= 25%.
- "Excluded by noindex" for intended indexable money pages: 0.

### CTR + Ranking
- Top 3 tuned collections average CTR: +1.5 percentage points.
- Average position for core commercial queries: improve by >= 3 positions.
- Branded + non-branded clicks combined: +15%.

### Engagement Proxy
- Product page sessions from organic: +15%.
- Collection-to-product click-through rate: +10%.

## 4) SOP (Weekly SEO Operations)

### Monday - Technical Integrity
- Check GSC coverage for new errors and regressions.
- Validate canonical/robots/sitemap responses for top pages.
- Check 4xx/5xx spikes from hosting logs or analytics monitors.

### Wednesday - Content + Metadata Quality
- Review 20 lowest CTR high-impression pages.
- Refresh title/description with intent terms and cleaner value proposition.
- Ensure internal links from homepage/collections to priority products.

### Friday - Experiment + Reporting
- Run one metadata experiment on a selected collection or product cluster.
- Compare 7-day vs previous 7-day CTR/position/clicks.
- Document winners and roll forward patterns.

## 5) Change Control Rules

- Keep one canonical host only: `https://www.outflint.pk`.
- Never add `noindex` to revenue pages unless explicitly required.
- For faceted URLs, only allow approved params (`sort`, `stock`, `min`, `max`).
- Any SEO migration must be reversible and have a narrow subject scope.

## 6) Next-Week Queue (Execution Order)

1. Add FAQ schema snippets for top 10 products where content is available.
2. Add review collection system (real reviews only) to unlock valid `aggregateRating`.
3. Build internal linking widgets: related collections + buyer guides on PDPs.
4. Publish 3 buyer-intent guides (Urdu/English mix optional) targeting long-tail terms.
5. Set weekly automated report (GSC + GA4) for indexing and CTR movement.

## 7) Done Definition for This Sprint

- Block A complete and deployed.
- Block B complete and deployed (including top collection intent tuning migration).
- Block C document exists with checklist, KPI targets, SOP, and queue.
- Production verification pass completed with no critical SEO blockers.
