import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DayCard from '@/components/news/DayCard';
import { formatMonth, monthPath, newsApi } from '@/lib/news';

type Params = Promise<{ year: string; month: string }>;

const ymOf = (p: { year: string; month: string }) =>
  /^\d{4}$/.test(p.year) && /^\d{2}$/.test(p.month) ? `${p.year}-${p.month}` : null;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const ym = ymOf(await params);
  if (!ym) return {};
  const name = formatMonth(ym);
  return {
    title: `Nigeria news, ${name}`,
    description: `Every daily digest of Nigerian news for ${name}: the most reported stories of each day, summarised with links to the full reports.`,
    alternates: { canonical: monthPath(ym) },
  };
}

export default async function NewsMonthPage({ params }: { params: Params }) {
  const ym = ymOf(await params);
  if (!ym) notFound();
  const data = await newsApi.month(ym);
  if (!data) notFound();
  const stories = data.days.reduce((n, d) => n + d.story_count, 0);

  return (
    <div className="shell pb-24 pt-10 lg:pt-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/news/" className="hover:text-secondary-500">News</Link> / {formatMonth(ym)}
      </nav>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
        <h1 className="text-[3.25rem] leading-[0.92] tracking-poster lg:text-[6rem]">{formatMonth(ym)}</h1>
        <p className="text-lg text-ink-muted">
          {data.days.length} days · {stories.toLocaleString('en-NG')} stories
        </p>
      </div>
      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {data.days.map((d) => (
          <li key={d.day}>
            <DayCard day={d} />
          </li>
        ))}
      </ul>
      <div className="mt-16 flex flex-wrap justify-between gap-6">
        {data.newer ? (
          <Link href={monthPath(data.newer)} className="btn-secondary">← {formatMonth(data.newer)}</Link>
        ) : <span />}
        {data.older && (
          <Link href={monthPath(data.older)} className="btn-secondary">{formatMonth(data.older)} →</Link>
        )}
      </div>
    </div>
  );
}
