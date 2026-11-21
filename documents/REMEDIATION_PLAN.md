# NigerianDirectory — Remediation Plan

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-11-21 |
| **Based on** | Data, SEO/GEO and ads audit of 2026-11-21 |
| **Evidence** | [`audit/2026-11-21-flagged-records.csv`](audit/2026-11-21-flagged-records.csv): 467 issues across 408 records |
| **Supersedes** | The data and SEO sections of `TODO.md` (2026-02-23) |

---

## 1. Purpose

The audit found that the site is not yet accurate or optimised enough to grow on:

| Area | Result | Target |
|---|---|---|
| University identity (name, state, type) | 96% correct | ≥ 98% |
| University content clean and on-topic | 49% | ≥ 90% |
| Secondary schools independently verified | 22% (5% wrong, 73% unverifiable) | ≥ 95% verified |
| Secondary school content clean and on-topic | 30% (122 records empty) | ≥ 90% |
| Search engines | Google verified; Bing not set up; sitemap lists dead URLs | All checks in §5 pass |
| Ads | No ad can render | Approved network serving on compliant pages |

This plan fixes the current data, sets a **data standard** that every vertical must meet, rebuilds the crawler around that standard, and only then expands. **No new vertical is crawled or published until Phases 0–3 are complete** (see §6).

## 2. How to use this plan

- Work phases in order. Within a phase, do **P0** tasks first, then P1, then P2.
- Each task has an **ID**, a **priority**, an **effort** (S < 1 day, M 1–3 days, L > 3 days), **acceptance criteria** and, where relevant, the **record IDs** from the audit CSV.
- Tick the box only when the acceptance criteria are met and verified on production.
- Record decisions and deviations in the change log (§8).

**Priorities.** P0 = blocks correctness, trust or indexing. P1 = significant quality or ranking impact. P2 = improvement.

---

## 3. Work plan

### Phase 0 — Guardrails (before touching data)

- [ ] **G-1 · P0 · S · Freeze crawling and publishing of new data.**
  Stop all crawler runs (`resume_crawl_fast.py`, `secondary_school_crawler*.py`, `crawl_images_batch.py`, scheduler) until Phase 3 is complete.
  *Accept:* no `updated_at` changes in `schools` from crawler jobs for the freeze period.

- [ ] **G-2 · P0 · S · Back up production.**
  Create a Neon branch named `pre-remediation-2026-11` from `main` (instant, copy-on-write) and export `schools`, `locations` and `contact_submissions` to CSV.
  *Accept:* the branch exists, and the exported row counts match production (713 schools).

- [ ] **G-3 · P0 · S · Do all fixes on a staging branch first.**
  Create Neon branch `remediation` and point a Vercel **preview** deployment of both projects at it. Apply every Phase 1–2 change there, verify, then apply to `main`.
  *Accept:* every Phase 1–2 change has been run on the staging branch and reviewed before production.

- [ ] **G-4 · P0 · S · Make every data fix reproducible.**
  Each fix is a committed, idempotent SQL migration or script under `backend/database/migrations/` or `crawler/fixes/`, never a manual console edit.
  *Accept:* re-running a fix makes no further changes.

- [ ] **G-5 · P1 · S · Add a URL redirect table.**
  Create `slug_redirects(old_path, new_path, status, created_at)` and serve it in `frontend/src/middleware.ts` (301). This is required before any record is merged or renamed.
  *Accept:* a merged record's old URL returns a 301 to the kept record.

---

### Phase 1 — Correct the existing records

#### 1A. Universities: duplicates and renames (P0)

For each pair: merge any useful fields into the **kept** record, delete the duplicate, and add a 301 from the duplicate's URL.

- [ ] **D-1** Drop **244** *Cross River State University of Technology* → keep **508** *University of Cross River State* (renamed).
- [ ] **D-2** Drop **257** *Federal University of Agriculture, Makurdi* → keep **356** *Joseph Sarwuan Tarka University* (renamed).
- [ ] **D-3** Drop **283** *Kano University of Science and Technology* → keep **500** *Aliko Dangote University of Science and Technology* (renamed). Move website `kustwudil.edu.ng` onto 500 if it is still the official one.
- [ ] **D-4** Drop **296** *Maranatha University, Mgbidi* → keep **415** *Maranatha University* (same website; NUC lists one).
- [ ] **D-5** Drop **297** *Mcpherson University* → keep **298**, renamed to *McPherson University, Seriki Sotayo*.
- [ ] **D-6** Drop **310** *Ondo State University of Science and Technology* → keep **506** *Olusegun Agagu University of Science and Technology* (renamed).
- [ ] **D-7** Drop **323** *Samuel Adegboyega University* → keep **398** *Glorious Vision University* (renamed); fix 398's website (see 1D).

