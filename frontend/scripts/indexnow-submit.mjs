#!/usr/bin/env node
/**
 * Submit the site's URLs to IndexNow (used by Bing, Yandex, Seznam, Naver).
 * Reads the live sitemap and posts every URL in batches.
 *
 *   INDEXNOW_KEY=<key> node scripts/indexnow-submit.mjs
 *   INDEXNOW_KEY=<key> node scripts/indexnow-submit.mjs https://www.nigeriandirectory.com.ng/about/
 *
 * The same key must be deployed as INDEXNOW_KEY on the frontend, so that
 * <site>/indexnow-key.txt returns it. Run after publishing or changing
 * pages; there is no need to resubmit unchanged URLs.
 */
const SITE = (process.env.SITE_URL || 'https://www.nigeriandirectory.com.ng').replace(/\/$/, '');
const KEY = process.env.INDEXNOW_KEY;
if (!KEY) {
  console.error('Set INDEXNOW_KEY');
  process.exit(1);
}

async function sitemapUrls() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

const keyFile = await fetch(`${SITE}/indexnow-key.txt`).then((r) => (r.ok ? r.text() : ''));
if (keyFile.trim() !== KEY) {
  console.error(`${SITE}/indexnow-key.txt does not return this key; deploy INDEXNOW_KEY first.`);
  process.exit(1);
}

const urls = process.argv.length > 2 ? process.argv.slice(2) : await sitemapUrls();
const host = new URL(SITE).host;
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: KEY, keyLocation: `${SITE}/indexnow-key.txt`, urlList: batch }),
  });
  console.log(`Submitted ${batch.length} URLs: HTTP ${res.status} ${await res.text()}`);
}
