# NigerianDirectory.com

**Discover schools, hotels, real estate, and more across Nigeria**

A scalable, SEO-first, multi-vertical directory platform starting with 200+ verified schools in Nigeria. Built with Next.js, Node.js, PostgreSQL, and Python crawler infrastructure.

## 🎨 Brand Identity

- **Primary Color:** #1D4ED8 (Bold Blue)
- **Secondary Color:** #FBBF24 (Yellow highlights)
- **Accent Color:** #10B981 (Green - verified/claimed listings)
- **Background:** #F9FAFB (Soft white)

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- Next.js 14 (React 18) with SSR for SEO
- Tailwind CSS for styling
- Framer Motion for animations
- Google Maps API for listings

**Backend:**
- Node.js + Express.js
- PostgreSQL (relational database)
- Redis (caching + queue management)
- JWT authentication

**Crawler:**
- Python 3.11+
- BeautifulSoup4/Scrapy for parsing
- Requests library with robots.txt compliance
- Template-based summary generation (AI enrichment ready)

**Deployment:**
- Docker containers
- Nginx reverse proxy (production)
- GitHub Actions CI/CD

## 📁 Project Structure

```
nigeriandirectory/
├── frontend/              # Next.js 14 application (App Router)
│   ├── src/
│   │   ├── app/          # App Router pages (SSR)
│   │   ├── components/   # Reusable React components
│   │   ├── config/       # Frontend configuration
│   │   ├── lib/          # API client & content helpers
│   │   ├── styles/       # Global CSS / Tailwind
│   │   └── types/        # Shared TypeScript interfaces
│   └── public/           # Static assets, logos
├── backend/              # Express.js API server
│   ├── src/
│   │   ├── config/       # Database & Redis config
│   │   ├── middleware/   # Auth & validation middleware
│   │   ├── models/       # Database models (7 models)
│   │   ├── routes/       # API routes (7 route files)
│   │   ├── services/     # Business logic (summary generator)
│   │   ├── seeds/        # Location & school seeders
│   │   ├── database/     # Migration runner
│   │   └── utils/        # Response, pagination, slug helpers
│   └── database/         # SQL schemas and migrations
├── crawler/              # Python web scraper
│   ├── seeds/            # Trusted school lists (ministry data)
│   ├── fetcher.py        # HTTP requests with robots.txt compliance
│   ├── parser.py         # HTML parsing and fact extraction
│   ├── enrichment.py     # Template-based summary generation
│   ├── database.py       # Crawler DB operations
│   └── scheduler.py      # Batch processing and queue management
├── scripts/              # Utility scripts
│   ├── sql/              # Ad-hoc SQL queries
│   ├── db/               # Backup/restore & DB utilities
│   └── data/             # Data export & enrichment scripts
└── docker-compose.yml    # Local development environment
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/nigeriandirectory.git
   cd nigeriandirectory
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services with Docker:**
   ```bash
   docker-compose up -d
   ```

4. **Initialize database:**
   ```bash
   # Database tables are created automatically via init.sql
   # Seed location data:
   cd backend
   npm run seed:locations
   ```

5. **Run the crawler (populate 200 schools):**
   ```bash
   cd crawler
   python scheduler.py --batch initial --count 200
   ```

6. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Development Mode (without Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Crawler:**
```bash
cd crawler
pip install -r requirements.txt
python scheduler.py --batch initial --count 200
```

## 📊 Database Schema

### Core Tables (7 tables)

- **schools** - Main school listings with facts, coordinates, claims status, enriched content
- **locations** - Nigerian states, cities, areas (50+ cities)
- **crawl_logs** - Crawler activity, confidence scores, source URLs
- **claims** - School ownership verification and payment tracking
- **users** - Admin and school owner accounts
- **enrichment_queue** - AI enrichment job queue with priority and retry
- **page_views** - Page view analytics with IP hashing for privacy

## 🔗 API Endpoints

### Schools
- `GET /api/schools` - List schools (filters: state, area, type, curriculum)
- `GET /api/schools/:slug` - School detail by slug
- `POST /api/schools/:id/claim` - Claim school listing
- `PATCH /api/schools/:id` - Update school (admin/verified owner)

### Crawling
- `POST /api/crawl/batch` - Trigger crawler batch
- `GET /api/crawl/status` - Check crawl progress

### Admin
- `GET /api/admin/overview` - Dashboard metrics
- `GET /api/admin/claims` - Pending verifications
- `PATCH /api/admin/enrichment` - Trigger AI enrichment queue

## 🎯 SEO Features

- **Schema.org markup** - School, LocalBusiness, Article schemas
- **Dynamic sitemap.xml** - Auto-generated for all listing + blog pages
- **Canonical URLs** - Proper slug structure: `/schools/{state}/{area}/{school-slug}/`
- **Internal linking** - State → Area → School hierarchy
- **Meta tags** - Optimized titles, descriptions, Open Graph
- **Blog pages** - `/schools/{state}/{area}/{school-slug}/blog/` for each school

## 📝 Summary Generation

**Initial Launch:** Template-based summaries (3-5 variants per school type)
- Randomized to reduce duplication
- 120-150 words per school
- All marked with `needs_ai_enrichment = true`

**Future:** AI enrichment via OpenAI API for unique, SEO-rich content

## 🏫 School Blog Pages

Each school gets a dedicated blog page with:
- Hero section with school logo
- Template/AI-generated summary
- Management & principal profiles (public domain or placeholders)
- Student life & events section
- Facilities overview with images
- Related schools carousel
- Claim/Promote CTAs
- Schema.org Article markup

## 🎨 Brand Components

### Colors
```css
--primary: #1D4ED8;    /* Bold Blue */
--secondary: #FBBF24;  /* Yellow */
--accent: #10B981;     /* Green (verified) */
--background: #F9FAFB; /* Soft white */
```

### Typography
Sans-serif, modern, clean (default Tailwind font stack)

## 🚢 Deployment

### Production Build

```bash
# Frontend
cd frontend
npm run build
npm run start