*Accept:* 297 university rows remain, there are no two rows for one NUC entry, and all seven old URLs return 301.

#### 1B. Universities: names, types and campuses (P0)

- [ ] **N-1** **234** *Borno State University* → rename to *Kashim Ibrahim University* (NUC), with a redirect.
- [ ] **N-2** **328** *Tai Solarin University of Education* → rename to *Tai Solarin Federal University of Education*; set `type = federal`.
- [ ] **N-3** **503** *Emmanuel Ayande University of Education* → correct the spelling to *Emanuel Alayande University of Education*; update slug and redirect.
- [ ] **N-4** **341** *University of Nigeria, Enugu Campus* is a campus, not a university. Either convert it to a campus of UNN (once added in 1C) or remove it with a redirect to UNN.
- [ ] **N-5 · P1** **292** *Lagos State University of Science and Technology*: NUC's live page lists it under federal. Confirm with the institution and NUC before changing the type.

#### 1C. Universities: missing institutions (P0 for the first two, P1 for the rest)

Add from NUC's live lists with full provenance (see §4). **Priority:** University of Nigeria, Nsukka and Lagos State University, Ojo are among the most-searched universities in the country.

- [ ] **M-1 · P0** University of Nigeria, Nsukka (federal)
- [ ] **M-2 · P0** Lagos State University, Ojo (state)
- [ ] **M-3 · P1** The other 32 on NUC's live lists:

  *Private:* Millenium Crest University (Ikare Akoko, Ondo) · Abdulfattah Durojaiye University (Abeokuta, Ogun) · Euston University (Abakaliki, Ebonyi) · Adeche Momoh University (Igarra, Edo) · Sani Bello University (Kontagora, Niger) · Godday Erewa University (Sapele, Delta) · Owolabi University (Oke Ila Orangun, Osun) · Regnum Medical University (Lagos) · City University Abuja · Transatlantic University of Medicine and Health Sciences (Umuchukwu, Anambra) · Maria Assumpta University (Owerri, Imo) · High Flyers University (Ikere-Ekiti, Ekiti) · Ummah University of Nigeria (Abuja) · Pearl University (Calabar) · Omega University (Kaduna) · Crestfield University

  *State:* University of Medical Sciences, Ondo · Moshood Abiola University of Science and Technology, Abeokuta · University of Agriculture and Environmental Sciences, Umuagwo · Bamidele Olumilua University of Science and Technology, Ikere · Shehu Shagari University of Education, Sokoto · State University of Medical and Applied Sciences, Igbo-Eno · University of Ilesa · Kwara State University of Education, Ilorin · Abdulsalam Abubakar University of Agriculture and Climate Action, Mokwa · Ebonyi State University of ICT, Science and Technology, Oferekpe · Cross River University of Education and Entrepreneurship, Akamkpa · Benue State University of Agriculture, Science and Technology, Ihugh · University of Aeronautics and Aerospace Engineering, Ezza · University of Innovation, Science and Technology, Omuma · Taraba State University of Tropical Agriculture, Science, Technology and Climate Action, Gembu · Jigawa State University of Medical and Allied Health Sciences, Majia

  *Accept:* every institution on NUC's three live lists maps to exactly one database row.

#### 1D. Websites (P0)

A wrong website sends users and crawlers to another organisation, and the crawler then imports that organisation's text.

- [ ] **W-1** **282** Kaduna State University: `ssanunational.org.ng` → `https://kasu.edu.ng`.
- [ ] **W-2** Clear the wrong institution's website on 10 schools (they were given a university's or polytechnic's site): **109**, **111** (uniosun) · **117** (bellsuniversity) · **1162** (abiastateuniversity) · **1142** (fudutsinma) · **1068** (fulafia) · **1083** (tsuniversity) · **1086**, **1087**, **1089** (fedpodam).
- [ ] **W-3** Fix or clear 13 websites that do not exist in DNS: schools **2, 3, 6, 7, 10, 18, 21**; universities **379, 398, 405, 423, 426, 428**. Find each official site; if none can be confirmed, set the field to `NULL`.
- [ ] **W-4 · P1** Staff schools that share their parent university's website (e.g. 1220 *Delta State University Staff School Abraka*) keep it only if the university hosts a page for the school. Otherwise clear the field.

