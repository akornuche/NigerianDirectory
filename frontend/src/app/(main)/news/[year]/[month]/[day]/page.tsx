import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DayStories from '@/components/news/DayStories';
import ShareStory from '@/components/news/ShareStory';
import { CATEGORY_LABELS, dayPath, formatDay, formatMonth, formatShortDay, monthPath, newsApi, storyPath } from '@/lib/news';

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

  const ym = date.slice(0, 7);
  const leadParas = (data.lead || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

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
        url: `${SITE}${storyPath(date, i.rank)}`,
        item: {
          '@type': 'NewsArticle',
          '@id': `${SITE}${storyPath(date, i.rank)}`,
          headline: i.headline.slice(0, 110),
          description: i.summary.length > 300 ? `${i.summary.slice(0, 297)}...` : i.summary,
          articleSection: CATEGORY_LABELS[i.category] || i.category,
          // The news day itself (evening, Lagos time), not the date an editor
          // approved the digest, which can be weeks later for the archive.
          datePublished: `${date}T20:00:00+01:00`,
          dateModified: data.published_at || `${date}T20:00:00+01:00`,
          inLanguage: 'en-NG',
          url: `${SITE}${storyPath(date, i.rank)}`,
          mainEntityOfPage: `${SITE}${dayPath(date)}`,
          ...(i.states.length ? { contentLocation: i.states.map((st) => ({ '@type': 'Place', name: `${st}, Nigeria` })) } : {}),
          author: { '@type': 'Organization', name: 'Nigerian Directory', url: SITE },
          publisher: {
            '@type': 'Organization',
            name: 'Nigerian Directory',
            url: SITE,
            logo: { '@type': 'ImageObject', url: `${SITE}/naijadir-mark.png` },
          },
          isBasedOn: i.sources.map((src) => src.url),
          citation: i.sources.map((src) => ({ '@type': 'CreativeWork', name: src.name, url: src.url })),
        },
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
        {/* The lead: a short standfirst, then "the day in brief" paragraphs. */}
        {leadParas.length > 0 && (
          <div className="mt-12 max-w-4xl">
            <p className="text-xl leading-snug text-ink-2 lg:text-[1.75rem]">{leadParas[0]}</p>
            {leadParas.slice(1).map((para, i) => (
              <p key={i} className="mt-5 max-w-[68ch] text-[17px] leading-relaxed text-ink-2 lg:text-lg">{para}</p>
            ))}
          </div>
        )}
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Share this day</p>
          <ShareStory path={dayPath(date)} title={`Nigeria news, ${formatDay(date)}: the ${data.items.length} most reported stories`} compact />
        </div>
      </header>

      <DayStories date={date} items={data.items} />

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
