/**
 * /ads.txt (IAB Authorized Digital Sellers), required by AdSense.
 *
 * Generated from the configured publisher ID so it can never list a wrong or
 * placeholder seller. NEXT_PUBLIC_GOOGLE_ADSENSE_ID is "ca-pub-…"; ads.txt
 * uses "pub-…". Extra lines for other networks can be supplied in
 * ADS_TXT_EXTRA_LINES (newline-separated). Returns 404 until an ad network
 * is configured.
 */
export const dynamic = 'force-static';

export function GET() {
  const lines: string[] = [];
  const adsense = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_ID?.trim();
  if (adsense) {
    const pub = adsense.replace(/^ca-/, '');
    lines.push(`google.com, ${pub}, DIRECT, f08c47fec0942fa0`);
  }
  const extra = process.env.ADS_TXT_EXTRA_LINES?.trim();
  if (extra) lines.push(...extra.split('\n').map((l) => l.trim()).filter(Boolean));

  if (lines.length === 0) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
