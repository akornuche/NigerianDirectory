# NigerianDirectory.com — TODO Plan

> **Created:** 2026-02-23  
> **Status:** ⏳ Awaiting approval  
> **Goal:** Fix all identified gaps and bring the project to production-readiness

---

## 🔴 TIER 1 — Database Issues (Schema, Model & Migration Gaps)

These are where data is stored and problems that affect data integrity.

### Current Database State

**`init.sql` defines 7 tables:**
| Table | Purpose | Model Exists? | Status |
|---|---|:---:|---|
| `users` | Admin & school owner accounts | ✅ `User.js` | ✅ Good |
| `locations` | Nigerian states, cities, areas | ✅ `Location.js` | ✅ Good |
| `schools` | Main school listings (36+ columns) | ✅ `School.js` | ⚠️ Column mismatches |
| `crawl_logs` | Crawler activity & confidence scores | ✅ `CrawlLog.js` | ✅ Good |
| `claims` | School ownership verification | ✅ `Claim.js` | ✅ Good |
| `enrichment_queue` | AI enrichment job queue | ❌ None | 🔴 No model |
| `page_views` | Analytics & page view tracking | ❌ None | 🔴 No model |

### 1.1 ❌ Missing `EnrichmentQueue` model
- **Problem:** `enrichment_queue` table exists in `init.sql` (lines 186-196) but there is **no backend model** to interact with it. The admin route references enrichment functionality but there's no way to manage the queue from the API.
- **Action:** Create `backend/src/models/EnrichmentQueue.js` with methods: `add()`, `getNext()`, `updateStatus()`, `getStats()`, `getBySchool()`.
- **Effort:** 🟡 Medium

### 1.2 ❌ Missing `PageView` model
- **Problem:** `page_views` table exists in `init.sql` (lines 204-212) for tracking analytics, but there is **no backend model** and **no route** to record or retrieve page views.
- **Action:** Create `backend/src/models/PageView.js` with methods: `record()`, `getBySchool()`, `getTopPages()`, `getStats()`. Add a `POST /api/views` endpoint to record views.
- **Effort:** 🟡 Medium

### 1.3 ⚠️ Schema column drift — `schools` table
- **Problem:** The `init.sql` schema, migration files, ad-hoc SQL scripts, and the model/frontend all define slightly different columns for the `schools` table. Here's the full audit:

| Column | `init.sql` | Migration 001 | `add_enriched_columns.sql` (root) | `School.js` model | `api.ts` frontend |
|---|:---:|:---:|:---:|:---:|:---:|
| `enriched_history` | ❌ | ✅ | ✅ | ❌ not in update allowlist | ✅ |
| `enriched_academics` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `enriched_campus_info` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `enriched_student_life` | ❌ | ✅ | ✅ | ❌ | ✅ |
| `enriched_notable_alumni` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `enriched_recent_news` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `enriched_at` | ❌ | ✅ | ❌ | ❌ | ✅ |
| `enrichment_status` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `last_enriched` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `content_sources` | ✅ | ✅ (duplicate) | ✅ (duplicate) | ✅ | ✅ |
| `summary_template_id` | ✅ | ❌ | ❌ | ❌ not in model create | ❌ |
| `featured` | ❌ | ❌ | ❌ | ❌ | ✅ (in interface) |

- **Action:**
  1. **Consolidate `init.sql`** to include ALL enriched columns that migrations add (so a fresh DB gets everything)
  2. **Add enriched fields to `School.js`** model's `update()` allowlist and `findBySlug()` response
  3. **Remove duplicate** column additions across migration 001, migration 20260113, and `add_enriched_columns.sql`
  4. **Decide** on `enrichment_status` vs `needs_ai_enrichment` — currently both exist in different files, they overlap
  5. **Add `featured`** column to schema (frontend expects it) or remove from frontend interface
- **Effort:** 🔴 Large

### 1.4 ⚠️ Duplicate/conflicting migration files
- **Problem:** Three separate files all try to add `content_sources`:
  - `init.sql` line 77: `content_sources JSONB DEFAULT '[]'`
  - `migrations/001_add_enriched_content.sql`: `ADD COLUMN content_sources JSONB DEFAULT '[]'`
  - `migrations/20260113_add_content_sources.sql`: adds `content_sources` again
  - Root `add_enriched_columns.sql`: adds `content_sources` again
  
  Also, `enriched_history`, `enriched_academics`, etc. are added in both migration 001 AND root `add_enriched_columns.sql` with slightly different columns.
  
