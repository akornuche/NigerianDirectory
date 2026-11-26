import type { Metadata } from 'next';
import Link from 'next/link';
import MonthBlock from '@/components/news/MonthBlock';
import ArchiveMore from '@/components/news/ArchiveMore';
import AdBanner from '@/components/ads/AdBanner';
import NewsFinder from '@/components/news/NewsFinder';
import { newsApi } from '@/lib/news';

export const metadata: Metadata = {
  title: 'Nigeria news, day by day: the daily digest',
  description:
    'Up to 50 of the most reported Nigerian stories each day, summarised in our own words with links to every outlet that carried them. An archive from 1 September 2026.',
  alternates: { canonical: '/news/' },
};

export default async function NewsPage() {
  const [data, daysData] = await Promise.all([newsApi.months(undefined, 3), newsApi.days()]);
  const months = data?.months || [];

  return (
    <>
      {/* Head: a banner, so the first month starts above the fold */}
      <section className="shell grid grid-cols-1 gap-x-8 gap-y-6 pt-14 lg:grid-cols-12 lg:pt-20">
        <h1 className="text-[3.25rem] leading-[0.92] tracking-poster lg:col-span-7 lg:text-[6.5rem]">
          Nigeria, day by day
        </h1>
        <div className="lg:col-span-5 lg:self-end">
          <p className="text-xl leading-snug text-ink-2">
            Each day, up to 50 of the most reported Nigerian stories, summarised in our own words with
            links to every outlet that carried them.
          </p>
          <p className="mt-4">
            <a href="#how" className="btn-secondary min-h-0">How the digest is made</a>
          </p>
        </div>
      </section>

      {months.length > 0 && (
        <section aria-label="Find a story" className="shell mt-12 border-y border-rule py-8 lg:mt-16">
          <NewsFinder days={daysData?.days || []} />
        </section>
      )}

      <div className="shell pb-8">
        {months.length ? (
          <>
            {months.map((m) => (
              <MonthBlock key={m.month} month={m} />
            ))}
            <ArchiveMore next={data?.next || null} />
          </>
        ) : (
          <div className="field mt-16 p-8 lg:p-12">
            <p className="font-display text-4xl font-bold tracking-display lg:text-5xl">The first editions are in review</p>
            <p className="mt-4 max-w-2xl text-lg">
              The archive starts on 1 September 2026. Days appear here as soon as an editor has checked them.
            </p>
          </div>
        )}
      </div>

      <div className="shell flex justify-center py-12">
        <AdBanner slot="news-archive-leaderboard" size="leaderboard" />
        <AdBanner slot="news-archive-mobile" size="mobile-banner" />
      </div>

      {/* Method: what "top" means, and how summaries are written */}
      <section id="how" className="bg-paper-2 py-24 lg:py-32">
        <div className="shell grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-12">
          <h2 className="text-5xl lg:col-span-4 lg:text-[3.25rem]">How the digest is made</h2>
          <ol className="space-y-8 text-lg text-ink-2 lg:col-span-7 lg:col-start-6">
            <li>
              <p className="font-display text-2xl font-bold tracking-display text-ink">1. We read the day&apos;s coverage</p>
              <p className="mt-2">
                Stories published that day by Nigerian news outlets, including Premium Times, Daily Trust,
                BusinessDay, ThisDay, Leadership and Nairametrics.
              </p>
            </li>
            <li>
              <p className="font-display text-2xl font-bold tracking-display text-ink">2. We rank by how widely each story was reported</p>
              <p className="mt-2">
                Reports of the same event are grouped into one story. Stories carried by more outlets rank
                higher. A quiet day has fewer than 50 stories; we do not pad it.
              </p>
            </li>
            <li>
              <p className="font-display text-2xl font-bold tracking-display text-ink">3. We summarise in our own words</p>
              <p className="mt-2">
                Each summary gives the facts in three or four sentences, with short quotes where they help,
                and credits the outlets with links to their full reports. Claims are attributed to whoever
                made them.
              </p>
            </li>
            <li>
              <p className="font-display text-2xl font-bold tracking-display text-ink">4. An editor reviews every day</p>
              <p className="mt-2">
                Nothing is published until it has been checked. To report a mistake,{' '}
                <Link href="/contact/" className="link">contact the editors</Link>.
              </p>
            </li>
          </ol>
        </div>
      </section>
    </>
  );
}