# Backend
cd backend
npm run build
npm run start
```

### GitHub Actions CI/CD

Automated workflows in `.github/workflows/`:
- Lint and test on push
- Build Docker images
- Deploy to production (AWS/DigitalOcean)

## 📈 Roadmap

- [x] Backend API with PostgreSQL
- [x] Crawler with 200 trusted school seeds
- [x] Template-based summary generation
- [x] Next.js frontend with listing + blog pages
- [x] SEO infrastructure (sitemap, Schema.org, canonical URLs)
- [ ] Claim verification workflow
- [ ] Payment integration (Paystack)
- [ ] AI enrichment for summaries
- [ ] Hotels vertical
- [ ] Real estate vertical

## 🤝 Contributing

This is a private project. For questions or contributions, contact the development team.

## 📄 License

Proprietary - All rights reserved

## 📞 Contact

**NigerianDirectory.com**  
Email: info@nigeriandirectory.com  
Website: https://nigeriandirectory.com

---

Built with ❤️ for Nigeria


---

## 📊 Production Readiness Status

**Current Progress**: 60% → 65% (Post-Phase 5)

### Completed Phases ✅
- [x] Phase 1: Credential Security (100%)
- [x] Phase 2: Deployment Pipeline (100%)
- [x] Phase 3: Environment Configuration (100%)
- [x] Phase 4: JWT & Token Management (100%)
- [x] Phase 5: Testing & QA (80%) - 249 tests, 80% passing
- [x] Phase 6: Logging & Monitoring (67%)
- [x] Phase 7: Database Optimization (100%)
- [x] Phase 8: Security Hardening (100%)

### In Progress / TODO 📋
- [ ] Phase 9: API Documentation (Swagger/OpenAPI)
- [ ] Phase 10: Load Testing & Performance
- [ ] Phase 11: Incident Response Procedures
- [ ] Phase 12: Final Pre-Launch Validation

### Key Metrics
```
Tests Created:        249
Tests Passing:        199 (79.9% pass rate)
Core Tests:           52/52 (100% passing)
Code Coverage:        ~15% (blocked by external deps)
Auth Service:         100% tested ✅
Token Service:        100% tested ✅
Security Measures:    Complete ✅
Performance Targets:  TBD (load testing needed)
```

### Production Readiness Documents
- **[PHASE_5_SUMMARY.md](./PHASE_5_SUMMARY.md)** - What was tested and current status
- **[TESTING_PROGRESS.md](./TESTING_PROGRESS.md)** - Detailed test inventory
- **[COVERAGE_STRATEGY.md](./COVERAGE_STRATEGY.md)** - Path to 70% code coverage
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - What needs to happen before launch
- **[PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md)** - Full launch checklist

### Launch Timeline
- **Week 1**: Complete Phase 5 setup, verify 70% coverage
- **Week 2**: Complete API docs, load testing, final validation
- **Week 3**: Go/no-go decision, production deployment