- **Action:** Create one clean, authoritative migration file. Delete the root-level ad-hoc SQL. Update `init.sql` to be the single source of truth for fresh databases.
- **Effort:** 🟡 Medium

### 1.5 ⚠️ Crawler `database.py` excludes enriched columns
- **Problem:** The Python crawler's `insert_school()` function in `database.py` does NOT include any of the enriched columns (`enriched_history`, `enriched_academics`, etc.) in its INSERT or ON CONFLICT UPDATE. If the crawler re-processes a school, **it could wipe enrichment data** because the ON CONFLICT UPDATE overwrites `updated_at` but doesn't preserve enriched fields (they'd be left as-is since they're not in the SET clause — but this is fragile).
- **Action:** Update `database.py` to either:
  - Explicitly preserve enriched columns in the ON CONFLICT clause, OR
  - Add a separate `update_school_enrichment()` function that the enrichment scripts use
- **Effort:** 🟢 Small

### 1.6 ❌ No migration runner
- **Problem:** `package.json` defines `"migrate": "node src/database/migrate.js"` but `src/database/migrate.js` doesn't exist. No way to apply migrations automatically.
- **Action:** Create `backend/src/database/migrate.js` that:
  - Connects to PostgreSQL
  - Creates a `schema_migrations` tracking table
  - Reads SQL files from `backend/database/migrations/` in order
  - Applies unapplied migrations
  - Records which migrations have been applied
- **Effort:** 🟡 Medium

### 1.7 ❌ No `seedSchools.js`
- **Problem:** `package.json` defines `"seed:schools": "node src/seeds/seedSchools.js"` but the file doesn't exist. No way to seed schools from the API side. The crawler's `ministry_schools.json` has 200 schools but there's no Node.js script to insert them.
- **Action:** Create `backend/src/seeds/seedSchools.js` that reads `crawler/seeds/ministry_schools.json` and inserts schools into the database via the `School.create()` model method.
- **Effort:** 🟡 Medium

### 1.8 ⚠️ No database backup/restore strategy
- **Problem:** No scripts or docs for backing up and restoring the PostgreSQL database. Data is in a Docker volume (`postgres_data`) which will be lost if the volume is deleted.
- **Action:** Add `scripts/db/backup.sh` and `scripts/db/restore.sh` using `pg_dump`/`pg_restore`.
- **Effort:** 🟢 Small

---

## 🟠 TIER 2 — Structural / Code Organization

### 2.1 Create `backend/src/controllers/` directory
- **Why:** README documents a `controllers/` layer for request handlers, but all logic is inline in route files.
- **Action:** Extract request handler functions from route files into controllers. Routes become thin wrappers.
- **Effort:** 🔴 Large

### 2.2 Create `backend/src/utils/` directory
- **Why:** README documents `src/utils/ — Helper functions` but it doesn't exist.
- **Action:** Create common helpers: `response.js`, `pagination.js`, `slugify.js`.
- **Effort:** 🟡 Medium

### 2.3 Organize root-level scripts into `scripts/`
- **Why:** 13+ ad-hoc files at root make it cluttered.
- **Action:** Create `scripts/sql/`, `scripts/db/`, `scripts/data/` and move files accordingly.
- **Effort:** 🟢 Small

### 2.4 Create `frontend/src/types/` directory
- **Why:** Frontend already has interfaces in `api.ts` (lines 86-165) but they're co-located with API logic. Types like `School`, `Location`, `SchoolsResponse` should be centralized.
- **Action:** Extract to `frontend/src/types/school.ts`, `location.ts`, `api.ts`.
- **Effort:** 🟡 Medium

---

## 🟡 TIER 3 — Feature Gaps

### 3.1 Create root `.env` from `.env.example`
- **Why:** `docker-compose.yml` references env vars from root `.env` that doesn't exist.
- **Action:** Create `.env` with dev defaults. Already gitignored.
- **Effort:** 🟢 Small

### 3.2 Add Google Maps component to frontend
- **Why:** Google Maps API key in `.env.example`, maps mentioned in README, but no component exists.
- **Action:** Create `Map.tsx`, integrate into school detail pages.
- **Effort:** 🟡 Medium

### 3.3 Build claim verification workflow (frontend)
- **Why:** Backend `claims.js` route and `Claim.js` model are well-built (create, approve, reject, payment update all exist), but there's no admin UI to manage claims.
- **Action:** Create admin claims review page in frontend.
- **Effort:** 🔴 Large

