// IndexNow key file. Bing, Yandex and other IndexNow engines fetch this URL
// to confirm that a URL submission (see scripts/indexnow-submit.mjs) comes
// from the site's owner. The key is not secret; it only has to match.
export const dynamic = 'force-static';

export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return new Response('Not found', { status: 404 });
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
