'use client';

import { useEffect, useState } from 'react';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';

/**
 * Share one story (or a whole day): the phone's own share sheet where the
 * browser has one, plus WhatsApp, X, Facebook and copy-link everywhere.
 * `path` is site-relative, e.g. /news/2026/09/30/#story-6.
 */
export default function ShareStory({ path, title, compact = false }: { path: string; title: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  // Known only in the browser; set after mount so server and client HTML match.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);
  const url = `${SITE}${path}`;
  const text = encodeURIComponent(title);
  const enc = encodeURIComponent(url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement('textarea');
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const native = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      /* cancelled */
    }
  };

  const btn =
    'inline-flex min-h-[40px] items-center gap-1.5 border border-rule px-3 text-sm font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-5'}`} aria-label="Share this story">
      {canShare && (
        <button type="button" onClick={native} className={btn}>
          Share
        </button>
      )}
      <a className={btn} href={`https://wa.me/?text=${text}%20${enc}`} target="_blank" rel="noopener nofollow">
        WhatsApp
      </a>
      <a className={btn} href={`https://twitter.com/intent/tweet?text=${text}&url=${enc}`} target="_blank" rel="noopener nofollow">
        X
      </a>
      <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${enc}`} target="_blank" rel="noopener nofollow">
        Facebook
      </a>
      <button type="button" onClick={copy} className={btn} aria-live="polite">
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );
}