*Accept:* every non-null `website` resolves in DNS, and its home page title or domain matches the institution (see the ownership check in §4).

#### 1E. Secondary schools: identity (P0)

- [ ] **S-1** Resolve 18 records with invented "Federal Government (Girls) College + state name" names. Replace each with the real unity school(s) in that state, named after their towns (e.g. FGC Kebbi → *Federal Government College, Birnin Yauri*; FGGC Abia → *Federal Government Girls College, Umuahia*), or delete it.
  IDs: **83, 84, 87, 88, 89, 90, 93, 94, 96, 99, 101, 109, 117, 155, 159, 162, 1061, 1150**.
- [ ] **S-2** **1139** *Fiwasaye Girls Grammar School*: set state = Ondo, city = Akure.
- [ ] **S-3** **1243** *Christ School Ado-Ekiti Ondo*: rename to *Christ's School, Ado-Ekiti*; set state = Ekiti, city = Ado-Ekiti.
- [ ] **S-4** Set `type = federal` on 38 Federal Government Colleges stored as `public`:
  1033, 1040, 1045, 1052, 1061, 1068, 1071, 1077, 1080, 1086, 1089, 1095, 1098, 1104, 1112, 1114, 1119, 1127, 1137, 1142, 1150, 1153, 1158, 1162, 1165, 1168, 1173, 1179, 1186, 1195, 1201, 1207, 1212, 1217, 1222, 1227, 1234, 1238.
- [ ] **S-5 · P0 · L** **Verify or remove the 297 unverifiable schools.** Build an authoritative school roster (see §4.1: Federal Ministry of Education unity-school list, state ministry lists, WAEC/NECO centre lists). For each record, mark it `verified` with a source URL, or unpublish it. 216 of these came from an untracked batch added on 2026-09-30; treat that batch as unverified until each record is sourced.
- [ ] **S-6 · P1** Records named after a host institution, such as "<University> Staff School" or "<University> International School" (35 records), must link to a page on the host institution's site that confirms the school exists.

*Accept:* every published school has `verification_status = 'verified'` and a source URL. Anything else is hidden from listings, sitemaps and search.

#### 1F. Universities: field accuracy (P1)

- [ ] **F-1** Update 19 out-of-date vice-chancellors to the names on NUC's live list (IDs: 201, 212, 221, 228, 229, 232, 245, 264, 267, 271, 272, 290, 293, 306, 334, 335, 339, 342, 344). Store `principal_verified_at` so staleness is visible.
- [ ] **F-2** Resolve 5 founding-year conflicts against each university's own history page (221 Ambrose Alli 1981 vs 1980 · 248 EBSU 1999 vs 2000 · 254 ESUT 1980 vs 1982 · 306 UNIZIK 1991 vs 1992 · 338 UniJos 1971 vs 1975). Where the difference reflects "founded as a campus" versus "became independent", store the independence year and note the other.
- [ ] **F-3** Fill the 115 universities with no `established_year` and the 85 with no `website` from NUC's live lists, which give both.

#### 1G. Category and vertical hygiene (P1)

- [ ] **V-1** The one `hospital` row (**205**, LUTH) is in an unlaunched vertical and blocked by `robots.txt` (`/health/`). Leave it unpublished until the Health vertical goes through §6.
- [ ] **V-2** `frontend/src/config/verticals.ts` marks *Colleges & Polytechnics*, *Polytechnics*, *Colleges of Education*, *Primary*, *Boarding* and *Special Needs* as `live`, but the database has no records for them. Set them to `coming-soon` until they have data that meets §4.

---

### Phase 2 — Correct the content

The audit found that content was copied word for word from third-party pages and often isn't about the institution: general essays, other schools, adverts, news headlines, terms-of-service text, and in 38 cases the site citing itself. This is the largest risk to Google rankings and to ad-network approval.

- [ ] **C-1 · P0 · M · Unpublish bad content now.** For the 350 records flagged `content quality` in the CSV, clear the failing sections (or set `content_status = 'rejected'`) so pages fall back to the factual profile and are `noindex` until re-enriched.
  *Accept:* no published section opens with text about another subject, and none contains the junk patterns in §4.3.
