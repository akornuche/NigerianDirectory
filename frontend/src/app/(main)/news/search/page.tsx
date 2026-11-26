import type { Metadata } from 'next';
import Link from 'next/link';
import NewsFinder from '@/components/news/NewsFinder';
import { CATEGORY_LABELS, formatDay, newsApi, storyPath } from '@/lib/news';

// Search results are personal and endless: keep them out of search engines,
// but let crawlers follow the links to the day pages.
export const metadata: Metadata = {
  title: 'Search the news archive',
  robots: { index: false, follow: true },
  alternates: { canonical: '/news/search/' },
};

type SP = Promise<{ q?: string; category?: string; page?: string }>;

/** Wrap each search word in <mark>, without touching other text. */
function highlight(text: string, q: string) {
  const words = q.split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!words.length) return text;
  const re = new RegExp(`(${words.join('|')})`, 'gi');
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? <mark key={i} className="bg-primary-100 text-ink">{part}</mark> : part
  );
}

export default async function NewsSearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const category = sp.category && CATEGORY_LABELS[sp.category] ? sp.category : '';
  const page = Math.max(parseInt(sp.page || '1', 10) || 1, 1);
  const [daysData, data] = await Promise.all([
    newsApi.days(),
    q.length >= 2 ? newsApi.search(q, category || undefined, page) : Promise.resolve(null),
  ]);

  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams({ q, ...(category ? { category } : {}), page: String(page) });
    Object.entries(over).forEach(([k, v]) => (v === '' ? p.delete(k) : p.set(k, String(v))));
    if (p.get('page') === '1') p.delete('page');
    return `/news/search/?${p}`;
  };

  return (
    <div className="shell pb-24 pt-10 lg:pt-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/news/" className="hover:text-secondary-500">News</Link> / Search
      </nav>
      <h1 className="mt-6 text-[2.75rem] leading-[0.95] tracking-poster lg:text-[4.5rem]">Search the news archive</h1>

      <div className="mt-8">
        <NewsFinder days={daysData?.days || []} defaultQuery={q} />
      </div>

      {q.length >= 2 && (
        <>
          <div className="-mx-1 mt-10 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible" aria-label="Filter results by category">
            <Link
              href={qs({ category: '', page: 1 })}
              className={`inline-flex min-h-[40px] shrink-0 items-center px-3 text-sm font-medium ${!category ? 'bg-ink text-white' : 'border border-rule bg-white text-ink-2 hover:border-ink'}`}
            >
              All categories
            </Link>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={qs({ category: key, page: 1 })}
                className={`inline-flex min-h-[40px] shrink-0 items-center px-3 text-sm font-medium ${category === key ? 'bg-ink text-white' : 'border border-rule bg-white text-ink-2 hover:border-ink'}`}
              >
                {label}
              </Link>
            ))}
          </div>

          <p className="mt-8 text-ink-muted" role="status">
            {data ? `${data.total} ${data.total === 1 ? 'story' : 'stories'} for “${q}”${category ? ` in ${CATEGORY_LABELS[category]}` : ''}` : 'Search is unavailable right now. Please try again.'}
          </p>

          <ol className="mt-4">
            {data?.results.map((r) => (
              <li key={`${r.day}-${r.rank}`} className="border-t border-rule py-6">
                <p className="text-sm font-medium">
                  <span className="text-primary-700">{CATEGORY_LABELS[r.category] || r.category}</span>
                  <span className="text-ink-muted"> · {formatDay(r.day)}</span>
                </p>
                <h2 className="mt-1 text-xl leading-tight lg:text-2xl">
                  <Link href={storyPath(r.day, r.rank)} className="hover:text-primary-700">{highlight(r.headline, q)}</Link>
                </h2>
                <p className="mt-2 max-w-[68ch] text-[16px] leading-relaxed text-ink-2">
                  {highlight(r.summary.length > 280 ? `${r.summary.slice(0, 277)}…` : r.summary, q)}
                </p>
              </li>
            ))}
          </ol>

          {data && data.pages > 1 && (
            <nav aria-label="Result pages" className="mt-8 flex items-center justify-between gap-4 border-t border-rule pt-6">
              {page > 1 ? <Link href={qs({ page: page - 1 })} className="btn-secondary">← Newer</Link> : <span />}
              <span className="text-sm text-ink-muted">Page {page} of {data.pages}</span>
              {page < data.pages ? <Link href={qs({ page: page + 1 })} className="btn-secondary">Older →</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
