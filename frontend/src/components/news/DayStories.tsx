'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import AdBanner from '@/components/ads/AdBanner';
import ShareStory from './ShareStory';
import { CATEGORY_LABELS, storyPath, type NewsItem } from '@/lib/news';

/**
 * One day's stories: the top five set apart, then the rest as a numbered
 * list, with a category filter above. Everything is in the server HTML (the
 * filter starts on "All"), so crawlers and readers without JavaScript get
 * the whole day.
 */
export default function DayStories({ date, items }: { date: string; items: NewsItem[] }) {
  const [category, setCategory] = useState<string>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => { c[i.category] = (c[i.category] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = category === 'all' ? items : items.filter((i) => i.category === category);
  const top = category === 'all' ? filtered.slice(0, 5) : [];
  const rest = category === 'all' ? filtered.slice(5) : filtered;

  return (
    <>
      {/* Category filter: horizontal scroll on phones, wraps on wide screens */}
      <nav aria-label="Filter stories by category" className="sticky top-[72px] z-30 border-y border-rule bg-paper/95 backdrop-blur">
        <div className="shell">
          <ul className="-mx-1 flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
            {[['all', items.length] as [string, number], ...counts].map(([c, n]) => (
              <li key={c} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 px-3 text-sm font-medium transition-colors ${
                    category === c ? 'bg-ink text-white' : 'border border-rule bg-white text-ink-2 hover:border-ink'
                  }`}
                >
                  {c === 'all' ? 'All stories' : CATEGORY_LABELS[c] || c}
                  <span className={`tabular ${category === c ? 'text-white/70' : 'text-ink-muted'}`}>{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* The top five: the lead story large, the next four as cards */}
      {top.length > 0 && (
        <section aria-label="Top stories" className="shell mt-10 lg:mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">Top stories</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {top.map((item, idx) => (
              <article
                key={item.rank}
                id={`story-${item.rank}`}
                className={`scroll-mt-40 border border-rule bg-white p-6 lg:p-8 ${idx === 0 ? 'border-t-4 border-t-primary-700 lg:col-span-2' : ''}`}
              >
                <StoryBody date={date} item={item} lead={idx === 0} />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* The rest of the day */}
      <section aria-label={category === 'all' ? 'More stories' : `${CATEGORY_LABELS[category] || category} stories`} className="shell mt-12 lg:mt-16">
        {category === 'all' && rest.length > 0 && (
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">More stories</h2>
        )}
        <ol className="mt-2">
          {rest.map((item, idx) => (
            <Fragment key={item.rank}>
              <li
                id={`story-${item.rank}`}
                className="scroll-mt-40 grid grid-cols-[2.5rem_1fr] gap-x-3 border-t border-rule py-8 sm:grid-cols-[4rem_1fr] lg:grid-cols-12 lg:gap-x-8"
              >
                <span className="font-display text-3xl font-bold leading-none tracking-poster tabular text-ink-muted sm:text-4xl lg:col-span-1">
                  {item.rank}
                </span>
                <div className="min-w-0 lg:col-span-8">
                  <StoryBody date={date} item={item} />
                </div>
              </li>
              {category === 'all' && (idx === 4 || idx === 24) && rest.length > idx + 5 && (
                <li className="flex justify-center py-6" aria-hidden="true">
                  <AdBanner slot={idx === 4 ? 'news-day-infeed-1' : 'news-day-infeed-2'} size="rectangle" />
                </li>
              )}
            </Fragment>
          ))}
        </ol>
        {!filtered.length && <p className="py-10 text-ink-muted">No stories in this category today.</p>}
      </section>
    </>
  );
}

function StoryBody({ date, item, lead = false }: { date: string; item: NewsItem; lead?: boolean }) {
  const states = item.state_links || item.states.map((name) => ({ name, path: '' }));
  return (
    <>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
        {lead && <span className="bg-primary-700 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">Lead story</span>}
        <span className="text-primary-700">{CATEGORY_LABELS[item.category] || item.category}</span>
        {states.length > 0 && (
          <span className="text-ink-muted">
            {'· '}
            {states.map((st, i) => (
              <Fragment key={st.name}>
                {i > 0 && ', '}
                {st.path ? (
                  <Link href={st.path} title={`Universities in ${st.name}`} className="hover:text-secondary-500 hover:underline">{st.name}</Link>
                ) : st.name}
              </Fragment>
            ))}
          </span>
        )}
      </p>
      <h3 className={`mt-2 leading-tight ${lead ? 'text-3xl lg:text-[2.6rem]' : 'text-2xl lg:text-[1.75rem]'}`}>
        <a href={`#story-${item.rank}`} className="hover:text-primary-700">{item.headline}</a>
      </h3>
      <p className={`mt-3 max-w-[68ch] leading-relaxed text-ink-2 ${lead ? 'text-lg' : 'text-[17px]'}`}>{item.summary}</p>

      {item.links && item.links.length > 0 && (
        <p className="mt-4 text-[15px] text-ink-muted">
          In the directory:{' '}
          {item.links.map((l, i) => (
            <Fragment key={l.path}>
              {i > 0 && ' · '}
              <Link href={l.path} className="font-medium text-primary-700 underline decoration-1 underline-offset-4 hover:text-secondary-500">
                {l.name}
              </Link>
            </Fragment>
          ))}
        </p>
      )}

      {/* Sources: always shown the same way, each a link to the full report */}
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Full reports{item.sources.length > 1 ? ` from ${item.sources.length} outlets` : ''}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {item.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-[40px] items-center gap-1.5 bg-paper-2 px-3 text-sm font-medium text-ink underline-offset-4 hover:underline"
              >
                {s.name}
                <span aria-hidden="true">↗</span>
                <span className="sr-only">(opens the full report)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <ShareStory path={storyPath(date, item.rank)} title={item.headline} />
    </>
  );
}