- [ ] **C-2 · P0 · S · Remove self-citations.** Delete every `content_sources` entry on `nigeriandirectory.com.ng` (38 records), then re-assess those records.
- [ ] **C-3 · P0 · S · Rank or exclude low-trust sources.** Block AI-generated sources (e.g. `grokipedia.com`). Treat job boards and aggregators (`joberplanet.com`, `recruitmentmat.com`, `currentaffairs.com.ng`, `myspotfinder.com`, `ng.africabz.com`, `soluap.com`, `nigerianinformer.com` and similar) as low-trust: never the only source of a fact.
- [ ] **C-4 · P0 · M · Stop publishing copied text.** Text taken from another site may be used only as a short attributed quotation. Each section must be written for us from multiple sources, factual and cited. This needs a written content policy (§4.4) and a generation-plus-review step (Phase 3, CR-7).
- [ ] **C-5 · P1 · L · Re-enrich** the cleared records and the 131 empty records through the new pipeline (Phase 3), starting with the 290 NUC-verified universities, then verified schools.
- [ ] **C-6 · P1 · M · Image review.** The 636 hero and 580 logo images come from DuckDuckGo image search and have never been checked. Review a random 10% sample by eye. If more than 5% are wrong, remove images that weren't taken from the institution's own domain and re-run with the ownership rule in §4.2.
- [ ] **C-7 · P2 · S · Fix encoding.** Repair mis-decoded characters such as `â€˜` and `â€™` (20+ occurrences) by decoding as UTF-8 at fetch time.

---

### Phase 3 — Rebuild the crawler around the data standard

This is what makes future verticals right first time. Requirements are in §4. Code lives in `crawler/`.

- [ ] **CR-1 · P0 · M · Source registry.** A committed `crawler/sources/<vertical>.yaml` listing the authoritative roster for each vertical (URL, fields provided, licence, refresh frequency). Identity data may only come from a registered roster.
- [ ] **CR-2 · P0 · M · Committed seed rosters.** Every batch of records comes from a committed, dated roster file with each record's source URL. There must never be another untracked batch like the one on 2026-09-30.
- [ ] **CR-3 · P0 · M · Provenance columns.** Add `source_url`, `source_name`, `source_fetched_at` and `verification_status` (`verified` / `unverified` / `rejected`) per record, and `field_sources jsonb` mapping each field to its source. Only `verified` records are published.
- [ ] **CR-4 · P0 · M · Website ownership check.** Replace "persist the top search result" (`niche_crawler._discover_website` / `_persist_discovered_website`) with these rules:
  - The domain must resolve in DNS.
  - The page `<title>` or `og:site_name` must contain the institution's distinctive name tokens.
  - The domain must not belong to another record.
  - For schools, `.edu.ng` and `.gov.ng` domains need a name match. Never assign a university's domain to a school.
  If the check fails, leave the website `NULL`.
- [ ] **CR-5 · P0 · M · Content relevance gate.** In `niche_crawler._classify` / `_synthesise`, accept a text block only if:
  - it names the institution (distinctive tokens) or comes from its verified domain;
  - it doesn't match the junk patterns (§4.3);
  - it isn't from a blocked domain or our own domain;
  - it isn't mostly about another institution (another institution's name appears more often than this one's).
- [ ] **CR-6 · P0 · S · Undo the "save everything" policy.** `crawl_institution` currently saves sparse content anyway (`NEW POLICY: Save EVERYTHING`). Content below the quality gate must be saved as `content_status = 'draft'` and never published.
- [ ] **CR-7 · P1 · L · Write from sources instead of pasting them.** Generate each section from facts gathered across at least 2 independent sources. Store citations per sentence or paragraph, and route it to human review before publishing (see the admin review queue, CR-11).
- [ ] **CR-8 · P0 · S · Location validation.** Validate `state`, `city` and `area` against a committed table of Nigeria's 774 LGAs and their towns. Reject any record whose name or address names a town in another state.
- [ ] **CR-9 · P0 · S · Duplicate and alias detection.** Keep an `institution_aliases` table of former names, so renamed institutions (as in 1A) map to one record. Block inserts whose normalised name, website or alias matches an existing record.
- [ ] **CR-10 · P1 · S · Type rules.** Derive `type` from the roster; for example, "Federal Government College" ⇒ `federal`. A record whose name contradicts its type fails validation.
- [ ] **CR-11 · P1 · M · Admin review queue.** Add an admin page listing `unverified` and `draft` records with their sources, offering approve, edit and reject. Use it for every record a human must sign off.
- [ ] **CR-12 · P1 · M · Images.** Prefer images from the institution's verified domain (logo from `<link rel=icon>`, `og:image` or the header). For search-engine images, require the source page's domain to match and store `image_source_url`. Store a content hash to catch the same image reused across records.
- [ ] **CR-13 · P1 · M · Tests and CI.** Unit tests for every gate in §4, using fixtures of known-bad cases from this audit (e.g. the Osogbo record containing *Ebunoluwa International School* text, the *Amazon* headline, the SchoolMata byline). Run in CI and block merges on failure.
- [ ] **CR-14 · P1 · S · Committed audit script.** Turn the 2026-11-21 audit into `crawler/audit/run_audit.py`. It compares against live rosters, runs a DNS check on websites, scores content and checks the sitemap, and writes a dated CSV. Run it weekly and before every vertical launch.
- [ ] **CR-15 · P2 · S · Consolidate scripts.** Remove or archive superseded crawlers (`image_crawler.py` vs `image_crawler_fixed.py`, `content_crawler_fixed.py`, `secondary_school_crawler_remaining.py`, one-off `check_*` and `debug_*` scripts) so there is one supported pipeline.

