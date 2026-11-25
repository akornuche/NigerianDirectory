import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import AdBanner from '@/components/ads/AdBanner';
import { CATEGORY_LABELS, dayPath, formatDay, formatMonth, formatShortDay, monthPath, newsApi } from '@/lib/news';

type Params = Promise<{ year: string; month: string; day: string }>;

const dateOf = (p: { year: string; month: string; day: string }) =>
  /^\d{4}$/.test(p.year) && /^\d{2}$/.test(p.month) && /^\d{2}$/.test(p.day) ? `${p.year}-${p.month}-${p.day}` : null;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const date = dateOf(await params);
  const data = date ? await newsApi.day(date) : null;
  if (!date || !data) return {};
  const top = data.items.slice(0, 3).map((i) => i.headline).join('; ');
  return {
    title: `Nigeria news, ${formatDay(date)}`,
    description: `The ${data.items.length} most reported Nigerian stories of ${formatDay(date)}: ${top}.`.slice(0, 300),
    alternates: { canonical: dayPath(date) },
  };
}

export default async function NewsDayPage({ params }: { params: Params }) {
  const date = dateOf(await params);
  if (!date) notFound();
  const data = await newsApi.day(date);
  if (!data) notFound();

  const counts = data.items.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});
  const ym = date.slice(0, 7);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Nigeria news, ${formatDay(date)}`,
    url: `${SITE}${dayPath(date)}`,
    datePublished: data.published_at || undefined,
    isPartOf: { '@type': 'WebSite', name: 'Nigerian Directory', url: SITE },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: data.items.length,
      itemListElement: data.items.map((i) => ({
        '@type': 'ListItem',
        position: i.rank,
        name: i.headline,
        url: i.sources[0]?.url,
      })),
    },
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="shell pt-10 lg:pt-14">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
          <Link href="/news/" className="hover:text-secondary-500">News</Link> /{' '}
          <Link href={monthPath(ym)} className="hover:text-secondary-500">{formatMonth(ym)}</Link> / {formatShortDay(date)}
        </nav>
        <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-12">
          <h1 className="text-[3rem] leading-[0.92] tracking-poster lg:col-span-8 lg:text-[5.5rem]">{formatDay(date)}</h1>
          <div className="lg:col-span-4 lg:self-end">
            <p className="font-display text-7xl font-bold leading-none tracking-poster tabular text-primary-700">
              {data.items.length}
            </p>
            <p className="mt-2 font-medium">most reported stories</p>
          </div>
        </div>
        {data.lead && (
          <p className="mt-12 max-w-4xl text-xl leading-snug text-ink-2 lg:text-[1.75rem]">{data.lead}</p>
        )}
        <p className="mt-8 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-muted">
          {Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([c, n]) => (
              <span key={c}>
                {CATEGORY_LABELS[c] || c} <span className="tabular text-ink">{n}</span>
              </span>
            ))}
        </p>
      </header>

      <ol className="shell mt-12 lg:mt-16">
        {data.items.map((item, idx) => (
          <Fragment key={item.rank}>
            <li id={`story-${item.rank}`} className="grid grid-cols-[3rem_1fr] gap-x-4 border-t border-rule py-8 sm:grid-cols-[5rem_1fr] lg:grid-cols-12 lg:gap-x-8">
              <span className="font-display text-4xl font-bold leading-none tracking-poster tabular text-ink-muted sm:text-5xl lg:col-span-1">
                {item.rank}
              </span>
              <div className="lg:col-span-8">
                <p className="text-sm font-medium text-primary-700">
                  {CATEGORY_LABELS[item.category] || item.category}
                  {item.states.length > 0 && <span className="text-ink-muted"> · {item.states.join(', ')}</span>}
                </p>
                <h2 className="mt-2 text-2xl leading-tight lg:text-[1.9rem]">{item.headline}</h2>
                <p className="mt-3 text-[17px] text-ink-2">{item.summary}</p>
                <p className="mt-4 text-[15px] text-ink-muted">
                  Reported by{' '}
                  {item.sources.map((s, i) => (
                    <Fragment key={s.url}>
                      {i > 0 && ' · '}
                      <a href={s.url} target="_blank" rel="noopener" className="font-medium text-ink underline decoration-1 underline-offset-4 hover:text-secondary-500">
                        {s.name}
                      </a>
                    </Fragment>
                  ))}
                </p>
              </div>
            </li>
            {(idx === 9 || idx === 29) && data.items.length > idx + 5 && (
              <li className="flex justify-center py-6" aria-hidden="true">
                <AdBanner slot={idx === 9 ? 'news-day-infeed-1' : 'news-day-infeed-2'} size="rectangle" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>

      <nav className="shell flex flex-wrap justify-between gap-6 border-t border-rule py-12 pb-24" aria-label="Other days">
        {data.newer ? (
          <Link href={dayPath(data.newer)} className="btn-secondary">← {formatDay(data.newer)}</Link>
        ) : <span />}
        {data.older && (
          <Link href={dayPath(data.older)} className="btn-secondary">{formatDay(data.older)} →</Link>
        )}
      </nav>
    </article>
  );
}
