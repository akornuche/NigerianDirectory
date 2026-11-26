/**
 * Credit line for a hero photo taken from Wikimedia Commons or another
 * licensed source. CC BY-SA photos must name the author and licence and link
 * to the source; the credit is stored on the record in field_sources.
 */
export default function PhotoCredit({ sources }: { sources?: Record<string, unknown> | null }) {
  const text = typeof sources?.hero_image_credit === 'string' ? sources.hero_image_credit : '';
  const href = typeof sources?.hero_image_source === 'string' ? sources.hero_image_source : '';
  if (!text) return null;
  return (
    <p className="mt-2 text-xs text-ink-muted">
      Photo:{' '}
      {href ? (
        <a href={href} target="_blank" rel="noopener nofollow" className="underline underline-offset-2 hover:text-ink">
          {text}
        </a>
      ) : (
        text
      )}
    </p>
  );
}