---

### Phase 4 — Technical SEO (Google and Bing)

- [ ] **T-1 · P0 · S · Sitemap lists dead URLs.**
  - Remove `/claim/` from `frontend/src/app/(main)/sitemap.ts`; the page doesn't exist.
  - Fix `toSlug()` there, which only replaces spaces, so areas such as "Ado-Odo/Ota" produce 404 URLs. Use the slug function the routes use, and test that every sitemap URL returns 200.
  *Accept:* a sitemap crawl returns 100% 200s.
- [ ] **T-2 · P0 · S · Fix the AI sitemap** (`frontend/src/app/(main)/ai-sitemap.xml/route.ts`).
  - Remove the 64 dead URLs: `/ai`, `/api/ai/...` on the website domain, and `/education/<type>-schools`.
  - URL-encode or slug the 4 addresses with spaces.
  - Add trailing slashes so URLs don't redirect.
  - Consider merging it into the main sitemap; it duplicates 531 of its URLs.
- [ ] **T-3 · P0 · S · Return 404 for unknown states and areas.** `/education/schools/atlantis/` currently returns 200 (a soft 404). Call `notFound()` in the `[state]` and `[area]` pages for unknown slugs.
- [ ] **T-4 · P0 · S · Canonical tags on every indexable page.** Home, the schools and universities listings, state pages, blog index, blog posts, about, contact and advertise have none. Add `alternates.canonical` with the absolute `https://www.` URL and a trailing slash.
- [ ] **T-5 · P0 · S · Turn caching back on.** `frontend/src/app/layout.tsx:24` sets `dynamic = 'force-dynamic'` for the whole site, so every request renders from scratch (`cache-control: no-store`). Remove it, use `revalidate` per page (e.g. 3600 for detail pages, 86400 for listings), and keep only truly dynamic routes dynamic.
  *Accept:* detail pages return `x-vercel-cache: HIT` on repeat requests.
- [ ] **T-6 · P1 · S · Titles.**
  - The template `'%s | NigerianDirectory.com'` (`(main)/layout.tsx:12`) plus titles that already end in the brand gives "… | NigerianDirectory | NigerianDirectory.com".
  - `meta_title` is cut at 60 characters before the template is added, giving "… | NigerianDire".
  - Set one brand suffix and keep the final title ≤ 60 characters.
  - Give the contact page its own title; it is a client component with no metadata, so add a `layout.tsx` with metadata.
- [ ] **T-7 · P1 · M · Structured data.**
  - Add `CollegeOrUniversity` JSON-LD to university detail pages (currently none).
  - Add `ItemList` + `BreadcrumbList` to listing and state pages, and `WebSite` + `Organization` (with `SearchAction`) to the home page.
  - Omit `null` properties (`streetAddress`, `telephone`, `email` are emitted as null).
  - Validate with Google's Rich Results Test and the Schema.org validator.