### 3.4 Add Nginx production config
- **Why:** README mentions Nginx for production but no config exists.
- **Action:** Create `nginx/nginx.conf` + `docker-compose.prod.yml`.
- **Effort:** 🟡 Medium

### 3.5 Add email service
- **Why:** SMTP config in `.env.example` but no email code exists.
- **Action:** Create `backend/src/services/emailService.js` using `nodemailer`.
- **Effort:** 🟡 Medium

---

## 🔵 TIER 4 — Quality & Testing

### 4.1 Add backend API tests
- **Why:** Only 1 test file (346 bytes). Effectively zero test coverage.
- **Action:** Add test files for schools, auth, locations, claims, admin routes.
- **Effort:** 🔴 Large

### 4.2 Add frontend component tests
- **Why:** No frontend tests exist.
- **Action:** Set up Jest + React Testing Library. Test key pages.
- **Effort:** 🔴 Large

### 4.3 Update README to match actual structure
- **Why:** README references `controllers/`, `utils/`, `pages/` (uses App Router `app/` now).
- **Action:** Update after structural fixes.
- **Effort:** 🟢 Small

---

## ⚪ TIER 5 — Future Features (Roadmap)

### 5.1 Payment integration (Paystack)
### 5.2 AI enrichment for summaries (OpenAI)
### 5.3 Hotels vertical
### 5.4 Real estate vertical

---

## 📋 Working List — Execution Order

### Step 1 — Database schema consolidation + fix broken references ✅
> *Must do first — everything else depends on a stable, correct database.*

- [x] **1.3** Consolidate `init.sql` — added ALL enriched columns, `featured`, `enrichment_status`
- [x] **1.4** Clean up duplicate migrations — created `002_consolidate_enriched_content.sql`
- [x] **1.5** Fix crawler `database.py` — added doc comments + `update_school_enrichment()` function
- [x] **1.6** Create `migrate.js` — migration runner at `backend/src/database/migrate.js`
- [x] **1.7** Create `seedSchools.js` — school seeder at `backend/src/seeds/seedSchools.js`
- [x] **3.1** Create root `.env` — dev defaults matching docker-compose

### Step 2 — Missing database models ✅
> *Two tables exist in the DB with zero code to use them.*

- [x] **1.1** Create `EnrichmentQueue.js` model — full CRUD + queue management
- [x] **1.2** Create `PageView.js` model + `views.js` route — registered at `/api/views`
- [x] **1.3 (cont.)** Add enriched fields to `School.js` model `update()` allowlist and JSON parsing

### Step 3 — Quick wins (organize loose scripts, add TypeScript types) ✅
> *Low risk, high cleanup value.*

- [x] **2.3** Move 13+ root-level scripts into `scripts/sql/`, `scripts/db/`, `scripts/data/`
- [x] **2.4** Extract TypeScript types into `frontend/src/types/` (school.ts, location.ts, api.ts, index.ts)
- [x] **1.8** Add database backup/restore scripts (`scripts/db/backup.bat`, `restore.bat`)

### Step 4 — Utils + README fix ✅
> *Fill in the documented-but-missing helper layer.*

- [x] **2.2** Create `backend/src/utils/` — `response.js`, `pagination.js`, `slugify.js`
- [x] **4.3** Update README project structure + database schema sections

### Step 5 — Extract controllers (bigger refactor) ⏳ DEFERRED
> *Routes work fine as-is. Will tackle when time allows.*

- [ ] **2.1** Extract request handlers from 6 route files into `backend/src/controllers/`

### Step 6 — Maps + Nginx config ✅
> *Add the two infrastructure pieces mentioned in README but missing.*

- [x] **3.2** Create `SchoolMap.tsx` — Google Maps component with 4 fallback states
- [x] **3.4** Create `nginx/nginx.conf` + `docker-compose.prod.yml`

### Step 7 — Email service + claim workflow ✅ (email done, admin UI deferred)
> *Backend claim logic exists, but no email notifications and no admin UI.*

- [x] **3.5** Create `emailService.js` — branded templates for claims + contact form
- [x] **3.5 (cont.)** Wire emails into `claims.js` route — submit/approve/reject notifications
- [ ] **3.3** Build admin claims review page in frontend — *DEFERRED (needs design discussion)*

### Step 8 — Testing ⛔ SKIPPED (per user request)

### Step 9 — Future features
> *Roadmap items, tackle as needed.*

- [ ] **5.1** Payment integration (Paystack)
- [ ] **5.2** AI enrichment for summaries (OpenAI)
- [ ] **5.3** Hotels vertical
- [ ] **5.4** Real estate vertical
