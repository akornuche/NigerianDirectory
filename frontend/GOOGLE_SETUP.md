# Google Analytics & Search Console Setup Guide

This guide explains how to configure Google Analytics 4 (GA4) and Google Search Console for NigerianDirectory.

## Quick Start

1. **Get your GA4 Measurement ID** from Google Analytics
2. **Add to `.env.local`**: `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX`
3. **Get your Search Console verification code**
4. **Add to `.env.local`**: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-code-here`
5. **Restart dev server**

---

## Google Analytics 4 Setup

### Step 1: Create a GA4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Click **Admin** (bottom left) → **Create Property**
3. Fill in:
   - Property name: `NigerianDirectory`
   - Reporting timezone: `Africa/Lagos` or your timezone
   - Currency: `NGN` (Nigerian Naira)
4. Click **Create**

### Step 2: Create Web Stream

1. Under "Data collection" → **Web**
2. Click **Create tag**
3. Enter:
   - Website URL: `https://nigeriandirectory.com` (for production)
   - Stream name: `NigerianDirectory Web`
4. Copy your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 3: Configure Environment Variables

Update `frontend/.env.local`:

```env
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Measurement ID.

### Step 4: Verify Installation

1. Start your dev server: `npm run dev`
2. Open http://localhost:3000 in your browser
3. Open DevTools (F12) → **Network** tab
4. Search for: `googletagmanager`
5. You should see requests to `www.googletagmanager.com/gtag/js`

### Step 5: Check Real-Time Data

1. Go to Google Analytics
2. Navigate to **Reports** → **Realtime** → **Overview**
3. Your page views should appear within seconds

---

## Custom Event Tracking

The `GoogleAnalytics` component exports tracking helpers:

### Track School/University Views

```typescript
import { trackSchoolView } from '@/components/analytics/GoogleAnalytics';

// In a school detail page component
trackSchoolView('school-001', 'Abeokuta Grammar School', 'school', 'Ogun');

// In a university detail page component
trackSchoolView('univ-001', 'University of Lagos', 'university', 'Lagos');
```

### Track Search Events

```typescript
import { trackSearch } from '@/components/analytics/GoogleAnalytics';

// When user performs a search
trackSearch('secondary schools in Lagos', 45);
```

### Track Form Submissions

```typescript
import { trackFormSubmission } from '@/components/analytics/GoogleAnalytics';

// When user submits a form
trackFormSubmission('contact_form', 'form-id-123');
trackFormSubmission('school_claim', 'claim-id-456');
```

### Custom Events

```typescript
import { trackEvent } from '@/components/analytics/GoogleAnalytics';

// Any custom event
trackEvent('share_school', {
  school_id: '123',
  school_name: 'Example School',
  platform: 'whatsapp',
});
```

---

## Google Search Console Setup

### Step 1: Add Your Property

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add property**
3. Choose **URL prefix**
4. Enter: `https://nigeriandirectory.com`
5. Click **Continue**

### Step 2: Verify Ownership

Google will ask you to verify. Choose one method:

#### Method A: HTML Meta Tag (Recommended)

1. Google gives you a meta tag
2. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=abc123xyz_your_verification_code
   ```
3. Restart dev server (the meta tag is automatically added to `<head>`)
4. Click **Verify** in Search Console

#### Method B: HTML File

1. Download the verification file from Google
2. Place in `frontend/public/`
3. Click **Verify**

#### Method C: DNS Record

1. Add the TXT record Google provides to your domain DNS
2. Wait for DNS to propagate (can take 24-48 hours)
3. Click **Verify**

### Step 3: Submit Sitemaps

1. In Search Console, go to **Sitemaps** (left menu)
2. Click **Add a new sitemap**
3. Enter: `https://nigeriandirectory.com/sitemap.xml`
4. Click **Submit**
5. Repeat for education verticals:
   - `https://nigeriandirectory.com/education/schools/sitemap.xml`
   - `https://nigeriandirectory.com/education/universities/sitemap.xml`

### Step 4: Monitor Coverage

1. Go to **Coverage** in Search Console
2. Look for:
   - **Valid** — Indexed pages (✅ good)
   - **Valid with warnings** — Indexed but with issues (⚠️ check)
   - **Excluded** — Not indexed (❌ check reasons)
   - **Error** — Pages with problems (❌ fix)

### Step 5: Check Search Performance

1. Go to **Performance**
2. View metrics:
   - **Total clicks** — Clicks from search results
   - **Total impressions** — Times shown in search
   - **Average CTR** — Click-through rate
   - **Average position** — Average search ranking

---

## Monitoring Checklist

### Daily
- [ ] Check Google Analytics **Realtime** for traffic
- [ ] Look for 404s in Search Console **Coverage**

### Weekly
- [ ] Review **Traffic Sources** in Google Analytics
- [ ] Check **Performance** in Search Console
- [ ] Review top search queries

### Monthly
- [ ] Analyze traffic trends in Google Analytics
- [ ] Review crawl stats in Search Console
- [ ] Check **Core Web Vitals** assessment
- [ ] Review search ranking changes

---

## Troubleshooting

### Google Analytics Not Showing Data

1. ✅ Verify Measurement ID is correct in `.env.local`
2. ✅ Check DevTools **Network** for `googletagmanager.com` requests
3. ✅ Look for errors in DevTools **Console**
4. ✅ Wait 24-48 hours for first data to appear
5. ✅ Check browser privacy settings aren't blocking cookies

### Pages Not Appearing in Search Results

1. ✅ Ensure `robots.txt` allows the pages (check `Disallow` directives)
2. ✅ Verify sitemap is valid: `https://nigeriandirectory.com/sitemap.xml`
3. ✅ Use **URL Inspection** to request indexing manually
4. ✅ Check no `noindex` meta tags are present
5. ✅ Wait 1-2 weeks for Google to crawl

### 404s in Coverage

- Normal for deleted/redirected pages
- Check for broken internal links
- Ensure dynamic routes work correctly
- Review redirect rules in `vercel.json`

---

## Production Setup

### Before Launching

- [ ] Update `.env.production` with production Measurement ID
- [ ] Verify Search Console with production domain
- [ ] Submit all sitemaps
- [ ] Test all tracking events work
- [ ] Enable HTTPS (required)
- [ ] Update `robots.txt` sitemap URLs to production domain

### After Launching

- [ ] Monitor Google Analytics for traffic patterns
- [ ] Track ranking improvements in Search Console
- [ ] Review Core Web Vitals monthly
- [ ] Set up alerts for traffic anomalies
- [ ] Audit crawl errors regularly

---

## Example Environment Files

### Development (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
API_INTERNAL_URL=http://localhost:5001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# Google Analytics & Search Console
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-code-here
```

### Production (.env.production)

```env
NEXT_PUBLIC_API_URL=https://api.nigeriandirectory.com/api
API_INTERNAL_URL=https://api.nigeriandirectory.com/api
NEXT_PUBLIC_SITE_URL=https://nigeriandirectory.com
NODE_ENV=production

# Google Analytics & Search Console (Production IDs)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-PROD123XYZ
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=prod_verification_code_here
```

---

## Resources

- [Google Analytics Help](https://support.google.com/analytics)
- [Google Search Console Help](https://support.google.com/webmasters)
- [robots.txt Specification](https://www.robotstxt.org/)
- [Sitemaps Protocol](https://www.sitemaps.org/)
- [Next.js Google Analytics Guide](https://nextjs.org/docs)

---

## Questions?

If you have issues:
1. Check the troubleshooting section above
2. Review Google's official documentation
3. Check browser DevTools for JavaScript errors
4. Verify environment variables are set correctly