- [ ] **T-8 · P1 · S · Breadcrumbs point at 404s.** `/education/` and `/education/schools/<state>/<area>/` don't exist. Either create those pages or drop them from both visible and JSON-LD breadcrumbs (school detail page, around line 273).
- [ ] **T-9 · P1 · S · Conflicting robots tags on 404 pages.** The 404 page sends `robots: noindex` together with `googlebot: index, follow`, which comes from the `googleBot` default in `(main)/layout.tsx:27-30`. Make page-level `robots` override both.
- [ ] **T-10 · P1 · S · `robots.txt` blocks `/health/`**, which also covers `/health/hospitals/`. Keep it while Health is unlaunched, but list it as a launch task in §6.
- [ ] **T-11 · P1 · S · Icons and social images.**
  - Add `favicon.ico`, PNG icons and a `site.webmanifest`.
  - Rename `public/nd logo.jpg` (it has a space in the name).
  - Add `og:image` to listing pages, which have only 2 Open Graph tags.
- [ ] **T-12 · P1 · S · Language.** Set `<html lang="en-NG">` and `og:locale = en_NG`.
- [ ] **T-13 · P2 · S · Page weight.** The Lagos state page is 423 KB of HTML with 111 images. Paginate state listings (e.g. 24 per page with `rel` links) and lazy-load images below the fold.
- [ ] **T-14 · P2 · S · Remove the legacy `app/(main)/schools/...` routes.** Middleware already redirects them with a 301, so the pages are dead code that can drift.

### Phase 5 — Search engine setup

- [ ] **SE-1 · P0 · S · Bing Webmaster Tools.** Import the site from Google Search Console, or verify with an `msvalidate.01` meta tag / DNS record. Submit `sitemap.xml`.
- [ ] **SE-2 · P0 · S · IndexNow** (used by Bing, Yandex and Seznam). Host the key file at `/<key>.txt` and ping IndexNow when records are added, changed or removed (hook it into the publish step from CR-3).
- [ ] **SE-3 · P1 · S · Google Search Console.**
  - Resubmit the sitemap after T-1.
  - Use the Removals tool or let 404s age out for URLs of deleted records.
  - Check *Pages → Not indexed* weekly.
- [ ] **SE-4 · P1 · S · Analytics.** Confirm which GA4 property is in use: only `G-70CKXKH26B` appears in page HTML, while commit `62a1c22` added a second property, `G-6RP3Q0FM2N`. Load GA through Consent Mode (see AD-4).
- [ ] **SE-5 · P1 · S · Trust and E-E-A-T.**
  - Replace the contact page's details: `info@nigeriandirectory.com` is on a domain that doesn't exist, and `+234 800 123 4567` is a placeholder.
  - Publish a real address, a working email on `nigeriandirectory.com.ng`, an editorial and corrections policy, and how listings are verified.
  - Fix all brand references from "NigerianDirectory.com" to the real domain.

### Phase 6 — GEO (AI assistants and answer engines)

- [ ] **GEO-1 · P1 · S · Add `/llms.txt`.** Summarise the site, link the canonical listing pages and the API docs, and state the data licence and how to cite.
- [ ] **GEO-2 · P1 · S · Correct the AI agents page** (`/for-ai-agents/`). Point it at the real API base (`https://nigeriandirectory-api.vercel.app/api`, or a custom domain from GEO-4) and document only endpoints that exist (`/api/ai/schools` works; `/api/ai`, `/api/ai/search` and `/api/ai/stats` return 404).
- [ ] **GEO-3 · P1 · S · Answer-ready facts.** On each detail page, show a short factual summary near the top (type, location, founding year, head, accreditation) with visible "Source: NUC, fetched <date>" citations. AI answer engines favour pages that state facts plainly and show their sources.
- [ ] **GEO-4 · P2 · S · Custom API domain.** Serve the API at `api.nigeriandirectory.com.ng` (Vercel domain plus DNS CNAME) and update `NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL`, `CORS_ORIGINS` and docs.
- [ ] **GEO-5 · P2 · S · Bot policy.** Decide which AI crawlers are allowed (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot) and state it explicitly in `robots.ts`. Today they are allowed by the `*` rule.

### Phase 7 — Advertising (after Phases 1–2)

Ad networks review content quality, so apply only after the content clean-up.

- [ ] **AD-1 · P0 · S · Fix the advertise page.**
  - The form on `/advertise/` has no submit handler, so enquiries go nowhere. Post it to `/api/contact` with `submission_type = 'advertise'`; the API already supports this.
  - Replace `advertise@nigeriandirectory.com`, which is on a domain that doesn't exist.
- [ ] **AD-2 · P0 · S · `ads.txt`.** Add `public/ads.txt` with your publisher line, e.g. `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`, plus lines for any other network.
- [ ] **AD-3 · P0 · M · Map slots to real ad unit IDs.** `AdBanner` sends slot *names* (e.g. `home-top-leaderboard`) as `data-ad-slot`; AdSense needs the numeric ad unit ID. Add a mapping (config or env) from slot name to network unit ID, and don't render a slot that has no mapping.
- [ ] **AD-4 · P0 · M · Consent.**
  - Use a Google-certified CMP (IAB TCF v2.2) for EEA, UK and Swiss visitors.
  - Set the Consent Mode default **before** any Google tag loads (`beforeInteractive`, ahead of AdSense and GA).
  - Make "Necessary only" deny `ad_storage`; it currently grants it.
- [ ] **AD-5 · P0 · S · Reduce ad density.** There are 22 slots on the home page, 13 on state pages and 8 on school pages. Start with at most 3 per page on mobile and 4–5 on desktop, never above the main heading, and never more ad space than content. Add more only after approval, based on the data.
- [ ] **AD-6 · P1 · S · Responsive units.** `AdBanner` sets fixed width and height together with `data-ad-format="auto"` and full-width responsive. Choose one: fixed-size units, or responsive units at `width: 100%`. Reserve the slot's height to avoid layout shift.
- [ ] **AD-7 · P1 · S · Configure and verify.** Set `NEXT_PUBLIC_GOOGLE_ADSENSE_ID` (and Media.net IDs if used) in the Vercel project. Confirm `<ins class="adsbygoogle">` renders and that AdSense reports the site as *Ready*.
- [ ] **AD-8 · P2 · S · Media.net fallback.** `loadTag` is called with slot names, not Media.net crid IDs, and Media.net never renders when AdSense is set. Add a mapping, or remove Media.net until it's used.
- [ ] **AD-9 · P2 · S · Client-side navigation.** Re-initialise `adsbygoogle` safely on route changes (one `push` per `<ins>`, keyed by path) to avoid "already have ads" errors.

### Phase 8 — Operations and monitoring

- [ ] **OP-1 · P1 · S · Weekly data audit** (CR-14) with a short report: counts by verification status, website DNS failures, content score distribution and new NUC entries not yet in the database.
- [ ] **OP-2 · P1 · S · Uptime checks** on the website (`/`), the API (`/health`) and the sitemap.
- [ ] **OP-3 · P1 · S · Deployment guard.** Add a CI job that builds the frontend (`npm run build`) on every pull request, so lint errors like `escapeXml` (PR #3) fail before reaching `main`.
- [ ] **OP-4 · P2 · S · Credentials.** Rotate or delete the Vercel and Neon API keys used during the audit when they are no longer needed.
- [ ] **OP-5 · P2 · S · Retire the stale docs.** Archive superseded documents in `documents/` (launch reports, phase summaries) so this plan and the data standard are the single source of truth.

---

## 4. Data standard (applies to every vertical)

### 4.1 Identity

Every published record must have:

| Field | Rule |
|---|---|
| `name` | Exactly as on the authoritative roster; former names live in `institution_aliases` |
| `institution_category`, `type` | From the roster; never inferred from search results |
| `state`, `city`, `area` | Validated against the LGA table; the name must not imply a different state |
| `source_url`, `source_name`, `source_fetched_at` | Mandatory |
| `verification_status` | `verified` before publishing |

Authoritative rosters by vertical:

| Vertical | Roster |
|---|---|
| Universities | NUC federal, state and private lists (`nuc.edu.ng/nigerian-univerisities/...`) |
| Polytechnics and monotechnics | NBTE list of accredited institutions |
| Colleges of education | NCCE list |
| Unity schools | Federal Ministry of Education list of Federal Government Colleges |
| State secondary schools | State ministry of education lists; WAEC/NECO examination-centre lists as corroboration |
| Hospitals and clinics | Federal Ministry of Health and state health facility registries (e.g. the national health facility registry), MDCN |
| Businesses (later verticals) | CAC registration plus the business's own verified website or Google Business Profile |

### 4.2 Websites and images

- A website is stored only if it passes the ownership check in CR-4.
- An image is stored only if it comes from the verified domain, or from a page on that domain, with `image_source_url` recorded.

### 4.3 Content quality gate

A section can be published only if all of these hold:

1. It names the institution in its first 350 characters.
2. It contains none of these junk patterns: navigation and boilerplate (`click here`, `read more`, `login`, `cookie`, `subscribe`, `sign up`, `privacy policy`, `all rights reserved`), bylines (`By <site> Team`), listicle headers (`Top N`, `list of best`), job and admissions adverts (`apply now`, `recruitment`, `job vacancy`), news headlines unrelated to the institution, or mis-decoded characters (`â€`).
3. It is ≥ 300 characters of on-topic text.
4. It cites ≥ 2 independent sources, at least one not low-trust.
5. It doesn't cite our own domain.

**A page is indexable only if at least 2 sections pass.**

### 4.4 Content and copyright policy

- Facts are not copyrighted; expression is. Write our own sentences from verified facts.
- Quotations are short, in quotation marks and attributed with a link.
- Never republish another directory's descriptions.
- Record a citation for every paragraph.

### 4.5 Acceptance thresholds (measured by the audit script)

| Metric | Threshold to publish a vertical |
|---|---|
| Identity verified against roster | ≥ 98% of published records |
| Field accuracy on audited sample (type, state, city, website, year) | ≥ 95% |
| Content passing §4.3 | ≥ 90% of indexable pages |
| Website DNS and ownership pass | 100% of non-null websites |
| Duplicates (same institution twice) | 0 |
| Sitemap URLs returning 200 | 100% |

---

## 5. SEO/GEO readiness checklist (run before and after each phase)

- [ ] Every sitemap URL returns 200 and every `<loc>` is a valid, encoded URL
- [ ] Unknown routes return 404 (no soft 404s)
- [ ] Every indexable page has a self-referencing absolute canonical
- [ ] Titles are ≤ 60 characters, unique, with one brand suffix; descriptions are 120–160 characters and unique
- [ ] Structured data on detail, listing and home pages validates with no errors and no `null` properties
- [ ] Breadcrumb links all return 200
- [ ] `robots.txt` allows every launched vertical
- [ ] Bing Webmaster Tools verified, sitemap submitted, IndexNow active
- [ ] Google Search Console sitemap shows success; *Not indexed* reasons reviewed
- [ ] `llms.txt` present and accurate; AI agents page lists only working endpoints
- [ ] Detail pages are served from cache (`x-vercel-cache: HIT`)
- [ ] Mobile LCP < 2.5 s and CLS < 0.1 (measured with network and CPU throttling)
- [ ] `favicon.ico`, PNG icons, manifest and `og:image` on all page types

---

## 6. Definition of done for launching a new vertical

A vertical (e.g. polytechnics, hospitals, churches, hotels) moves from `coming-soon` to `live` in `verticals.ts` only when:

1. **Roster.** Its authoritative roster is in the source registry (CR-1) and committed as a dated seed file (CR-2).
2. **Identity.** 100% of records come from the roster with provenance (CR-3), pass location validation (CR-8), and have no duplicates or aliases (CR-9).
3. **Websites and images** pass the ownership checks (CR-4, CR-12).
4. **Content** passes §4.3 on at least 90% of indexable pages, with policy §4.4 followed.
5. **Audit.** The audit script (CR-14) passes every threshold in §4.5, and a human has spot-checked a random 5% sample (minimum 20 records) with no identity errors.
6. **SEO.** Listing, state and detail templates pass the checklist in §5. Robots allows the vertical's path, and its sitemap is live and submitted to Google and Bing.
7. **Ads.** The density and consent rules (AD-4, AD-5) apply to the vertical's templates.
8. **Monitoring.** The vertical is included in the weekly audit (OP-1).

---

## 7. Suggested sequence

| Order | Phases | Outcome |
|---|---|---|
| 1 | Phase 0, T-1, T-3, AD-1, SE-5 | Safe to change data; no dead URLs in sitemaps; enquiries and contact details work |
| 2 | Phase 1A–1D, C-1, C-2 | Universities correct; bad content unpublished |
| 3 | Phase 3 (CR-1 to CR-10, CR-13) | Pipeline enforces the standard |
| 4 | Phase 1E (S-5), C-5 | Schools verified and re-enriched |
| 5 | Remaining Phase 4, Phase 5, Phase 6 | Full technical SEO, Bing and GEO |
| 6 | Phase 7 | Apply to ad networks with clean content |
| 7 | §6 for the next vertical (suggest polytechnics, which has an NBTE roster) | Expansion on a sound base |

## 8. Change log

| Date | Change | By |
|---|---|---|
| 2026-11-21 | Plan created from the 2026-11-21 audit | — |
